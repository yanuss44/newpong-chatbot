import React, { useState } from 'react';
import { Bot, User, CheckSquare, Square } from 'lucide-react';

export default function MessageBubble({ message, onUnresolvedClick, onResolvedClick }) {
  const isUser = message.sender === 'user';
  const isKo = message.language === 'ko';
  const [checkedSteps, setCheckedSteps] = useState([]);

  const toggleStep = (idx) => {
    if (checkedSteps.includes(idx)) {
      setCheckedSteps(checkedSteps.filter(i => i !== idx));
    } else {
      setCheckedSteps([...checkedSteps, idx]);
    }
  };

  const handleUnresolved = () => {
    if (message.structured && message.structured.steps) {
      const checkedText = checkedSteps
        .sort((a, b) => a - b)
        .map(idx => `- ${message.structured.steps[idx]} (완료)`)
        .join('\n');
      
      const notes = checkedText 
        ? `[사용자 자가 점검 완료 항목]\n${checkedText}\n----------------------------------\n`
        : '';
      onUnresolvedClick(notes);
    } else {
      onUnresolvedClick('');
    }
  };
  
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${isUser ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30' : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>
        <div className={`p-4 rounded-2xl ${isUser ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-[0_4px_14px_rgba(37,99,235,0.2)] border border-blue-500/20' : 'bg-zinc-800/80 backdrop-blur-md text-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-zinc-700/50 rounded-tl-sm'}`}>
          {message.structured ? (
            <div className="flex flex-col gap-4 w-full">
              {/* 증상 / 원인 요약 섹션 */}
              <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-700/50 shadow-inner">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">{isKo ? 'Target Symptom (증상)' : 'Target Symptom'}</span>
                </div>
                <p className="text-[15px] font-medium text-slate-200 ml-4 leading-relaxed tracking-wide">{message.structured.symptom}</p>
                
                <div className="flex items-center gap-2 mt-4 mb-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.6)]"></div>
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{isKo ? 'Possible Cause (원인)' : 'Possible Cause'}</span>
                </div>
                <p className="text-[14px] text-slate-300 ml-4 leading-relaxed">{message.structured.cause}</p>
              </div>

              {/* 해결 단계 Stepper / Flow Chart UI */}
              <div className="mt-2 mb-2">
                <h4 className="text-[13px] font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-300 shadow-sm flex items-center gap-2">
                    <span className="animate-pulse w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    {isKo ? 'Resolution Flow (확인 항목)' : 'Resolution Flow'}
                  </span>
                </h4>
                <div className="relative pl-4 border-l-[3px] border-zinc-700/60 space-y-6 ml-3 mt-4 pb-2">
                  {message.structured.steps.map((step, idx) => (
                    <div key={idx} className="relative group cursor-pointer" onClick={() => toggleStep(idx)}>
                      {/* Step 동그라미 표식 */}
                      <div className={`absolute -left-[27px] w-[22px] h-[22px] rounded-full flex items-center justify-center top-0 shadow-lg transition-all ${checkedSteps.includes(idx) ? 'bg-emerald-500 border-none scale-110' : 'bg-zinc-900 border-[3px] border-zinc-600'}`}>
                        {checkedSteps.includes(idx) ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <span className="text-[10px] font-bold text-zinc-500">{idx + 1}</span>}
                      </div>
                      {/* Step 내용 카드 */}
                      <div className={`p-4 rounded-2xl border transition-all shadow-md ml-3 ${checkedSteps.includes(idx) ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-800/90'}`}>
                        <p className={`text-[15px] leading-relaxed transition-colors ${checkedSteps.includes(idx) ? 'text-emerald-200 font-bold' : 'text-slate-200 font-medium'}`}>
                          {step}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.text}
            </div>
          )}
          
          {!isUser && message.status === 'unresolved' && (
            <div className="mt-4 border-t border-zinc-700/50 pt-3">
              <button 
                onClick={handleUnresolved}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold py-2 px-4 rounded-lg transition-colors text-sm border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
              >
                {isKo ? 'Complaint Form (불만 접수) 펼치기' : 'Submit Official Complaint Form'}
              </button>
            </div>
          )}
          
          {!isUser && message.status === 'diagnosing' && (
             <div className="mt-4 border-t border-zinc-700/50 pt-3 flex gap-2">
                <button 
                  onClick={onResolvedClick}
                  className="flex-1 bg-zinc-900/50 border border-zinc-700 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  {isKo ? '가이드로 해결됨' : 'Resolved by Guide'}
                </button>
                <button 
                  onClick={handleUnresolved} 
                  className="flex-1 border border-zinc-700 bg-zinc-900/50 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  {isKo ? '해결 안됨 (접수 진행)' : 'Not Resolved (File Complaint)'}
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
