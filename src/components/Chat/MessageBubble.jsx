import React, { useState } from 'react';
import { Bot, User, CheckSquare, Square } from 'lucide-react';

const UI_TEXT = {
  ko: {
    checklist: '진단 체크리스트',
    resolved: '해결됨',
    notSolved: '해결 안됨',
    moreChecks: '다른 체크항목을 더 확인해드릴까요?',
    yes: '예 (YES)',
    no: '아니오 (A/S접수)',
    complaint: '해결 안됨 (서비스 불만 접수서 작성)',
    solutions: '검색된 해결 방법입니다:',
    asGuideMsg: '안내드립니다.\n\n확인 가능한 모든 매뉴얼 해결책을 검토해봤지만 문제가 지속되고 있는 것 같습니다.\n\n전문 엔지니어의 방문 서비스(A/S) 접수 진행을 도와드릴까요?',
    asYes: '예, A/S 접수를 도와주세요',
    asNo: '아니오, 더 확인해볼게요',
  },
  en: {
    checklist: 'Diagnosis Checklist',
    resolved: 'Resolved',
    notSolved: 'Not Solved',
    moreChecks: 'Should I check more items?',
    yes: 'YES',
    no: 'NO (A/S Request)',
    complaint: 'File Official Complaint Form',
    solutions: 'Found the following solutions:',
    asGuideMsg: 'We have reviewed all available manual solutions, but it seems the issue persists.\n\nWould you like us to assist you with filing an A/S service request for an engineer visit?',
    asYes: 'Yes, Please Help Me File A/S Request',
    asNo: 'No, I Will Check More',
  },
  ja: {
    checklist: '診断チェックリスト',
    resolved: '解決済み',
    notSolved: '未解決',
    moreChecks: '他のチェック項目も確認しますか？',
    yes: 'はい',
    no: 'いいえ（A/S申請）',
    complaint: '公式クレームフォームを提出',
    solutions: '以下の解決策が見つかりました：',
    asGuideMsg: 'ご案内いたします。\n\nマニュアルに記載された解決策をすべて確認しましたが、問題が解消されていないようです。\n\n専門エンジニアによる訪問サービス（A/S）の申請手続きをお手伝いしましょうか？',
    asYes: 'はい、A/S申請をお願いします',
    asNo: 'いいえ、もう少し確認します',
  },
  'pt-BR': {
    checklist: 'Lista de Diagnóstico',
    resolved: 'Resolvido',
    notSolved: 'Não Resolvido',
    moreChecks: 'Devo verificar mais itens?',
    yes: 'SIM',
    no: 'NÃO (Solicitar A/S)',
    complaint: 'Registrar Formulário de Reclamação',
    solutions: 'Seguem as soluções encontradas:',
    asGuideMsg: 'Informamos que revisamos todas as soluções disponíveis no manual, mas o problema parece persistir.\n\nGostaria que o ajudássemos a registrar uma solicitação de serviço A/S para uma visita de um engenheiro especialista?',
    asYes: 'Sim, Por Favor Me Ajude com o A/S',
    asNo: 'Não, Vou Verificar Mais',
  },
  es: {
    checklist: 'Lista de Diagnóstico',
    resolved: 'Resuelto',
    notSolved: 'No Resuelto',
    moreChecks: '¿Debo verificar más elementos?',
    yes: 'SÍ',
    no: 'NO (Solicitud A/S)',
    complaint: 'Presentar Formulario de Queja',
    solutions: 'Se encontraron las siguientes soluciones:',
    asGuideMsg: 'Le informamos que hemos revisado todas las soluciones disponibles en el manual, pero el problema parece persistir.\n\n¿Le gustaría que lo ayudemos a registrar una solicitud de servicio A/S para la visita de un ingeniero especialista?',
    asYes: 'Sí, Ayúdeme con la Solicitud A/S',
    asNo: 'No, Verificaré Más',
  },
};

