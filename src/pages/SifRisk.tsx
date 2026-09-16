import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Flame,
  KeyRound,
  FileText,
  ShieldCheck,
  Activity,
  Layers,
  Wrench,
  AlertOctagon,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { SafetyEvent, User } from '../types';

interface SifRiskProps {
  user?: User | null;
  triggerNotification?: (msg: string) => void;
  triggerStateRefresh?: boolean;
}

interface SifAnalysisResult {
  problem_identified: string;
  issue_category: string;
  danger_level: string;
  how_dangerous: string;
  exposure_details: string;
  risk_rate: number;
  sif_probability: number;
  fatal_precursor: boolean;
  life_saving_rule: string;
  failed_barriers: string[];
  how_to_solve: {
    immediate_actions: string[];
    engineering_controls: string[];
    administrative_controls: string[];
    preventive_measures: string[];
  };
  engine_used: string;
  cerebras_key_status: string;
  site?: string;
  unit?: string;
}

const TEMPLATES = [
  {
    title: 'High-Pressure Gas Flange Leak',
    site: 'Duliajan Field',
    unit: 'Well Pad C-7',
    text: 'Leaking flange on pressurized gas line (1200 PSI) detected during routine shutdown maintenance. Hydrocarbon gas cloud visible near active welding operations. 3 workers within 5m line of fire without secondary gas detection.'
  },
  {
    title: 'Fall from Height - Tower T-4',
    site: 'Numaligarh Refinery',
    unit: 'Distillation Tower T-4',
    text: 'Two instrument technicians observed working on elevated platform at 14m elevation without dual lanyard harness attached to rated anchor points. Scaffold toe-boards missing on south edge.'
  },
  {
    title: 'Unverified LOTO on Gas Compressor',
    site: 'Jorhat Gas Station',
    unit: 'Compressor G-3',
    text: 'Maintenance crew opened manifold casing on gas compressor G-3 before electrical isolation and depressurization were completed. 3 of 6 isolation valves not padlocked. Residual pressure 45 PSI.'
  },
  {
    title: 'Confined Space Vessel Entry',
    site: 'Digboi Refinery',
    unit: 'Crude Storage Tank B-12',
    text: 'Contractor entered crude storage tank for sludge inspection without continuous multi-gas monitor testing and without standby rescue attendant stationed at manway.'
  }
];

