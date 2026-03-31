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
  const [sessionLanguage, setSessionLanguage] = useState(null); // 세션 고정 언어
  const [lastUserQuery, setLastUserQuery] = useState(''); // 마지막 사용자 질문 저장 (학습용)

  const handleSendMessage = async (text, isSystemCommand = false) => {
    // 🌍 언어 감지 및 세션 고정 로직
    let msgLang = sessionLanguage;

    if (!msgLang) {
      const hasKorean = /[가-힣]/.test(text);
      msgLang = hasKorean ? 'ko' : 'en';
      setSessionLanguage(msgLang); // 최초 감지된 언어로 세션 고정
    }

    setLoadingLanguage(msgLang);
    if (!isSystemCommand) setLastUserQuery(text); // 일반 질문일 때만 학습 재료로 저장
    
    // 시스템 명령(추가 점검 등)인 경우 사용자에게 공개하지 않고 처리할 수도 있지만, 여기서는 투명하게 표시
    const newMessages = [...messages, { sender: 'user', text, language: msgLang }];
    setMessages(newMessages);
    setCurrentStep('diagnosing');
    setIsLoading(true);

    try {
      // 1. 임시 빈 봇 메시지 생성 (상태를 'thinking'으로 시작하여 버튼 노출 방지)
      const botMessageId = Date.now();
      setMessages([...newMessages, { 
        id: botMessageId,
        sender: 'bot', 
        text: '', 
        status: 'thinking', 
        language: msgLang 
      }]);

      // 2. 스트리밍 질의 실행 (onChunk 콜백 활용)
      const response = await analyzeSymptom(text, msgLang, messages, (streamedText) => {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === 'bot') {
            return [...prev.slice(0, -1), { ...lastMsg, text: streamedText }];
          }
          return prev;
        });
      });

      // 3. 최종 완성된 메시지 및 구조화 데이터 반영 (이때 status가 'diagnosing'이 되어 버튼이 나타남)
      if (response) {
        setMessages(prev => {
          const filtered = prev.slice(0, -1);
          return [...filtered, {
            sender: 'bot',
            text: response.text,
            status: response.status || 'diagnosing',
            language: msgLang,
            code: response.code,
            structured: response.structured
          }];
        });

        // ✨ 추가 점검 사항이 없을 경우 자동 접수 전환 (1.5초 지연)
        if (response.structured && response.structured.no_more_checks) {
          setTimeout(() => {
            const autoNote = `[시스템 안내: 추가 점검 불가]\n${response.structured.message || "매뉴얼 내 추가 대책이 확인되지 않아 자동으로 접수 절차를 개시합니다."}`;
            handleUnresolved(msgLang, autoNote);
          }, 1500);
        } else if (response.status === 'unresolved') {
          setCurrentStep('unresolved');
        }
      }
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoreChecks = () => {
    const query = sessionLanguage === 'ko' 
      ? "추가적인 점검 사항이나 해결책이 매뉴얼에 더 있나요? 있다면 상세히 알려주세요." 
      : "Are there any more troubleshooting steps or solutions in the manual? If so, please provide them in detail.";
    handleSendMessage(query, true);
  };

  const [complaintInitialNotes, setComplaintInitialNotes] = useState('');

  const handleUnresolved = (lang, notes = '') => {
    setCurrentStep('unresolved');
    setFormLanguage(sessionLanguage || lang); // 세션 언어 우선
    setComplaintInitialNotes(notes);
    setShowComplaintForm(true);
  };

  const handleResolved = async (resolvedSteps = []) => {
    // 🧠 성공 사례 서버로 전송 (학습 및 구체적 해결 단계 포함)
    const lastBotMsg = messages[messages.length - 1];
    if (lastUserQuery && lastBotMsg && lastBotMsg.sender === 'bot') {
      try {
        await fetch('/api/save-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: lastUserQuery,
            answer: lastBotMsg.text,
            language: sessionLanguage || 'ko',
            resolved_steps: resolvedSteps // 사용자가 체크한 '해결된 항목들' 데이터 추가
          })
        });
      } catch (e) {
        console.error("사례 저장 실패:", e);
      }
    }

    setMessages([...messages, { 
      sender: 'bot', 
      text: sessionLanguage === 'ko' ? '문제가 해결되어 기쁩니다! 이용해 주셔서 감사합니다.' : 'Glad the issue is resolved! Thank you for using our service.',
      language: sessionLanguage || 'ko'
    }]);
    setCurrentStep('resolved');
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
            onMoreChecks={handleMoreChecks}
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
