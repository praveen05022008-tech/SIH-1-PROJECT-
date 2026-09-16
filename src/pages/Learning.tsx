import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { RefreshCcw, GraduationCap, ArrowRight, BrainCircuit, Sparkles, AlertCircle } from 'lucide-react';

interface LearningProps {
  triggerStateRefresh: boolean;
}

export const Learning: React.FC<LearningProps> = ({ triggerStateRefresh }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLearning = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/learning'));
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
    } catch (err) {
      console.warn('Learning API error:', err);
      setData({
        reports_reviewed: 0,
        corrections_count: 0,
        learning_events_count: 0,
        model_improvement: '0%',
        recent_learning: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearning();
  }, [triggerStateRefresh]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading GATI learning loop metrics...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">GATI Learning Centre</h1>
          <p className="text-xs text-slate-500 mt-1">Continuous intelligence calibration from HSE reviewer overrides and validated outcomes.</p>
        </div>
        <span className="text-[10px] font-bold bg-indigo-50 text-industrial-purple px-2.5 py-1 border border-indigo-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Feedback loop</span>
        </span>
      </div>

      {/* Visual Learning Loop */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">The GATI Calibration Feedback Loop</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">How human validation calibrates semantic keyword mappings and SIF scores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center text-center mt-6 py-4">
          
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Step 01</span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">Historical Data</span>
            <span className="text-[9px] text-slate-400 mt-1 block">Baseline patterns</span>
          </div>
          
          <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-slate-300 md:rotate-0 rotate-90" /></div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Step 02</span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">AI Prediction</span>
            <span className="text-[9px] text-slate-400 mt-1 block">AI extraction</span>
          </div>

          <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-slate-300 md:rotate-0 rotate-90" /></div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Step 03</span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">HSE Review</span>
            <span className="text-[9px] text-slate-400 mt-1 block">Reviewer override</span>
          </div>

          <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-slate-300 md:rotate-0 rotate-90" /></div>

          <div className="p-3 bg-purple-50 border border-industrial-purple rounded-xl shadow-2xs">
            <span className="text-[8px] font-bold text-industrial-purple uppercase block">Step 04</span>
            <span className="text-xs font-bold text-industrial-purple mt-1 block">GATI Learning</span>
            <span className="text-[9px] text-slate-400 mt-1 block">Calibrated weights</span>
          </div>

        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reports Reviewed</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1.5 block">{data.reports_reviewed}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Corrections</span>
          <span className="text-2xl font-extrabold text-industrial-orange mt-1.5 block">{data.corrections_count}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Learning Events</span>
          <span className="text-2xl font-extrabold text-industrial-purple mt-1.5 block">{data.learning_events_count}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Calibration</span>
          <span className="text-2xl font-extrabold text-industrial-green mt-1.5 block">{data.model_improvement}</span>
        </div>

      </div>

      {/* Learning Logs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Calibration Signals Log</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Audit log of learning feedback signals injected into the semantic layer</p>
          </div>
          <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-industrial-purple uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>GATI Active weights</span>
          </span>
        </div>

        <div className="space-y-3.5">
          {data.recent_learning && data.recent_learning.length > 0 ? (
            data.recent_learning.map((log: any) => (
              <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-950">{log.event_id} Override</span>
                    <span className="text-[9.5px] text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2.5 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Review Decison Mapping</div>
                    <div className="flex items-center gap-2 mt-1 font-semibold text-slate-600">
                      <span>{log.original_prediction}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-industrial-navy">{log.reviewer_decision}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GATI Learning Signal Dispatched</div>
                    <div className="font-semibold text-industrial-purple mt-1 flex items-start gap-1.5 leading-snug">
                      <BrainCircuit className="h-4 w-4 shrink-0 mt-0.5 text-industrial-purple" />
                      <span>{log.learning_signal}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No learning event logs recorded.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