export const SifRisk: React.FC<SifRiskProps> = ({ user, triggerNotification }) => {
  const [apiKey, setApiKey] = useState('csk-2n4rxp5r49v98wdcmyv9jt5tcwtyw6chw58mynwrcjw5vrc6');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [issueText, setIssueText] = useState(TEMPLATES[0].text);
  const [selectedSite, setSelectedSite] = useState(TEMPLATES[0].site);
  const [selectedUnit, setSelectedUnit] = useState(TEMPLATES[0].unit);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SifAnalysisResult | null>(null);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'immediate' | 'engineering' | 'admin' | 'preventive'>('immediate');

  // Fetch real events from database to allow one-click analysis
  useEffect(() => {
    fetch(apiUrl('/api/events'))
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = textToAnalyze || issueText;
    if (!text.trim()) {
      triggerNotification?.('Please enter or select a safety issue to analyze.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/sif-risk/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          api_key: apiKey.trim(),
          site: selectedSite,
          unit: selectedUnit
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        triggerNotification?.(`SIF Risk analyzed successfully using ${data.engine_used || 'Cerebras AI'}`);
      } else {
        throw new Error('Analysis request failed');
      }
    } catch {
      triggerNotification?.('Could not complete SIF analysis. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial analysis on mount
  useEffect(() => {
    handleAnalyze(TEMPLATES[0].text);
  }, []);

  const getDangerBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-500 text-white',
          border: 'border-red-600',
          ring: 'ring-red-500/30',
          desc: 'Immediate Fatality / Major Disaster Risk'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-500 text-white',
          border: 'border-orange-600',
          ring: 'ring-orange-500/30',
          desc: 'High Potential Serious Injury / Hospitalization'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500 text-white',
          border: 'border-amber-600',
          ring: 'ring-amber-500/30',
          desc: 'Moderate Injury Risk (Recordable)'
        };
      default:
        return {
          bg: 'bg-emerald-500 text-white',
          border: 'border-emerald-600',
          ring: 'ring-emerald-500/30',
          desc: 'Low Risk / First Aid'
        };
    }
  };

  const dangerStyle = result ? getDangerBadge(result.danger_level) : getDangerBadge('HIGH');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] text-white p-7 shadow-lg shadow-[#008779]/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold text-emerald-100 border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>Cerebras AI Ultra-Fast Inference Engine</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>SIF Risk Intelligence & Hazard Diagnostics</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
              Identify hidden fatality precursors, evaluate exact danger severity, calculate 0-10 risk ratings, and generate prescriptive engineering solutions before catastrophic failure occurs.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer"
            >
              <KeyRound className="h-4 w-4 text-amber-300" />
              <span>{showKeyInput ? 'Hide Key' : 'Cerebras Key'}</span>
            </button>
          </div>
        </div>

        {/* Key Configuration Tray */}
        {showKeyInput && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Cerebras API Key (csk-...)"
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/20 text-xs font-mono text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <button
              onClick={() => {
                triggerNotification?.('Cerebras API key updated for live session.');
                setShowKeyInput(false);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              Save Key
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Input & Options (Left) + SIF Diagnostics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: Issue Input & Templates (5 cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Quick Preset Templates */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Quick SIF Scenarios</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold">4 Presets</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIssueText(tpl.text);
                    setSelectedSite(tpl.site);
                    setSelectedUnit(tpl.unit);
                    handleAnalyze(tpl.text);
                  }}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#008779] hover:bg-[#E8F6F4]/40 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#008779]">
                      {tpl.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{tpl.unit}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tpl.text}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Issue Input Box */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#008779]" />
                <span>Custom Safety Observation</span>
              </span>
              {events.length > 0 && (
                <span className="text-[10px] text-emerald-600 font-bold">
                  {events.length} Live Reports Loaded
                </span>
              )}
            </div>

            {/* Existing DB Report Selector */}
            {events.length > 0 && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Or select from logged field observations:
                </label>
                <select
                  onChange={(e) => {
                    const evt = events.find(ev => ev.id === e.target.value);
                    if (evt) {
                      setIssueText(evt.description || evt.hazard || '');
                      setSelectedSite(evt.site || 'Site');
                      setSelectedUnit(evt.unit || 'Unit');
                    }
                  }}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#008779]"
                >
                  <option value="">-- Choose Live Event --</option>
                  {events.slice(0, 15).map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.report_code || ev.id} • {ev.hazard_category || ev.hazard} ({ev.site})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Site & Unit inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Site</label>
                <input
                  type="text"
                  value={selectedSite}
                  onChange={e => setSelectedSite(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  placeholder="e.g. Numaligarh Refinery"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Unit</label>
                <input
                  type="text"
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  placeholder="e.g. Distillation Tower T-4"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Describe the Incident or Hazard
              </label>
              <textarea
                rows={5}
                value={issueText}
                onChange={e => setIssueText(e.target.value)}
                placeholder="Describe what happened, equipment involved, worker location, and failed barriers..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 font-sans leading-relaxed"
              />
            </div>

            <button
              onClick={() => handleAnalyze()}
              disabled={loading}
              className="w-full py-3 bg-[#008779] hover:bg-[#007366] text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing with Cerebras AI...' : 'Run Cerebras SIF Risk Analysis'}</span>
            </button>
          </div>

        </div>

        {/* RIGHT PANEL: SIF Diagnostic Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">

          {loading ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="h-10 w-10 text-[#008779] animate-spin mx-auto" />
              <div className="text-sm font-black text-slate-800">Cerebras Neural Engine Processing...</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Evaluating energy release pathways, barrier degradation, exposure line-of-fire, and formulating OSHA/IOGP mitigation controls.
              </p>
            </div>
          ) : result ? (
            <>
              {/* 1. TOP CARDS: Danger Rating & Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                
                {/* Danger Level Card */}
                <div className={`rounded-2xl p-4.5 border ${dangerStyle.border} ${dangerStyle.bg} text-white shadow-md flex flex-col justify-between`}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-85 block">
                      Danger Severity
                    </span>
                    <div className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
                      <AlertOctagon className="h-6 w-6 shrink-0" />
                      <span>{result.danger_level}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold opacity-90 mt-2 leading-tight">
                    {dangerStyle.desc}
                  </p>
                </div>

                {/* Risk Rate Card (0 - 10) */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      SIF Risk Score
                    </span>
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="mt-1">
                    <div className="text-3xl font-black text-slate-900 font-mono-numbers">
                      {result.risk_rate}<span className="text-sm text-slate-400 font-normal"> / 10</span>
                    </div>
                    <div className="text-[11px] font-bold text-orange-600 mt-0.5">
                      {result.sif_probability}% Fatal Potential
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, result.risk_rate * 10)}%` }}
                    />
                  </div>
                </div>

                {/* Life-Saving Rule Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      IOGP Rule Triggered
                    </span>
                    <ShieldCheck className="h-4 w-4 text-[#008779]" />
                  </div>
                  <div className="mt-1">
                    <div className="text-sm font-black text-slate-900 line-clamp-2">
                      {result.life_saving_rule}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                      {result.fatal_precursor ? (
                        <>
                          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 inline" />
                          <span className="text-amber-700 font-semibold">Precursor Confirmed</span>
                        </>
                      ) : (
                        'Non-fatal observation'
                      )}
                    </div>
                  </div>
                  <span className="text-[9.5px] font-bold text-[#008779] bg-[#E8F6F4] px-2 py-0.5 rounded-md inline-block mt-2">
                    Enforce Protocol
                  </span>
                </div>
              </div>

              {/* 2. PROBLEM IDENTIFICATION & WHY IT IS DANGEROUS */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hazard Diagnostic</span>
                    <h3 className="text-sm font-black text-slate-900 mt-0.5">{result.problem_identified}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                    {result.issue_category}
                  </span>
                </div>

                {/* How Dangerous Details */}
                <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-red-900">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>How Dangerous & Fatality Potential:</span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed font-medium">
                    {result.how_dangerous}
                  </p>
                </div>

                {/* Exposure Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Line-of-Fire & Exposure Zone:
                    </span>
                    <p className="text-slate-700 font-medium leading-snug">
                      {result.exposure_details}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Failed Critical Barriers:
                    </span>
                    <ul className="space-y-1">
                      {result.failed_barriers?.map((barr, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                          <span>{barr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. HOW TO SOLVE THE ISSUE (PRESCRIBED ACTIONS) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Wrench className="h-4 w-4 text-[#008779]" />
                      <span>How to Solve & Prevent This Issue</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Hierarchy of controls prescribed by Cerebras SIF risk intelligence engine.
                    </p>
                  </div>

                  {/* Tabs for different control types */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveTab('immediate')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                        activeTab === 'immediate' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Immediate Stop
                    </button>
                    <button
                      onClick={() => setActiveTab('engineering')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                        activeTab === 'engineering' ? 'bg-[#008779] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Engineering
                    </button>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                        activeTab === 'admin' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Procedures
                    </button>
                    <button
                      onClick={() => setActiveTab('preventive')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                        activeTab === 'preventive' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Preventive
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-2.5">
                  {activeTab === 'immediate' && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                        <AlertOctagon className="h-4 w-4 text-red-600" />
                        <span>Immediate On-Site Containment & Stop-Work Actions:</span>
                      </div>
                      {result.how_to_solve?.immediate_actions?.map((act, i) => (
                        <div key={i} className="p-3 bg-red-50/50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-800">
                          <span className="h-5 w-5 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'engineering' && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#008779] flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#008779]" />
                        <span>Physical Engineering Barriers & Interlocks:</span>
                      </div>
                      {result.how_to_solve?.engineering_controls?.map((act, i) => (
                        <div key={i} className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-800">
                          <span className="h-5 w-5 rounded-full bg-[#008779] text-white font-black flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'admin' && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-slate-700" />
                        <span>Administrative Controls & Permitting:</span>
                      </div>
                      {result.how_to_solve?.administrative_controls?.map((act, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-800">
                          <span className="h-5 w-5 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'preventive' && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        <span>Long-Term Systemic Prevention:</span>
                      </div>
                      {result.how_to_solve?.preventive_measures?.map((act, i) => (
                        <div key={i} className="p-3 bg-indigo-50/40 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-800">
                          <span className="h-5 w-5 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer status metadata */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      <Cpu className="h-3 w-3" />
                      {result.engine_used}
                    </span>
                    <span>{result.cerebras_key_status}</span>
                  </div>
                  <span>Location: {result.site || selectedSite} • {result.unit || selectedUnit}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400">
              Select a scenario or write an issue to run SIF analysis.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
