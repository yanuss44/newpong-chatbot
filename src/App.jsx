import React, { useState, useEffect } from 'react';
import ChatContainer from './components/Chat/ChatContainer';
import StepIndicator from './components/Sidebar/StepIndicator';
import ComplaintForm from './components/Complaint/ComplaintForm';
import { analyzeSymptom } from './services/aiService';
import newpongLogo from './assets/newpong.png';

function App() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '안녕하세요. 환영합니다.\n의료기기 사용 중 발생한 오류나 고장 증상을 자세히 입력해주시면, 매뉴얼 기반으로 해결책을 안내해 드립니다. 불량의 내용을 구체적으로 설명해 주시면 빠르게 응대해 드릴수 있습니다.\n\n(예: "전원이 켜지지 않습니다.", "ERR-P01 에러가 발생했습니다.")',
      status: 'start', // 'start', 'diagnosing', 'unresolved', 'resolved'
      language: 'ko'
    }
  ]);
  const [currentStep, setCurrentStep] = useState('start');
  const [isLoading, setIsLoading] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [formLanguage, setFormLanguage] = useState('ko');
  const [loadingLanguage, setLoadingLanguage] = useState('ko');
  const [sessionLanguage, setSessionLanguage] = useState(null); // 대화 유지 언어

  const handleSendMessage = async (text) => {
    // 🌍 언어 감지 및 유지 로직
    const hasKorean = /[가-힣]/.test(text);
    let msgLang = sessionLanguage;

    if (hasKorean) {
      msgLang = 'ko';
    } else if (!sessionLanguage) {
      // 최초 질문이고 한글이 없으면 영어로 판단 (모델명만 있는 경우 등)
      msgLang = 'en';
    }
    // 이미 sessionLanguage가 'ko'인 상태에서 'np-200'(한글없음)을 쳐도 'ko'로 유지됨

    if (!sessionLanguage) setSessionLanguage(msgLang);
    setLoadingLanguage(msgLang);
    
    const newMessages = [...messages, { sender: 'user', text, language: msgLang }];
    setMessages(newMessages);
    setCurrentStep('diagnosing');
    setIsLoading(true);

    try {
      // Call AI Service with full context
      const response = await analyzeSymptom(text, msgLang, messages);
      if (response) {
        setMessages([...newMessages, {
          sender: 'bot',
          text: response.text,
          status: response.status,
          language: response.language,
          code: response.code,
          structured: response.structured
        }]);
        // If it comes back unresolved immediately
        if (response.status === 'unresolved') {
          setCurrentStep('unresolved');
        }
      }
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const [complaintInitialNotes, setComplaintInitialNotes] = useState('');

  const handleUnresolved = (lang, notes = '') => {
    setCurrentStep('unresolved');
    setFormLanguage(lang);
    setComplaintInitialNotes(notes);
    setShowComplaintForm(true);
  };

  const handleResolved = () => {
    setCurrentStep('resolved');
    setMessages([...messages, {
      sender: 'bot',
      text: '가이드로 문제가 해결되어 다행입니다! 다른 도움이 필요하시면 언제든 증상을 입력해주세요.'
    }]);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden font-sans text-slate-200">
      {/* Header */}
      <header className="h-[72px] bg-zinc-900/80 backdrop-blur-md text-white flex items-center px-8 shadow-sm z-20 shrink-0 border-b border-zinc-800">
        <img src={newpongLogo} alt="NEWPONG CI" className="h-8 mr-3 object-contain invert grayscale brightness-125 mix-blend-screen opacity-90" />
        <h1 className="text-xl font-bold tracking-wide">NEWPONG Global CS Team</h1>
        <div className="ml-auto flex items-center gap-3 relative">
          <div className="animate-pulse w-2 h-2 rounded-full bg-emerald-400 absolute -left-4 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          <span className="text-xs font-bold bg-white/5 text-slate-300 px-3 py-1.5 rounded-full border border-white/10">ISO 13485 Compliant</span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <section className="flex-1 h-full shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative z-10 flex flex-col">
          <ChatContainer 
            messages={messages} 
            onSendMessage={handleSendMessage}
            onUnresolved={handleUnresolved}
            onResolved={handleResolved}
            isLoading={isLoading}
            loadingLanguage={loadingLanguage}
          />
        </section>

        {/* Sidebar */}
        <aside className="w-[320px] shrink-0 h-full p-6 bg-zinc-900/40 border-l border-zinc-800 backdrop-blur-sm">
          <StepIndicator currentStep={currentStep} />
        </aside>
      </main>

      {/* Complaint Form Modal */}
      {showComplaintForm && (
        <ComplaintForm 
          onClose={() => setShowComplaintForm(false)} 
          language={formLanguage} 
          initialNotes={complaintInitialNotes}
        />
      )}
    </div>
  );
}

export default App;
