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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ Warning: No GEMINI_API_KEY found. AI chat will not work until set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// 1. 매뉴얼 텍스트 데이터 로드 (RAG 지식 베이스 구축)
function loadManualsText() {
    let combinedText = "";
    const manualFiles = [
        'NP-110 Service manual.txt',
        'NP-200 Service manual.txt'
    ];

    manualFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`📖 매뉴얼 로딩: ${file}`);
            combinedText += `\n--- MANUAL: ${file} ---\n` + fs.readFileSync(filePath, 'utf-8') + "\n";
        }
    });
    return combinedText;
}

const masterManualData = loadManualsText();

// 2. 학습된 성공 사례 로드 (경험 기반 지식)
const CASES_FILE = path.join(__dirname, 'resolved_cases.json');
function loadResolvedCases() {
    try {
        if (fs.existsSync(CASES_FILE)) {
            return JSON.parse(fs.readFileSync(CASES_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error("사례 로딩 실패:", e);
    }
    return [];
}

// AI 모델 순위
const MASTER_MODELS = [
    "gemini-3-flash-preview",
    "gemini-3-flash",
    "gemini-1.5-flash",
    "gemini-pro"
];

// 성공 사례 저장 API
app.post('/api/save-case', (req, res) => {
    const { question, answer, language, resolved_steps } = req.body;
    if (!question || !answer) return res.status(400).json({ error: "Invalid data" });

    const cases = loadResolvedCases();
    // 중복 방지 (간단한 질문 매칭)
    const exists = cases.find(c => c.question.trim() === question.trim());
    if (!exists) {
        cases.push({ 
            question, 
            answer, 
            language, 
            resolved_steps: resolved_steps || [], // 어떤 단계로 해결됐는지 저장
            timestamp: new Date().toISOString() 
        });
        fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2));
        console.log("✅ 새로운 성공 사례 학습 완료 (조치 사항 포함):", question.substring(0, 20) + "...");
    }
    res.json({ success: true });
});

// React 프론트엔드 통신 API (Streaming & Learning 지원)
app.post('/api/chat', async (req, res) => {
    const { message, language, context } = req.body;
    let localModelIndex = 0;

    // SSE Header 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 🧠 시만틱 캐싱 (동일 질문 즉시 반환)
    const cases = loadResolvedCases();
    const cachedMatch = cases.find(c => c.question.trim() === message.trim() && c.language === language);
    
    if (cachedMatch) {
        console.log(`🚀 [Cache Hit] 동일 질문 발견: ${message}`);
        res.write(`data: ${JSON.stringify({ text: cachedMatch.answer })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        return res.end();
    }

    const tryStreamGenerate = async () => {
        try {
            const modelName = MASTER_MODELS[localModelIndex];
            if (!modelName) throw new Error("No more models to try");

            console.log(`[Stream Request] Trying: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // 매번 최신 사례를 불러와서 프롬프트에 주입
            const currentCases = loadResolvedCases();
            const casesText = currentCases.length > 0 
                ? currentCases.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
                : "아직 학습된 사례가 없습니다.";

            const langMap = {
                'ko': '한국어(Korean)',
                'en': '영어(English)',
                'ja': '일본어(Japanese)',
                'pt-BR': '포르투갈어(Portuguese)',
                'es': '스페인어(Spanish)'
            };
            const targetLangLabel = langMap[language] || '영어(English)';

            const systemContent = `당신은 10년 차 의료기기 전문 CS 진단 AI이며, NEWPONG의 제품(NP-110, NP-200) 매뉴얼 및 해결 사례를 숙지하고 있습니다. 
            
            [미션]: 사용자의 증상에 대해 매뉴얼과 과거 경험을 근거로 정확한 원인과 조치 단계를 제시하라.
            [언어 설정]: 반드시 ${targetLangLabel}로만 답변하십시오. 질문자가 사용하는 언어와 동일한 언어를 사용해야 합니다.
            
            [제공된 매뉴얼 데이터 기반 지식]:
            ${masterManualData}
            
            [학습된 과거 성공 사례]:
            ${casesText}

            [진단 규칙]:
            1. 모델 미지정 시: 질문에 NP-110 또는 NP-200 모델명이 없다면, 진단을 보류하고 모델명을 먼저 물어볼 것. 
            2. 형식: 무조건 순수 JSON만 반환하라.
            3. 메시지 필드: 모든 응답에는 사용자에게 건네는 부드러운 설명인 "message" 필드를 반드시 포함하라.

            [모델명을 물어볼 때의 JSON 예시]:
            {
              "no_more_checks": false,
              "symptom": "모델 확인 필요",
              "cause": "정보 부족",
              "message": "진단을 시작하기 위해 사용 중이신 제품이 NP-110인가요, 아니면 NP-200인가요?",
              "steps": []
            }

            [해결책이 있을 때의 JSON 구조]:
            {
              "no_more_checks": false,
              "symptom": "증상 요약",
              "cause": "추정 원인",
              "message": "해당 증상에 대해 매뉴얼을 기반으로 아래와 같은 점검을 권장합니다.",
              "steps": ["단계 1", "단계 2", "..."]
            }

            [해결책이 더 이상 없을 때의 JSON 구조]:
            {
              "no_more_checks": true,
              "symptom": "점검 한계",
              "cause": "매뉴얼 외 사항",
              "message": "준비된 모든 자가 점검을 마쳤으나 해결되지 않았습니다. 제조사 서비스 접수가 필요합니다.",
              "steps": []
            }`;

            const fullPrompt = `${systemContent}\n\n[사용자 메시지]\n${message}\n\n[과거 대화 맥락]\n${context || '없음'}`;

            const result = await model.generateContentStream(fullPrompt);

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }

            res.write(`data: [DONE]\n\n`);
            res.end();

        } catch (error) {
            console.error(`❌ 모델 ${MASTER_MODELS[localModelIndex]} 실패:`, error.message);
            
            if (localModelIndex < MASTER_MODELS.length - 1) {
                localModelIndex++;
                console.log(`🔄 자동 장애 조치(재시도): ${MASTER_MODELS[localModelIndex]}`);
                return tryStreamGenerate();
            }
            
            res.write(`data: ${JSON.stringify({ error: "모든 AI 모델 호출에 실패했습니다." })}\n\n`);
            res.end();
        }
    };

    await tryStreamGenerate();
});

// React 프론트엔드 정적 호스팅
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res, next) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not Found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✨ 백엔드 AI 서버가 ${PORT} 포트에서 시작되었습니다 (지속적 학습 엔진 활성화).`);
});
