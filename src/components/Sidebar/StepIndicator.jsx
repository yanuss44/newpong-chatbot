import React from 'react';

const STEP_LABELS = {
  ko: {
    title: '진단 진행 상황',
    start: '의심 증상 접수',
    diagnosing: 'AI 매뉴얼 진단',
    unresolved: '공식 불만 접수',
    resolved: '해결 완료',
  },
  en: {
    title: 'Diagnostic Progress',
    start: 'Symptom Reported',
    diagnosing: 'AI Manual Diagnosis',
    unresolved: 'Official Complaint Filed',
    resolved: 'Issue Resolved',
  },
  ja: {
    title: '診断の進捗状況',
    start: '症状受付',
    diagnosing: 'AIマニュアル診断',
    unresolved: '公式クレーム申請',
    resolved: '解決完了',
  },
  'pt-BR': {
    title: 'Progresso do Diagnóstico',
    start: 'Sintoma Registrado',
    diagnosing: 'Diagnóstico AI',
    unresolved: 'Reclamação Oficial',
    resolved: 'Problema Resolvido',
  },
  es: {
    title: 'Progreso del Diagnóstico',
    start: 'Síntoma Registrado',
    diagnosing: 'Diagnóstico AI',
    unresolved: 'Queja Oficial',
    resolved: 'Problema Resuelto',
  },
};

export default function StepIndicator({ currentStep, language = 'ko' }) {
  const labels = STEP_LABELS[language] || STEP_LABELS.en;

  const steps = [
    { id: 'start', label: labels.start },
    { id: 'diagnosing', label: labels.diagnosing },
    { id: 'unresolved', label: labels.unresolved },
    { id: 'resolved', label: labels.resolved },
  ];

  let currentIndex = steps.findIndex(s => s.id === currentStep);
  if (currentIndex === -1) currentIndex = 0;

  const isUnresolvedPath = currentStep === 'unresolved';
  const isResolvedPath = currentStep === 'resolved';

  return (
    <div className="h-full">
      <h3 className="text-[15px] font-bold mb-10 text-slate-200">{labels.title}</h3>
      <div className="flex flex-col space-y-8 relative">
        {/* Vertical Line */}
        <div className="absolute left-[11px] top-2 bottom-6 w-[1px] bg-zinc-800"></div>

        {steps.map((step, index) => {
          let isCompleted = index < currentIndex;
          let isCurrent = index === currentIndex;

          // unresolved 경로: 'resolved' 단계는 비활성
          if (isUnresolvedPath && step.id === 'resolved') {
            isCompleted = false;
            isCurrent = false;
          }
          // resolved 경로: 'unresolved' 단계는 건너뜀(완료 표시 유지)
          if (isResolvedPath && step.id === 'unresolved') {
            isCompleted = false;
            isCurrent = false;
          }

          return (
            <div key={step.id} className="flex items-center space-x-5 relative z-10">
              <div className="relative flex items-center justify-center">
                {isCurrent ? (
                  <>
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-blue-600 bg-zinc-950 z-10 flex items-center justify-center">
                      <div className="w-[8px] h-[8px] rounded-full bg-blue-600"></div>
                    </div>
                    <div className="absolute inset-0 w-[22px] h-[22px] rounded-full bg-blue-600/20 blur-[4px]"></div>
                  </>
                ) : isCompleted ? (
                  <div className="w-[22px] h-[22px] rounded-full border border-zinc-700 bg-zinc-800 z-10 flex items-center justify-center">
                    <div className="w-[6px] h-[6px] rounded-full bg-zinc-600"></div>
                  </div>
                ) : (
                  <div className="w-[22px] h-[22px] rounded-full border border-zinc-800 bg-zinc-900 z-10"></div>
                )}
              </div>
              <span className={`text-[13px] font-medium transition-all ${
                isCurrent ? 'text-blue-500 font-bold' :
                isCompleted ? 'text-zinc-500' : 'text-zinc-600'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
