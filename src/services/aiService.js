// 실제 RAG 통합 AI 서비스 (스트리밍 지원)
export const analyzeSymptom = async (userText, language = 'en', history = [], onChunk) => {
  try {
    const contextStr = history.map(msg => 
      `${msg.sender === 'user' ? '사용자' : 'AI'}: ${msg.structured ? msg.structured.symptom : msg.text}`
    ).join('\n');

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, language, context: contextStr })
    });

    if (!response.ok) throw new Error(`API 에러: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.text) {
              fullText += data.text;
              if (onChunk) onChunk(fullText); // 실시간 텍스트 전달
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            console.warn("데이터 파싱 실패:", e, dataStr);
          }
        }
      }
    }

    // 최종 파싱 시도 (JSON 구조 추출 최적화: 정규식 사용)
    let structured = null;
    try {
      const jsonMatch = fullText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const pureJson = jsonMatch[0];
        const parsed = JSON.parse(pureJson);
        if (parsed && (parsed.steps || parsed.no_more_checks)) {
          structured = parsed;
        }
      }
    } catch (e) {
      console.warn("최종 JSON 파싱 실패:", e);
    }

    // 상태 요약 로직 (서버와 연계)
    let status = 'diagnosing';
    if (structured && structured.no_more_checks) {
       status = 'unresolved'; // 추가 점검 사항이 없으면 바로 unresolved 상태로 간주
    } else {
       const lowerRes = fullText.toLowerCase();
       if (lowerRes.includes("매뉴얼에 없")) status = 'unresolved';
    }

    return {
      language: language,
      text: fullText,
      status: status,
      code: '',
      structured
    };

  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      language: language,
      text: language === 'ko' 
        ? "AI 진단 서버와의 통신에 실패했습니다. 문제가 지속되면 불만 접수(Complaint Form)를 진행해주세요." 
        : "Failed to communicate with Diagnostic AI Server. Please proceed to file a Complaint.",
      status: 'unresolved',
      code: ''
    };
  }
};
