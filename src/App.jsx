import React, { useState, useEffect } from 'react';
import ChatContainer from './components/Chat/ChatContainer';
import StepIndicator from './components/Sidebar/StepIndicator';
import ComplaintForm from './components/Complaint/ComplaintForm';
import { analyzeSymptom } from './services/aiService';
import newpongLogo from './assets/newpong.png';
import LanguageSplash from './components/Language/LanguageSplash';

const GREETINGS = {
  ko: { text: '안녕하세요. 환영합니다.\n의료기기 사용 중 발생한 오류나 고장 증상을 자세히 입력해주시면, 매뉴얼 기반으로 해결책을 안내해 드립니다. 불량의 내용을 구체적으로 설명해 주시면 빠르게 응대해 드릴수 있습니다.\n\n(예: "전원이 켜지지 않습니다.", "ERR-P01 에러가 발생했습니다.")', label: '한국어' },
  en: { text: 'Hello. Welcome.\nPlease describe the error or malfunction you are experiencing with your medical device in detail. Providing specific details will help me assist you faster.\n\n(e.g., "The power does not turn on.", "ERR-P01 error occurred.")', label: 'English' },
  ja: { text: 'こんにちは. ようこそ.\n故障の症状を詳しく入力してください.', label: '日本語' },
  'pt-BR': { text: 'Olá. Bem-vindo.\nPor favor, descreva em detalhes o erro.', label: 'Português' },
  es: { text: 'Hola. Bienvenido.\nPor favor, describa detalladamente el error.', label: 'Español' }
};

