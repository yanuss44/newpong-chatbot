// 실제 RAG 통합 AI 서비스 (스트리밍 지원)
export const analyzeSymptom = async (userText, language = 'en', history = [], onChunk) => {
  try {
    const contextStr = history.map(msg => 
      `${msg.sender === 'user' ? '사용자' : 'AI'}: ${msg.text}`
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // 아직 덜 온 마지막 데이터 조각 보관

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') continue;

          // JSON 파싱 오류와 서버 에러를 분리하여 처리
          let data;
          try {
            data = JSON.parse(dataStr);
          } catch (e) {
            console.warn("SSE JSON 파싱 실패:", dataStr);
            continue;
          }

          if (data.text) {
            fullText += data.text;
            if (onChunk) onChunk(fullText);
          }
          // 서버 에러는 외부 catch로 전파 (이전에는 내부 catch에 삼켜졌던 버그)
          if (data.error) throw new Error(data.error);
        }
      }
    }

    // 최종 파싱 시도 (JSON 구조 추출 - 가장 바깥 JSON 객체 추출)
    let structured = null;
    try {
      // 첫 번째 '{' 와 마지막 '}' 사이를 추출하여 중첩 JSON 오파싱 방지
      const firstBrace = fullText.indexOf('{');
      const lastBrace = fullText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = fullText.substring(firstBrace, lastBrace + 1);
        structured = JSON.parse(jsonCandidate);
      }
    } catch (e) {
      console.warn("최종 JSON 파싱 실패:", e.message);
    }

    // 다국어 unresolved 감지 키워드
    const UNRESOLVED_KEYWORDS = [
      "매뉴얼에 없",           // Korean
      "not in the manual",     // English
      "no solution",           // English
      "マニュアルにはない",      // Japanese
      "não está no manual",    // Portuguese
      "no está en el manual",  // Spanish
      "cannot be resolved",    // English
      "해결할 수 없",           // Korean
    ];

    // 빈 응답 수신 시 멈춤 방지 → 명확한 에러 메시지 반환
    if (!fullText.trim()) {
      const emptyMsgs = {
        ko: "응답을 받지 못했습니다. 증상을 조금 더 구체적으로 설명해 주세요.",
        en: "No response received. Please describe your symptoms in more detail.",
        ja: "応答を受信できませんでした。症状をもう少し詳しく説明してください。",
        'pt-BR': "Nenhuma resposta recebida. Descreva seus sintomas com mais detalhes.",
        es: "No se recibió respuesta. Por favor, describa sus síntomas con más detalle."
      };
      return {
        language,
        text: emptyMsgs[language] || emptyMsgs.en,
        status: 'diagnosing',
        code: '',
        structured: null
      };
    }

    let status = 'diagnosing';
    if (structured && structured.no_more_checks) {
      status = 'unresolved';
    } else {
      const lowerRes = fullText.toLowerCase();
      if (UNRESOLVED_KEYWORDS.some(kw => lowerRes.includes(kw.toLowerCase()))) {
        status = 'unresolved';
      }
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
    const errorMsgs = {
      ko: "AI 진단 서버와의 통신에 실패했습니다. 질문을 조금 더 구체적으로 작성해 주세요.",
      en: "Failed to communicate with the Diagnostic AI Server. Please describe your symptoms more clearly.",
      ja: "診断AIサーバーとの通信に失敗しました。症状をより具体的にご説明ください。",
      'pt-BR': "Falha ao comunicar com o Servidor de IA Diagnóstica. Descreva seus sintomas com mais clareza.",
      es: "Error al comunicar con el Servidor de IA de Diagnóstico. Por favor, describa sus síntomas con más claridad."
    };
    return {
      language: language,
      text: errorMsgs[language] || errorMsgs.en,
      status: 'unresolved',
      code: ''
    };
  }
};
