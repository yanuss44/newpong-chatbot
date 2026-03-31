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

            const systemContent = `당신은 10년 차 의료기기 전문 CS 진단 AI이며, NEWPONG의 제품(NP-110, NP-200) 매뉴얼 및 과거 해결 사례를 숙지하고 있습니다. 
            
            [미션]: 사용자의 증상에 대해 매뉴얼과 과거 경험을 근거로 정확한 원인과 해결 단계를 제시하라.
            [언어 설정]: 반드시 ${language === 'ko' ? '한국어(Korean)' : '영어(English)'}로만 답변하십시오. 
            
            [제공된 매뉴얼 데이터 기반 지식]:
            ${masterManualData}
            
            [학습된 과거 성공 사례 (Case-Based Reasoning)]:
            ${casesText}

            [진단 필수 규칙]:
            1. 모델명 확인: 질문에 NP-110 또는 NP-200이 없다면 반드시 어떤 모델인지 먼저 물어볼 것.
            2. 형식 준수: 무조건 순수 JSON 포맷으로만 응답할 것. { } 괄호로 시작하고 끝나는 유효한 JSON 객체만 반환하라. 백틱(\`\`\`json)은 포함하지 마라.
            3. 추가 점검: 사용자가 "추가 점검"이나 "더 있나요?"라고 물을 때, 과거 대화 맥락을 확인하여 이미 제시한 방법 외에 더 이상 새로운 점검 사항이 없다면 아래와 같이 "no_more_checks"를 true로 반환하라.

            [해결책이 더 이상 없을 때의 JSON 구조]:
            {
              "no_more_checks": true,
              "symptom": "증상 요약",
              "cause": "추정 원인(최종)",
              "message": "추가적인 점검사항이 확인되지 않습니다. C/S접수를 진행해 주세요",
              "steps": []
            }

            [해결책이 있을 때의 JSON 구조]:
            {
              "no_more_checks": false,
              "symptom": "증상 요약",
              "cause": "추정 원인",
              "steps": ["새로운 단계 1", "새로운 단계 2", "..."]
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
