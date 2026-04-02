import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { Send } from 'lucide-react';

export default function ChatContainer({ messages, onSendMessage, onUnresolved, onResolved, onMoreChecks, isLoading, loadingLanguage }) {
  const [input, setInput] = useState('');
  const [searchTime, setSearchTime] = useState(0);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 자동 포커스: 처음 로딩 시 및 로딩이 끝날 때마다
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    let interval;
    if (isLoading) {
      setSearchTime(0);
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
      // 전송 직후 즉시 입력창으로 포커스 복귀
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

    const isFinished = messages.some(m => m.status === 'finished');

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-gradient-to-br from-zinc-950 to-zinc-900 border-b border-zinc-800 shadow-inner custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <MessageBubble 
              key={index} 
              message={msg} 
              onUnresolvedClick={(notes) => onUnresolved(msg.language || 'ko', notes)}
              onResolvedClick={(steps) => onResolved(steps)}
              onMoreChecks={onMoreChecks}
            />
          ))}
          {isLoading && (
            <div className="flex flex-col items-start gap-2 max-w-[80%]">
              <div className="flex items-center gap-3 text-emerald-400 p-4 bg-zinc-800/80 backdrop-blur-sm shadow-lg border border-zinc-700/50 rounded-2xl custom-glass">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(52,211,153,0.8)] delay-100"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(16,185,129,0.8)] delay-200"></div>
                </div>
                <span className="text-sm font-medium text-emerald-300">
                  {(() => {
                    const unit = loadingLanguage === 'ko' ? `${searchTime}초 경과` : `${searchTime}s elapsed`;
                    const msgs = {
                      ko: `해결책을 찾고있습니다. 잠시만 기다려주세요... (${unit})`,
                      en: `Finding a solution. Please wait a moment... (${unit})`,
                      ja: `解決策を探しています。少々お待ちください... (${unit})`,
                      'pt-BR': `Encontrando uma solução. Aguarde um momento... (${unit})`,
                      es: `Buscando una solución. Por favor espere un momento... (${unit})`,
                    };
                    return msgs[loadingLanguage] || msgs.en;
                  })()}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="p-5 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 shadow-[0_-8px_16px_-1px_rgb(0,0,0,0.3)] z-10 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={(() => {
              if (isFinished) {
                const finishedPh = {
                  ko: "상담이 종료되었습니다. 감사합니다.",
                  en: "Session finished. Thank you.",
                  ja: "相談が終了しました。ありがとうございました。",
                  'pt-BR': "Sessão encerrada. Obrigado.",
                  es: "Sesión finalizada. Gracias.",
                };
                return finishedPh[loadingLanguage] || finishedPh.en;
              }
              const activePh = {
                ko: "증상을 입력해주세요 (예: 전원이 켜지지 않아요.)",
                en: "Describe your device symptom... (e.g., Power does not turn on.)",
                ja: "故障の症状を入力してください（例：電源が入らない）",
                'pt-BR': "Descreva o sintoma do dispositivo... (ex.: O dispositivo não liga.)",
                es: "Describa el síntoma del dispositivo... (ej.: El dispositivo no enciende.)",
              };
              return activePh[loadingLanguage] || activePh.en;
            })()}
            className={`flex-1 border border-zinc-700/50 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFinished ? 'bg-zinc-900 opacity-50' : 'bg-zinc-950/80'} text-white placeholder-zinc-500 transition-all text-[15px] shadow-inner`}
            disabled={isLoading || isFinished}
          />
          <button 
            type="submit" 
            disabled={isLoading || isFinished || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white p-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
