import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export default function StepIndicator({ currentStep }) {
  const steps = [
    { id: 'start', label: '의심 증상 접수' },
    { id: 'diagnosing', label: 'AI 매뉴얼 진단' },
    { id: 'unresolved', label: 'Official Complaint 접수' },
    { id: 'resolved', label: '해결 완료' }
  ];

  // currentStep이 resolved일 경우 끝점, unresolved일 경우 분기.
  let currentIndex = steps.findIndex(s => s.id === currentStep);
  if (currentIndex === -1) currentIndex = 0;
  
  // If we are at unresolved, make 'resolved' look inactive
  const isUnresolvedPath = currentStep === 'unresolved';

  return (
    <div className="bg-zinc-900/60 p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] h-full border border-zinc-800">
      <h3 className="text-lg font-bold mb-6 text-slate-300">진단 진행 상황</h3>
      <div className="flex flex-col space-y-6 relative">
        <div className="absolute left-3 top-2 bottom-6 w-[2px] bg-zinc-800"></div>
        {steps.map((step, index) => {
          // Special handling for the divergent paths
          let isCompleted = index < currentIndex;
          let isCurrent = index === currentIndex;
          
          if (isUnresolvedPath && step.id === 'resolved') {
             isCompleted = false;
             isCurrent = false;
          }
          if (currentStep === 'resolved' && step.id === 'unresolved') {
             return null; // Don't show complaint if already resolved
          }
          
          return (
            <div key={step.id} className="flex items-center space-x-4 relative z-10">
              <div className="bg-zinc-900 rounded-full">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] bg-zinc-900 rounded-full" />
                ) : isCurrent ? (
                  <Circle className="w-6 h-6 text-blue-500 fill-blue-900 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                ) : (
                  <Circle className="w-6 h-6 text-zinc-700" />
                )}
              </div>
              <span className={`text-sm font-medium transition-colors ${isCurrent ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : isCompleted ? 'text-slate-400' : 'text-zinc-600'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
