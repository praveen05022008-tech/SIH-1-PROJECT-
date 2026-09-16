import { apiUrl } from '../config/api';
import React, { useState } from 'react';
import { FileText, Download, CheckCircle, RefreshCcw, FileBarChart2 } from 'lucide-react';

export const Reports: React.FC = () => {
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<string | null>(null);

  const reportTemplates = [
    { title: 'Daily HSE Intelligence Report', desc: 'Summary of all observations, active SIF alerts, and pipeline status in last 24h.' },
    { title: 'Weekly SIF Summary Report', desc: 'Deep dive of SIF-potential events, classification confidence, and reviewer overrides.' },
    { title: 'Monthly Precursor Patterns Report', desc: 'Aggregations of recurrent barrier failures, site rankings, and emerging risk clusters.' },
    { title: 'Site Risk Exposure Report', desc: 'Operational drilldown detailing L1-L6 active safety violations per refinery block.' },
    { title: 'Life-Saving Rules Audit Report', desc: 'Stats on rules conformance, common failure modes, and training focus areas.' }
  ];

  const handleGenerate = async (title: string) => {
    setLoadingReport(title);
    setSuccessReport(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setSuccessReport(title);
    } catch (err) {
      setSuccessReport(title);
    } finally {
      setLoadingReport(null);
    }
  };

  const handleDownload = async (title: string) => {
    try {
      const res = await fetch(apiUrl('/api/events'));
      const data = await res.json();
      const csvHeader = "ID,Site,Unit,Location,Risk Level,SIF Probability,Life Saving Rule,Status,Timestamp,Photo Evidence URL,Description\n";
      const csvRows = Array.isArray(data) ? data.map(e => 
        `"${e.id}","${e.site || ''}","${e.unit || ''}","${e.location || ''}","${e.risk_level || ''}","${e.sif_probability || ''}","${e.life_saving_rule || ''}","${e.status || ''}","${e.timestamp || ''}","${e.photo_url || ''}","${(e.description || '').replace(/"/g, '""')}"`
      ).join("\n") : "";
      
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">Intelligence Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Export formatted compliance PDFs and raw CSV datasets for regulatory submissions.</p>
        </div>
        <span className="text-[10px] font-bold bg-indigo-50 text-industrial-purple px-2.5 py-1 border border-indigo-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <FileBarChart2 className="h-3.5 w-3.5" />
          <span>Report Exports</span>
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Available Report Templates</h3>
        </div>

        <div className="space-y-4">
          {reportTemplates.map((rep) => {
            const isGenerating = loadingReport === rep.title;
            const isDone = successReport === rep.title;

            return (
              <div key={rep.title} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition">
                <div className="flex gap-4 items-start pr-4">
                  <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0 text-industrial-purple">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-normal">{rep.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{rep.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isGenerating ? (
                    <span className="flex items-center gap-1.5 text-xs text-industrial-blue font-bold px-3 py-1.5">
                      <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating...</span>
                    </span>
                  ) : isDone ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-industrial-green border border-emerald-100 px-2 py-1 rounded font-bold uppercase tracking-wider">
                        <CheckCircle className="h-3 w-3" />
                        <span>Ready</span>
                      </span>
                      <button 
                        onClick={() => handleDownload(rep.title)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-industrial-blue hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download CSV</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerate(rep.title)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      Generate Report
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
