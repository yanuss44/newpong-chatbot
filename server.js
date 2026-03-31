import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ No Gemini API key found in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// 모델 세팅 (Gemini 최신 2.5 릴리스 권장)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
      responseMimeType: "application/json",
  },
  systemInstruction: "당신은 10년 차 의료기기 전문 고객지원(CS) 진단 AI이며, NEWPONG의 제품인 NP-110(Lincurve Pro) 및 NP-200(LSSA) 매뉴얼을 완벽히 숙지하고 있습니다. \n\n[진단 전 필수 규칙]: 사용자의 질문에 제품 모델명(NP-110 또는 NP-200)이 포함되어 있지 않다면, 진단을 수행하기 전에 반드시 사용자에게 어느 모델을 사용 중인지 질문해야 합니다. 질문은 반드시 사용자가 질문한 언어와 동일한 언어로 하세요. 모델이 확인된 경우에만 매뉴얼에 기반한 해결 단계를 제공하세요. 매뉴얼에 없는 내용을 지어내지 마세요."
});

let uploadedFiles = [];

// 서버 켜질 때 PDF 매뉴얼 자동 업로드(캐싱)
async function uploadManuals() {
    console.log("[Setup] 🚀 매뉴얼 문서들을 Gemini API 서버로 업로드 및 분석 준비 중...");
    const manualsDir = path.join(__dirname, 'manuals');
    
    if (!fs.existsSync(manualsDir)) {
        console.warn("⚠️ [Setup] manuals/ 디렉토리를 찾을 수 없습니다.");
        return;
    }

    const files = fs.readdirSync(manualsDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt') || f.endsWith('.docx'));
    
    if (files.length === 0) {
        console.warn("⚠️ [Setup] manuals/ 폴더 내에 업로드할 로컬 파일이 없습니다.");
        return;
    }

    for (const file of files) {
        try {
            const filePath = path.join(manualsDir, file);
            let mimeType = 'application/pdf';
            if (file.endsWith('.txt')) mimeType = 'text/plain';
            
            console.log(`📤 문서 업로드 진행 중: ${file}...`);
            const uploadResponse = await fileManager.uploadFile(filePath, {
                mimeType,
                displayName: file,
            });
            console.log(`✅ 성공적으로 업로드 완료됨: ${uploadResponse.file.displayName} (URI: ${uploadResponse.file.uri})`);
            
            uploadedFiles.push({
                fileData: {
                    mimeType: uploadResponse.file.mimeType,
                    fileUri: uploadResponse.file.uri
                }
            });
        } catch (error) {
            console.error(`❌ 파일 업로드 에러 (${file}):`, error);
        }
    }
    console.log(`[Setup] 🎉 총 ${uploadedFiles.length}개의 매뉴얼 문서가 Gemini RAG 시스템에 장착되었습니다.`);
}

// React 프론트엔드 통신 API
app.post('/api/chat', async (req, res) => {
    try {
        const { message, language, context } = req.body;
        console.log(`[Chat Request] Language: ${language}, Message: "${message}"`);
        
        // 언어별 강력 통제 프롬프트
        const langDirective = language === 'ko' 
            ? "[언어 제어]: 무조건 한국어로만 작성할 것." 
            : "CRITICAL: The user's message is in English (or another foreign language). YOU MUST DETECT THE USER'S LANGUAGE AND OUTPUT ALL JSON VALUES ENTIRELY IN THAT EXACT LANGUAGE. If the user used English, the entire output MUST BE 100% ENGLISH. NO KOREAN ALLOWED.";

        // 프롬프트 및 문서 전달
        const chatPrompt = [
            ...uploadedFiles,
            { text: `[과거 대화 문맥 참조]
${context || '없음'}

위의 대화 흐름을 바탕으로, 다음 사용자의 마지막 메시지에 대해 매뉴얼 기반 트러블슈팅을 진행하라. 
${langDirective}
[가장 중요한 규칙]: 무조건 아래의 순수 JSON 포맷으로만 응답할 것. 마크다운 따옴표(\`\`\`json) 등 그 어떤 추가 텍스트도 붙이지 말고 순수 {} 괄호로 시작하는 객체만 반환하라.

{
  "symptom": "(Translated to user's language) 요약",
  "cause": "(Translated to user's language) 발생 원인",
  "steps": [
    "(Translated to user's language) 해결 단계 1",
    "(Translated to user's language) 해결 단계 2"
  ]
}

사용자 현재 메시지: "${message}"` }
        ];

        const result = await model.generateContent(chatPrompt);
        let responseText = result.response.text();
        if(responseText.startsWith('\`\`\`json')) {
            responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        }
        
        let status = 'diagnosing'; 
        const lowerRes = responseText.toLowerCase();

        // 모델 확인 질문이 포함되어 있는지 감지 (NP-110, NP-200 모두 언급하며 질문하는 경우)
        const isAskingModel = (lowerRes.includes("np-110") || lowerRes.includes("np-200")) && 
                              (lowerRes.includes("?") || lowerRes.includes("어떤") || lowerRes.includes("which") || lowerRes.includes("model"));

        if (isAskingModel) {
            status = 'clarifying';
        } else if (lowerRes.includes("매뉴얼에 없") || lowerRes.includes("해결할 수 없") || lowerRes.includes("cannot find") || lowerRes.includes("not mentioned")) {
            status = 'unresolved';
        }
        
        let structuredData = null;
        try {
            structuredData = JSON.parse(responseText);
        } catch (e) {
            console.error("JSON parse error:", e);
        }

        res.json({
            language,
            text: responseText,
            status,
            structured: structuredData
        });
    } catch (error) {
        console.error("API error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// React 프론트엔드(dist) 정적 호스팅 연동
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`✨ 백엔드 AI 서버가 ${PORT} 포트에서 시작되었습니다.`);
    await uploadManuals();
});
