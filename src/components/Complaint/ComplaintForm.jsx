import React, { useState, useRef } from 'react';
import template from '../../data/complaint_form_template.json';
import { generateEmailTemplate } from '../../utils/emailTemplate.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, FileJson, Mail, X, CheckCircle } from 'lucide-react';

export default function ComplaintForm({ onClose, language, initialNotes }) {
  const [formData, setFormData] = React.useState({
    additionalNotes: initialNotes || ''
  });
  const [copiedHTML, setCopiedHTML] = React.useState(false);
  const formRef = useRef(null);

  // initialNotes가 변경될 때 formData에 반영 (필수)
  React.useEffect(() => {
    if (initialNotes) {
      setFormData(prev => ({ ...prev, additionalNotes: initialNotes }));
    }
  }, [initialNotes]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `complaint_${formData.serialNumber || 'record'}.json`;
    a.click();
  };

  const handleExportPDF = async () => {
    if (!formRef.current) return;
    
    try {
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        backgroundColor: '#18181b', // zinc-900 background
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`complaint_${formData.serialNumber || 'record'}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      // Fallback
      const doc = new jsPDF();
      doc.text("Export Error - Please use JSON or Copy Email", 20, 20);
      doc.save('error.pdf');
    }
  };

  const handleCopyEmailHTML = () => {
    const html = generateEmailTemplate(formData);
    const blob = new Blob([html], { type: 'text/html' });
    const clipboardItem = new window.ClipboardItem({ 'text/html': blob });
    
    navigator.clipboard.write([clipboardItem]).then(() => {
        setCopiedHTML(true);
        setTimeout(() => setCopiedHTML(false), 3000);
    }).catch(err => {
        console.error("HTML Copy failed. Falling back to text.", err);
        navigator.clipboard.writeText(html);
        setCopiedHTML(true);
        setTimeout(() => setCopiedHTML(false), 3000);
    });
  };

  const labels = {
    title: language === 'en' ? 'Official Complaint Form' : '공식 불만 접수 (Complaint Form)',
    subtitle: language === 'en' ? 'Please fill out to comply with ISO 13485 traceability.' : 'ISO 13485 규격에 따른 추적성을 위해 아래 양식을 작성해주세요.',
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] border border-zinc-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/80">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100">{labels.title}</h2>
            <p className="text-sm text-slate-400 mt-1">{labels.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        <div ref={formRef} className="flex-1 overflow-y-auto p-8 bg-zinc-900 custom-scrollbar">
          <form className="space-y-5">
            {template.fields.map(field => (
              <div key={field.name} className="flex flex-col">
                <label className="text-sm font-bold text-slate-300 mb-1.5 ml-1 flex items-center gap-1">
                  {field.label} {field.required && <span className="text-rose-500 font-black">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea 
                    name={field.name}
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    className="bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm text-slate-200 placeholder-zinc-600 shadow-inner"
                    placeholder={`상세한 ${field.label.toLowerCase()}을(를) 입력하세요`}
                  />
                ) : (
                  <input 
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    className="bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm text-slate-200 shadow-inner"
                  />
                )}
              </div>
            ))}
          </form>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/90 flex gap-3 flex-wrap justify-end rounded-b-2xl">
          <button onClick={handleExportJSON} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-slate-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm shadow-sm">
            <FileJson className="w-4 h-4" /> Export JSON
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-slate-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm shadow-sm">
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button 
             onClick={handleCopyEmailHTML} 
             className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition-all text-sm shadow-sm
                ${copiedHTML ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}
             `}
          >
            {copiedHTML ? <CheckCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />} 
            {copiedHTML ? 'Copied to Clipboard (HTML)' : 'Copy Email Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
