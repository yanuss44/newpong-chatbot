import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// AI 모델 순위 (다양한 명칭 시도 - 사용자의 최신 환경 반영)
const MASTER_MODELS = [
    { name: "gemini-3-flash-preview", version: "v1beta" },
    { name: "gemini-3-flash", version: "v1beta" },
    { name: "gemini-1.5-flash", version: "v1beta" },
    { name: "gemini-pro", version: "v1" }
];
let currentModelIndex = 0;

console.log(`🔑 사용 중인 API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-5)}`);

// React 프론트엔드 통신 API
app.post('/api/chat', async (req, res) => {
    const { message, language, context } = req.body;
    let fallbackCount = 0;

    const tryGenerateFetch = async () => {
        try {
            const modelObj = MASTER_MODELS[currentModelIndex];
            const modelName = modelObj.name;
            const apiVersion = modelObj.version;
            
            console.log(`[Chat Request] Direct Fetch (${apiVersion}) Trying: ${modelName}`);
            
            const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;

            const systemContent = `당신은 10년 차 의료기기 전문 CS 진단 AI이며, NEWPONG의 제품(NP-110, NP-200) 매뉴얼을 숙지하고 있습니다. 

[제공된 매뉴얼 지식 베이스]:
${masterManualData}

[진단 전 필수 규칙]:
1. 모델명 확인: 질문에 NP-110 또는 NP-200이 없다면 반드시 어떤 모델인지 먼저 물어보세요.
2. 언어 준수: 사용자가 한국어로 질문하면 반드시 모든 답변을 한국어로, 영어로 질문하면 반드시 영어로만 답변하세요. (언어 섞기 금지)
3. 형식 준수: 무조건 순수 JSON 포맷으로만 응답할 것. {} 괄호로 시작하는 객체만 반환하라.

{
  "symptom": "요약",
  "cause": "원인",
  "steps": ["해결 단계 1", "해결 단계 2"]
}`;

            const payload = {
                contents: [{
                    parts: [{ text: systemContent + "\n\n[사용자 메시지]\n" + message + "\n\n[과거 맥락]\n" + (context || "없음") }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`❌ API Error for ${modelName}:`, JSON.stringify(errorData));
                throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown'}`);
            }

            const data = await response.json();
            let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            
            if(responseText.startsWith('```json')) {
                responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            let status = 'diagnosing';
            const lowerRes = responseText.toLowerCase();
            if ((lowerRes.includes("np-110") || lowerRes.includes("np-200")) && (lowerRes.includes("?") || lowerRes.includes("어떤"))) status = 'clarifying';
            else if (lowerRes.includes("매뉴얼에 없")) status = 'unresolved';

            let structuredData = null;
            try { structuredData = JSON.parse(responseText); } catch (e) {}

            res.json({ language, text: responseText, status, structured: structuredData });

        } catch (error) {
            console.error(`❌ 모델 ${MASTER_MODELS[currentModelIndex].name} 실패:`, error.message);
            
            if (fallbackCount < MASTER_MODELS.length - 1) {
                fallbackCount++;
                currentModelIndex++;
                console.log(`🔄 자동 장애 조치: ${MASTER_MODELS[currentModelIndex].name}`);
                return tryGenerateFetch();
            }
            res.status(500).json({ error: "모든 AI 모델 호출에 실패했습니다." });
        }
    };

    await tryGenerateFetch();
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
    console.log(`✨ 백엔드 AI 서버가 ${PORT} 포트에서 시작되었습니다 (Fetch 방식 전환).`);
});