function App() {
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState('start');
  const [isLoading, setIsLoading] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [sessionLanguage, setSessionLanguage] = useState('ko');
  const [lastUserQuery, setLastUserQuery] = useState('');
  const [complaintNotes, setComplaintNotes] = useState('');

  const handleLanguageSelect = (lang) => {
    setSessionLanguage(lang);
    setMessages([{ sender: 'bot', text: GREETINGS[lang]?.text || GREETINGS.ko.text, language: lang }]);
    setIsLanguageSelected(true);
    setCurrentStep('start');
  };

  const handleSendMessage = async (text, isInternal = false) => {
    if (!text.trim()) return;
    if (!isInternal) {
      setMessages(prev => [...prev, { sender: 'user', text }]);
      setLastUserQuery(text);
    }
    
    // 🚀 전송 시점에 2단계로 즉시 전환
    setIsLoading(true);
    setCurrentStep('diagnosing');

    try {
      const resp = await analyzeSymptom(text, sessionLanguage, messages);
      
      // 📊 진단 단계 동기화 (AI 응답 상태에 따라 사이드바 업데이트)
      if (resp.status === 'unresolved') {
        setCurrentStep('unresolved');
      } else if (resp.status === 'diagnosing' && currentStep !== 'diagnosing') {
        setCurrentStep('diagnosing');
      }

      setMessages(prev => [...prev, {
        sender: 'bot',
        text: resp.text,
        structured: resp.structured,
        language: sessionLanguage,
        status: resp.status
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { sender: 'bot', text: "AI 서버와 통신 중 문제가 발생했습니다.", language: sessionLanguage }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🕒 세션 종료 전 데이터 유실 방지 (데이터 축적 엔진)
  useEffect(() => {
    const handleUnload = () => {
      if (messages && messages.length >= 3 && lastUserQuery) {
        try {
          const lastBot = messages[messages.length - 1];
          if (lastBot?.sender === 'bot') {
            const data = JSON.stringify({
              question: lastUserQuery, answer: lastBot.text, language: sessionLanguage, isAutoSaved: true
            });
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/save-case', blob);
          }
        } catch (e) { console.error(e); }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [messages, lastUserQuery, sessionLanguage]);

  const handleResolved = async (resolvedSteps) => {
    // 💾 AI 학습을 위한 데이터 저장
    if (lastUserQuery && messages.length > 0) {
      const lastBot = messages[messages.length - 1];
      try {
        await fetch('/api/save-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: lastUserQuery,
            answer: `[Resolved by Guide]\nResolved Steps: ${resolvedSteps?.join(', ')}\nRaw Answer: ${lastBot?.text}`,
            language: sessionLanguage,
            model: lastBot?.structured?.model_name || "Unknown"
          })
        });
      } catch (e) { console.error("Save error:", e); }
    }

    // 🎉 종료 메시지 추가
    const finalMsgs = {
      ko: "해결되었다니 정말 다행입니다!\n이용해 주셔서 감사합니다. 추가적인 질문사항이 있으면 언제든지 다시 문의해 주세요.",
      en: "I'm glad the issue is resolved!\nThank you for using our service. If you have any more questions, feel free to ask anytime.",
      ja: "問題が解決されて本当に良かったです！\nご利用いただきありがとうございます。追加のご質問がございましたら、いつでもお問い合わせください。",
      'pt-BR': "Fico feliz que o problema foi resolvido!\nObrigado por usar nosso serviço. Se tiver mais perguntas, sinta-se à vontade para perguntar a qualquer momento.",
      es: "¡Me alegra que el problema se haya resuelto!\nGracias por usar nuestro servicio. Si tiene más preguntas, no dude en preguntar en cualquier momento."
    };
    const finalMsg = finalMsgs[sessionLanguage] || finalMsgs.en;

    setMessages(prev => [...prev, {
      sender: 'bot',
      text: finalMsg,
      language: sessionLanguage,
      status: 'finished'
    }]);
    
    setCurrentStep('resolved');
  };

  if (!isLanguageSelected) {
    return <LanguageSplash onSelect={handleLanguageSelect} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0c0c0e] overflow-hidden font-sans text-slate-200">
      {/* 🔮 NEWPONG Global CS Team Header (1.5x Scaled) */}
      <header className="h-20 border-b border-white/5 bg-black/40 flex items-center px-8 justify-between shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img 
              src={newpongLogo} 
              alt="NEWPONG" 
              className="h-10 opacity-95" 
              style={{ filter: 'invert(1) hue-rotate(180deg)' }} 
            />
            <span className="text-lg font-black text-white tracking-tight">NEWPONG Global CS Team</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg">
          <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">ISO 13485 Compliant</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* 💬 채팅 메인 영역 */}
        <section className="flex-1 relative overflow-hidden bg-black/20">
          <ChatContainer
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            loadingLanguage={sessionLanguage}
            onResolved={handleResolved}
            onUnresolved={(lang, notes) => {
              setComplaintNotes(notes || '');
              setShowComplaintForm(true);
              setCurrentStep('unresolved');
            }}
            onMoreChecks={() => {
              const moreChecksMsg = {
                ko: "추가 점검 사항도 알려주세요.",
                en: "Please provide additional troubleshooting steps.",
                ja: "追加の点検項目も教えてください。",
                'pt-BR': "Por favor, forneça etapas adicionais de solução de problemas.",
                es: "Por favor, proporcione pasos adicionales de solución de problemas."
              };
              handleSendMessage(moreChecksMsg[sessionLanguage] || moreChecksMsg.en, true);
            }}
          />
        </section>

        {/* 📊 사이드바 진행 단계 (우측 배치) */}
        <aside className="w-[320px] border-l border-white/5 bg-zinc-900/30 p-8 hidden lg:block overflow-y-auto shrink-0 transition-all duration-300">
          <StepIndicator currentStep={currentStep} language={sessionLanguage} />
        </aside>
      </main>

      {/* 📝 불만 접수 폼 레이어 */}
      {showComplaintForm && (
        <ComplaintForm
          initialNotes={complaintNotes}
          language={sessionLanguage}
          onClose={() => setShowComplaintForm(false)}
        />
      )}
    </div>
  );
}

export default App;
