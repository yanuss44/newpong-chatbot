import React from 'react';
import { Globe, ArrowRight } from 'lucide-react';
import newpongLogo from '../../assets/newpong.png';

const languages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷', label: 'Korean' },
  { code: 'en', name: 'English', flag: '🇺🇸', label: 'English' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', label: 'Japanese' },
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷', label: 'Portuguese' },
  { code: 'es', name: 'Español', flag: '🇪🇸', label: 'Spanish' },
];

export default function LanguageSplash({ onSelect }) {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-10 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center gap-6">
          <img src={newpongLogo} alt="NEWPONG" className="h-12 object-contain invert grayscale brightness-150 opacity-90" />
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm shadow-xl hover:bg-white/10 transition-colors">
            <Globe className="w-5 h-5 text-blue-400 animate-spin-slow" />
            <span className="text-sm font-bold text-slate-300 tracking-wider">Global Medical Support System</span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            원활한 상담을 위해서<br />사용하실 언어를 선택해 주세요
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            Please select your preferred language for consultation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className="group flex items-center justify-between p-6 bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800 hover:border-blue-500/50 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-blue-500/10 backdrop-blur-md"
            >
              <div className="flex items-center gap-4 text-left">
                <span className="text-3xl filter saturate-150 drop-shadow-md">{lang.flag}</span>
                <div className="flex flex-col">
                  <span className="text-lg font-black text-white">{lang.name}</span>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">{lang.label}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-800/50 group-hover:bg-blue-600 flex items-center justify-center transition-all">
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>

        <footer className="pt-10 transition-opacity duration-1000 delay-500">
           <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
             <span className="text-[12px] font-bold text-emerald-400/80 tracking-widest uppercase">System Online (ISO 13485)</span>
           </div>
        </footer>
      </div>
    </div>
  );
}
