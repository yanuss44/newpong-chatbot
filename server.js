import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(apiKey);

const MASTER_MODELS = [
    "gemini-2.0-flash", "gemini-2.5-flash", "gemini-pro", "gemini-1.5-flash", "gemini-1.0-pro"
];

// 매뉴얼 미리 로드 (manuals 폴더 내의 4개 파일 통합 활용)
// Gemini 2.0 Flash: 1,048,576 토큰 컨텍스트 → 전체 매뉴얼(~130K chars ≈ 33K tokens) 완전 전달 가능
const MANUALS_DIR = path.join(__dirname, 'manuals');

function loadManual(filename) {
    const filepath = path.join(MANUALS_DIR, filename);
    if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf-8');
        console.log(`✅ 매뉴얼 로드: ${filename} (${content.length.toLocaleString()}자)`);
        return content;
    }
    console.warn(`⚠️ 매뉴얼 파일 없음: ${filename}`);
    return "";
}

const MANUALS = {
    "NP-110": loadManual('Lincurve pro_NP-110 Service manual.txt')
            + loadManual('Lincurve pro_NP-110 User manual.txt'),
    "NP-200": loadManual('LSSA_NP-200 Service manual.txt')
            + loadManual('LSSA_NP-200 User manual.txt'),
};

// 로드 결과 요약 출력
Object.entries(MANUALS).forEach(([model, content]) => {
    console.log(`📚 ${model} 매뉴얼 총 ${content.length.toLocaleString()}자 로드 완료`);
});

const CASES_FILE = path.join(__dirname, 'resolved_cases.json');
function loadResolvedCases() {
    try { if (fs.existsSync(CASES_FILE)) return JSON.parse(fs.readFileSync(CASES_FILE, 'utf-8')); } catch (e) { }
    return [];
}

app.post('/api/save-case', (req, res) => {
    const { question, answer, language, model } = req.body;
    if (!question || !answer) return res.status(400).json({ error: "Invalid data" });
    const cases = loadResolvedCases();
    cases.push({
        question, answer, language, model: model || "Unknown",
        timestamp: new Date().toISOString(), isAutoSaved: !!req.body.isAutoSaved
    });
    fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2));
    res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
    const { message, language, context } = req.body;
    let localModelIndex = 0;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const tryGenerate = async () => {
        try {
            const modelName = MASTER_MODELS[localModelIndex];
            if (!modelName) throw new Error("No more models");

            const queryAndHistory = (message + (context || "")).toUpperCase();
            const currentModel = queryAndHistory.includes("110") ? "NP-110" : queryAndHistory.includes("200") ? "NP-200" : null;

            if (!currentModel) {
                const askMsgs = {
                    ko: "모델명(NP-110 혹은 NP-200)을 알려주세요.",
                    en: "Please specify your device model (NP-110 or NP-200).",
                    ja: "機器のモデル名（NP-110またはNP-200）を教えてください。",
                    'pt-BR': "Por favor, informe o modelo do dispositivo (NP-110 ou NP-200).",
                    es: "Por favor, indique el modelo de su dispositivo (NP-110 o NP-200)."
                };
                const askMsg = askMsgs[language] || askMsgs.en;
                console.log(`⚠️ 모델 미감지 - 언어: ${language}, 메시지: ${message.substring(0, 50)}`);
                res.write(`data: ${JSON.stringify({ text: askMsg, needs_model: true })}\n\n`);
                return res.end();
            }

            // [캐시 체크]
            const cases = loadResolvedCases();
            const cached = cases.find(c => c.question.trim() === message.trim() && c.model === currentModel);
            if (cached) {
                res.write(`data: ${JSON.stringify({ text: cached.answer })}\n\n`);
                return res.end();
            }

            // [AI 호출 - SDK 사용]
            const manual = MANUALS[currentModel];
            if (!manual || manual.trim().length === 0) {
                console.warn(`⚠️ ${currentModel} 매뉴얼 데이터 없음. manuals/ 폴더를 확인하세요.`);
            }

            const LANGUAGE_NAMES = {
                ko: 'Korean (한국어)',
                en: 'English',
                ja: 'Japanese (日本語)',
                'pt-BR': 'Brazilian Portuguese (Português)',
                es: 'Spanish (Español)'
            };
            const responseLang = LANGUAGE_NAMES[language] || 'English';

            const systemPrompt = `You are a specialized CS diagnostic assistant for ${currentModel} medical devices.
You MUST respond ONLY in ${responseLang}. Do not use any other language in your response.

[Required Output Format - JSON only]
1. If the user only said a model number like "110" or "200", find the symptom from the conversation Context immediately.
2. Output troubleshooting steps as: "steps": ["step1", "step2", ...] — all steps written in ${responseLang}.
3. The "message" field must contain a brief summary like "${currentModel} solution found." written in ${responseLang}.
4. Prefer the "message" key over "model_confirmed" or "status" for all guidance text.
5. If no solution exists in the manual, set "no_more_checks": true in your JSON response.

Manual Data: ${manual}`;

            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                ]
            });
            const result = await model.generateContent(`SYSTEM: ${systemPrompt}\n\nCONTEXT:\n${context || ""}\n\nUSER: ${message}`);
            const responseTxt = await result.response.text();

            if (responseTxt && responseTxt.trim()) {
                const cleanTxt = responseTxt.replace(/```json/g, '').replace(/```/g, '').trim();
                res.write(`data: ${JSON.stringify({ text: cleanTxt })}\n\n`);
            } else {
                const emptyMsgs = {
                    ko: "죄송합니다. 답변을 생성하지 못했습니다. 질문을 더 구체적으로 작성해 주세요.",
                    en: "Sorry, I could not generate a response. Please describe your issue in more detail.",
                    ja: "申し訳ありません。回答を生成できませんでした。もう少し詳しく説明してください。",
                    'pt-BR': "Desculpe, não foi possível gerar uma resposta. Descreva o problema com mais detalhes.",
                    es: "Lo siento, no pude generar una respuesta. Por favor describa el problema con más detalle."
                };
                res.write(`data: ${JSON.stringify({ text: emptyMsgs[language] || emptyMsgs.en, finished: true })}\n\n`);
            }
            res.end();

        } catch (error) {
            console.error(`❌ 모델 ${MASTER_MODELS[localModelIndex]} 오류:`, error.message);
            if (localModelIndex < MASTER_MODELS.length - 1) {
                localModelIndex++;
                return tryGenerate();
            }
            const retryMsgs = {
                ko: "응답 지연 중입니다. 잠시 후 시도해 주세요.",
                en: "Response delayed. Please try again in a moment.",
                ja: "応答が遅延しています。しばらくしてからお試しください。",
                'pt-BR': "Resposta atrasada. Por favor, tente novamente em breve.",
                es: "Respuesta demorada. Por favor, inténtelo de nuevo en un momento."
            };
            res.write(`data: ${JSON.stringify({ error: retryMsgs[language] || retryMsgs.en })}\n\n`);
            res.end();
        }
    };

    await tryGenerate();
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Not Found');
});

app.listen(process.env.PORT || 3000, () => console.log('✨ Chatbot Engine Stabilized'));