export default function MessageBubble({ message, onUnresolvedClick, onResolvedClick, onMoreChecks }) {
  const isUser = message.sender === 'user';
  const lang = message.language || 'en';
  const t = UI_TEXT[lang] || UI_TEXT.en;
  const isKo = lang === 'ko';
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [showMoreQuery, setShowMoreQuery] = useState(false);
  const [showAsGuide, setShowAsGuide] = useState(false); // A/S 접수 전 안내 단계

  const toggleStep = (idx) => {
    if (checkedSteps.includes(idx)) {
      setCheckedSteps(checkedSteps.filter(i => i !== idx));
    } else {
      setCheckedSteps([...checkedSteps, idx]);
    }
  };

  const handleUnresolved = () => {
    const steps = message.structured?.steps || message.structured?.troubleshooting_steps || [];
    const checkedText = checkedSteps
      .sort((a, b) => a - b)
      .map(idx => {
        const item = steps[idx];
        const text = typeof item === 'string' ? item : (item.check || item.step_content || Object.values(item)[0]);
        return `- ${text} (완료)`;
      })
      .join('\n');

    const notes = checkedText
      ? `[사용자 자가 점검 완료 항목]\n${checkedText}\n----------------------------------\n`
      : '';
    onUnresolvedClick(notes);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        {/* 아바타 영역 */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isUser ? 'bg-blue-600' : 'bg-emerald-600'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>

        {/* 메시지 버블 영역 */}
        <div className={`p-5 rounded-2xl shadow-md ${
          isUser 
            ? 'bg-blue-700 text-white rounded-tr-sm' 
            : 'bg-zinc-800/80 text-slate-200 border border-white/5 rounded-tl-sm'
        }`}>
          {message.status === 'thinking' && !message.text ? (
            <div className="flex items-center gap-1.5 py-1 px-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 w-full">
              {/* 1. 텍스트 메시지 (설명글) */}
              <div className="whitespace-pre-wrap text-[15.5px] leading-relaxed font-medium">
                {(() => {
                  const lang = message.language || 'en';
                  const syncMsg = {
                    ko: "데이터를 불러오는 중입니다...",
                    en: "Syncing data...",
                    ja: "データを読み込んでいます...",
                    'pt-BR': "Carregando dados...",
                    es: "Cargando datos...",
                  };
                  const solutionMsg = {
                    ko: '검색된 해결 방법입니다:',
                    en: 'Found the following solutions:',
                    ja: '以下の解決策が見つかりました：',
                    'pt-BR': 'Seguem as soluções encontradas:',
                    es: 'Se encontraron las siguientes soluciones:',
                  };

                  // [1] JSON 블록을 제외한 순수 텍스트 추출 (첫 '{' 이전 텍스트 우선)
                  if (message.text) {
                    const firstBrace = message.text.indexOf('{');
                    const textBeforeJson = firstBrace > 0 ? message.text.substring(0, firstBrace).trim() : '';
                    if (textBeforeJson) return textBeforeJson;

                    // JSON 전체 제거 후 남은 텍스트
                    const lastBrace = message.text.lastIndexOf('}');
                    const textAfterJson = lastBrace !== -1 ? message.text.substring(lastBrace + 1).trim() : '';
                    if (textAfterJson) return textAfterJson;
                  }

                  // [2] 구조화 데이터 내의 텍스트 탐색
                  if (message.structured) {
                    const s = message.structured;
                    const topMsg = s.message || s.status || s.symptom || s.model_confirmed || s.model_name;
                    if (topMsg) return topMsg;

                    const modelStatus = s.model_check?.status || s.model_check?.message;
                    if (modelStatus) return modelStatus;

                    if (s.steps || s.troubleshooting_steps) {
                      return solutionMsg[lang] || solutionMsg.en;
                    }
                  }

                  // [3] 최후의 보루: 원문 노출
                  return message.text || syncMsg[lang] || syncMsg.en;
                })()}
              </div>

              {/* 2. 체크리스트 (해결 단계) */}
              {message.structured && (message.structured.steps || message.structured.troubleshooting_steps) && (
                <div className="mt-2 border-t border-white/5 pt-5">
                  <h4 className="text-[13px] font-black text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <CheckSquare className="w-4 h-4" />
                    {t.checklist}
                  </h4>
                  <div className="relative pl-4 border-l-2 border-zinc-700 space-y-4 ml-2">
                    {(message.structured.steps || message.structured.troubleshooting_steps).map((item, idx) => {
                      const stepText = typeof item === 'string' ? item : (item.check || item.step_content || Object.values(item)[0]);
                      const isChecked = checkedSteps.includes(idx);
                      return (
                        <div key={idx} className="relative group cursor-pointer" onClick={() => toggleStep(idx)}>
                          <div className={`absolute -left-[26px] w-[20px] h-[20px] rounded flex items-center justify-center top-0.5 transition-all ${isChecked ? 'bg-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-zinc-900 border border-zinc-600'}`}>
                            {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-zinc-500" />}
                          </div>
                          <div className={`p-4 rounded-xl border transition-all ${isChecked ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900'}`}>
                            <p className={`text-[15px] leading-relaxed ${isChecked ? 'text-emerald-200/80 line-through' : 'text-slate-200'}`}>
                              {stepText}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. 하단 액션 버튼 영역 */}
              {!isUser && (
                <div className="pt-2">

                  {/* ── A/S 접수 안내 멘트 (공통 중간 단계) ── */}
                  {showAsGuide ? (
                    <div className="bg-zinc-900/90 p-5 rounded-2xl border border-blue-500/20 animate-in fade-in slide-in-from-bottom-2 duration-400">
                      <p className="text-[14.5px] text-slate-200 mb-5 leading-relaxed whitespace-pre-line">
                        {t.asGuideMsg}
                      </p>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleUnresolved}
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-xl font-black transition-all shadow-lg shadow-rose-900/20 text-sm"
                        >
                          {t.asYes}
                        </button>
                        <button
                          onClick={() => { setShowAsGuide(false); setShowMoreQuery(false); }}
                          className="w-full bg-zinc-700 hover:bg-zinc-600 text-slate-300 py-3 rounded-xl font-bold transition-all text-sm"
                        >
                          {t.asNo}
                        </button>
                      </div>
                    </div>

                  ) : message.status === 'unresolved' ? (
                    /* ── unresolved: 안내 버튼 → showAsGuide ── */
                    <button
                      onClick={() => setShowAsGuide(true)}
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-3 px-4 rounded-xl transition-all border border-rose-500/20 text-sm shadow-sm"
                    >
                      {t.complaint}
                    </button>

                  ) : message.status === 'diagnosing' && message.structured && (
                    <div className="flex flex-col gap-3">

                      {/* ── no_more_checks: 바로 A/S 안내 단계로 ── */}
                      {message.structured.no_more_checks && !message.structured.steps && !message.structured.troubleshooting_steps ? (
                        <div className="bg-zinc-900/80 p-5 rounded-2xl border border-rose-500/20 text-center animate-in fade-in duration-500">
                          <button
                            onClick={() => setShowAsGuide(true)}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20"
                          >
                            {t.complaint}
                          </button>
                        </div>

                      ) : !showMoreQuery ? (
                        /* ── 해결됨 / 해결 안됨 버튼 ── */
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => {
                              const steps = message.structured.steps || message.structured.troubleshooting_steps;
                              onResolvedClick(checkedSteps.map(idx => steps[idx]));
                            }}
                            className="flex-1 bg-zinc-900/50 border border-zinc-700 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 py-3 rounded-xl text-sm font-black transition-all"
                          >
                            {t.resolved}
                          </button>
                          <button
                            onClick={() => setShowMoreQuery(true)}
                            className="flex-1 bg-zinc-900/50 border border-zinc-700 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 py-3 rounded-xl text-sm font-black transition-all"
                          >
                            {t.notSolved}
                          </button>
                        </div>

                      ) : (
                        /* ── 추가 체크 여부 확인 ── */
                        <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-700 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-[14px] text-slate-300 mb-4 font-bold text-center">
                            {t.moreChecks}
                          </p>
                          <div className="flex gap-3">
                            <button onClick={onMoreChecks} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-900/20">
                              {t.yes}
                            </button>
                            <button
                              onClick={() => setShowAsGuide(true)}
                              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-slate-200 py-3 rounded-xl text-sm font-black transition-all"
                            >
                              {t.no}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
