// 실제 RAG 통합 AI 서비스 (Express 서버 대상)
export const analyzeSymptom = async (userText, language = 'en', history = []) => {
  try {
    // 1. History formatting (대화 문맥 파악용)
    const contextStr = history.map(msg => `${msg.sender === 'user' ? '사용자' : 'AI'}: ${msg.structured ? msg.structured.symptom : msg.text}`).join('\n');

    // 2. Fetch from Express Backend API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userText, language, context: contextStr })
    });

    if (!response.ok) {
      throw new Error(`API 통신 에러: ${response.status}`);
    }

    const data = await response.json();

    let structured = null;
    try {
      // 정규식 등으로 백틱 오염이 남아있을 경우 한 번 더 클린 처리
      let pureJson = data.text.trim();
      if(pureJson.startsWith('```json')) pureJson = pureJson.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(pureJson);
      if (parsed && parsed.steps) {
        structured = parsed;
      }
    } catch (e) {
      console.warn("AI did not output purely valid JSON:", e);
    }

    return {
      language: data.language,
      text: data.text,
      status: data.status,
      code: data.code,
      structured
    };

  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      language: language,
      text: language === 'ko' 
        ? "AI 진단 서버와의 통신에 실패했습니다. 문제가 지속되면 관리자에게 문의하거나 불만 접수(Complaint Form)를 진행해주세요." 
        : "Failed to communicate with Diagnostic AI Server. If this persists, please proceed to file an Official Complaint.",
      status: 'unresolved',
      code: ''
    };
  }
};
