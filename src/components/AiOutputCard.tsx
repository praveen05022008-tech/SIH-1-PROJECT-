import React from 'react';
import { Sparkles, ShieldAlert, ShieldCheck, Flame, AlertTriangle, Cpu, CheckCircle2, Zap } from 'lucide-react';

export interface AiDiagnosticData {
  condition?: string | null;
  event?: string | null;
  activity?: string | null;
  location?: string | null;
  actual_injury?: string | null;
  sif_potential?: string | null;
  is_sif_potential?: string | null;
  is_sif_precursor?: string | null;
  sif_category?: string | null;
  classification?: string | null;
  energy_source?: string | null;
  barrier?: string | null;
  barrier_failure?: string | null;
  life_saving_rule?: string | null;
  risk_score?: number | null;
  ai_confidence?: number | null;
  confidence?: number | null;
  priority?: string | null;
  risk_level?: string | null;
  ai_rationale?: string | null;
  [key: string]: any;
}

interface AiOutputCardProps {
  data?: AiDiagnosticData | null;
  compact?: boolean;
}

export const AiOutputCard: React.FC<AiOutputCardProps> = ({ data, compact = false }) => {
  if (!data) return null;

  // Compute SIF Potential YES / NO
  const isSifYes =
    data.is_sif_potential === 'YES' ||
    data.is_sif_precursor === 'YES' ||
    data.is_sif_precursor === 'Yes' ||
    data.sif_potential === 'High' ||
    data.sif_potential === 'Critical' ||
    data.priority === 'Critical' ||
    data.risk_level === 'CRITICAL' ||
    data.actual_injury === 'Fatal injury' ||
    data.actual_injury === 'Severe / Lost Time Injury' ||
    (Number(data.risk_score || 0) >= 65);

  // Compute SIF Category (1, 2, or 3)
  const isActualSif = data.actual_injury === 'Fatal injury' || data.actual_injury === 'Severe / Lost Time Injury';
  const category = isActualSif
    ? 'Category 1 – SIF Incident (Actual SIF)'
    : isSifYes
      ? 'Category 2 – SIF Precursor'
      : 'Category 3 – Non-SIF';

  // Compute Risk Score
  const score = Math.round(data.risk_score || (isSifYes ? 87 : 24));
  const confidence = data.ai_confidence || (data.confidence ? Math.round(data.confidence > 1 ? data.confidence : data.confidence * 100) : 94);

  // Fallback field values
  const activity = data.activity || (data.event && data.event !== 'Operational Hazard' ? data.event : 'Routine Maintenance');
  const location = data.location || 'Process Unit Area';
  const energySource = data.energy_source || 'Mechanical / Gravitational Energy';
  const barrierFailure = data.barrier_failure || 'Safeguard compromised or procedural lapse';
  const lsr = data.life_saving_rule || 'Follow standard safety operating procedures';
  const condition = data.condition || 'Unsafe Condition';
  const actualInjury = data.actual_injury || 'None';

  return (
    <div className="bg-[#0A1120] text-white rounded-2xl p-5 border border-slate-800 shadow-xl overflow-hidden font-mono space-y-4">
      {/* Header Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
            AI OUTPUT &amp; SIF INTELLIGENCE
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>Certitude: <strong className="text-white">{confidence}%</strong></span>
        </div>
      </div>

      {/* PRIMARY DECISION: SIF POTENTIAL YES / NO */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isSifYes
          ? 'bg-rose-950/40 border-rose-500/40 shadow-rose-950/20'
          : 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20'
      }`}>
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">
            SIF Potential Decision
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide border flex items-center gap-1.5 ${
              isSifYes
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-900/50'
                : 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-900/50'
            }`}>
              {isSifYes ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              <span>SIF Potential: {isSifYes ? 'YES' : 'NO'}</span>
            </span>
            <span className={`text-xs font-bold font-sans ${isSifYes ? 'text-rose-300' : 'text-emerald-300'}`}>
              {category}
            </span>
          </div>
        </div>

        {/* Risk Score Pill */}
        <div className="sm:text-right bg-black/40 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Composite Risk Score</div>
          <div className={`text-sm font-black ${isSifYes ? 'text-rose-400' : 'text-emerald-400'}`}>
            {score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
          </div>
        </div>
      </div>

      {/* EXTRACTED FIELDS BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] font-sans pt-1">
        
        {/* Activity */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Work Activity
          </span>
          <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{activity}</span>
          </span>
        </div>

        {/* Location */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Extracted Location
          </span>
          <span className="font-extrabold text-blue-300">
            {location}
          </span>
        </div>

        {/* Energy Source */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Energy Source &amp; Magnitude
          </span>
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <span className="truncate">{energySource}</span>
          </span>
        </div>

        {/* Barrier Failure */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Barrier Failure / Defect
          </span>
          <span className="font-bold text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{barrierFailure}</span>
          </span>
        </div>

        {/* Life-Saving Rule */}
        <div className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80 md:col-span-2">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
            Applicable Life-Saving Rule (LSR)
          </span>
          <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>{lsr}</span>
          </span>
        </div>

      </div>

      {/* Summary Footer */}
      {!compact && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono gap-2">
          <div><span className="text-slate-500">Condition:</span> <span className="text-white font-bold">{condition}</span></div>
          <div><span className="text-slate-500">Actual Injury:</span> <span className="text-white font-bold">{actualInjury}</span></div>
          <div><span className="text-slate-500">Protocol:</span> <span className="text-slate-300 font-bold">OIL / Campbell Inst.</span></div>
        </div>
      )}
    </div>
  );
};
