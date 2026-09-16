import React from 'react';
import { Brain, Sparkles, CheckCircle2, RotateCw } from 'lucide-react';

interface GatiEnginePanelProps {
  metrics: {
    reportsReviewed: number;
    correctionsCount: number;
    learningEventsCount: number;
    modelImprovement: string;
  };
  recentSignal?: string;
}

export const GatiEnginePanel: React.FC<GatiEnginePanelProps> = ({ metrics, recentSignal }) => {
  const gatiLayers = [
    { name: 'Data Model', desc: 'Enterprise HSE Schema' },
    { name: 'Semantic Layer', desc: 'Keyword & Weight mapping' },
    { name: 'Context Engine', desc: 'L1-L6 Refinery mapping' },
    { name: 'Event Linking', desc: 'Aggregates precursor patterns' },
    { name: 'Governance Layer', desc: 'Compliance & SLA Tracking' },
    { name: 'Assurance', desc: 'Audit trail and confidence checks' },
    { name: 'Analytics API', desc: 'Sif Intelligence distribution' },
    { name: 'Integration', desc: 'Connectors to SAP / Maximo' },
    { name: 'Continuous Learning', desc: 'Reviewer-feedback loop', highlight: true }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col lg:flex-row gap-6">
      {/* Architecture Panel */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-industrial-purple" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">GATI Engine Architecture</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Governance-Aware Tracking & Intelligence (GATI) serves as the core semantic and learning framework.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {gatiLayers.map((layer, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border text-center transition-all ${
                layer.highlight 
                  ? 'bg-purple-50 border-industrial-purple text-industrial-purple ring-1 ring-industrial-purple/20' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold leading-tight">{layer.name}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{layer.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Status Panel */}
      <div className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">GATI Learning Core</span>
            <span className="flex items-center gap-1 text-[10px] text-industrial-purple font-semibold bg-purple-100/60 px-2 py-0.5 rounded border border-purple-200">
              <Sparkles className="h-3 w-3" />
              <span>Active</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">Model Calibration</div>
              <div className="text-lg font-extrabold text-industrial-purple mt-0.5">{metrics.modelImprovement}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">Learning Signals</div>
              <div className="text-lg font-extrabold text-slate-800 mt-0.5">{metrics.learningEventsCount}</div>
            </div>
          </div>

          <div className="text-xs space-y-2.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>HSE Reviews Ingested:</span>
              <span className="font-semibold text-slate-800">{metrics.reportsReviewed}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Reviewer Corrections:</span>
              <span className="font-semibold text-slate-800">{metrics.correctionsCount}</span>
            </div>
          </div>
        </div>

        {recentSignal && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
              <RotateCw className="h-2.5 w-2.5 animate-spin" />
              <span>Latest Calibration Signal</span>
            </div>
            <div className="text-[10px] text-slate-700 bg-white border border-slate-200 rounded p-2 italic leading-tight">
              {recentSignal}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
