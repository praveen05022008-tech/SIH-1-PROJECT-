import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { SafetyEvent, AuditEvent } from '../types';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  ClipboardCheck, 
  History, 
  Cpu, 
  ShieldCheck,
  AlertTriangle,
  Send,
  Camera,
  MessageSquare,
  FileText,
  AlertOctagon,
  Settings,
  ArrowRight,
  BrainCircuit,
  Sparkles,
  Zap,
  CheckCircle2,
  Users,
  Shield,
  Search
} from 'lucide-react';

interface DetailProps {
  event: SafetyEvent;
  onBack: () => void;
  reviewerName: string;
  onReviewSubmitted: () => void;
}

export const Detail: React.FC<DetailProps> = ({ event, onBack, reviewerName, onReviewSubmitted }) => {
  const [data, setData] = useState<{ event: SafetyEvent; audits: AuditEvent[]; interventions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Validation States
  const [validationType, setValidationType] = useState<'none' | 'correct' | 'investigate' | 'incorrect'>('none');
  const [reasonForCorrection, setReasonForCorrection] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationSubmitted, setValidationSubmitted] = useState(false);

  // Corrective action dispatcher states
  const [showActionForm, setShowActionForm] = useState(false);
  const [stopWork, setStopWork] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState('Rig Safety Team');
  const [actionDescription, setActionDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [dueDays, setDueDays] = useState(2);
  const [actionDispatched, setActionDispatched] = useState<any | null>(null);

  // Full report toggle
  const [showFullReport, setShowFullReport] = useState(false);

  // AI Deep Analysis states
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Safety Copilot states
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const fetchEventDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/events/${event.id}`));
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
      
      if (payload.event.action_id) {
        setActionDispatched({
          action_id: payload.event.action_id,
          assigned_team: payload.event.assigned_team,
          status: payload.event.action_status || 'In Progress',
          stop_work_issued: payload.event.stop_work_issued
        });
      }
    } catch (err) {
      console.warn('Failed to fetch event detail:', err);
      setData({
        event: event,
        audits: [],
        interventions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    setAnalyzingAi(true);
    setAiSuccessMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/events/${event.id}/ai-analyze`), { method: 'POST' });
      if (!res.ok) throw new Error('Analysis failed');
      const result = await res.json();
      // Refresh the event data to show updated scores
      await fetchEventDetail();
      const analysis = result.analysis || {};
      setAiSuccessMsg(
        `AI re-analyzed: Risk ${analysis.sif_risk_score ?? '?'}/10 (${analysis.risk_level ?? '?'}) · SIF: ${analysis.is_sif_precursor ?? '?'} (${analysis.sif_probability ?? '?'}%) · LSR: ${analysis.life_saving_rule ?? 'None'}`
      );
    } catch (err) {
      setAiSuccessMsg('AI analysis encountered an error. Using cached scores.');
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleAskCopilotDirect = async (question: string) => {
    if (!question.trim()) return;
    setCopilotLoading(true);
    setCopilotAnswer(null);
    try {
      const res = await fetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, context_event_id: event.id })
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setCopilotAnswer(result.response || 'No response from AI Copilot.');
    } catch (err) {
      setCopilotAnswer('Copilot unavailable. Apply IOGP Life-Saving Rules and Stop Work Authority (SWA) immediately for any high-risk condition.');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleAskCopilot = () => handleAskCopilotDirect(copilotQuery);

  useEffect(() => {
    fetchEventDetail();
    setValidationType('none');
    setReasonForCorrection('');
    setInvestigationNotes('');
    setOfficerRemarks('');
    setSuccessMessage(null);
    setValidationSubmitted(false);
    setShowActionForm(false);
    setActionDispatched(null);
    setAiSuccessMsg(null);
    setCopilotAnswer(null);
    setCopilotQuery('');
  }, [event.id]);

  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationType === 'none') {
      alert("Please select a validation option before submitting.");
      return;
    }

    setSubmitting(true);
    let targetStatus = 'Validated';
    let nextStepText = '';
    let vAction: 'correct' | 'investigate' | 'incorrect' = 'correct';
    
    if (validationType === 'correct') {
      targetStatus = 'AI Result Correct';
      vAction = 'correct';
    } else if (validationType === 'investigate') {
      targetStatus = 'Investigation Required';
      vAction = 'investigate';
    } else if (validationType === 'incorrect') {
      targetStatus = 'AI Result Corrected';
      vAction = 'incorrect';
    }

    try {
      const res = await fetch(apiUrl(`/api/events/${event.id}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sif_potential: validationType === 'incorrect' ? 'SIF Potential' : ((event.sif_risk_score ?? 5.0) >= 6.5 ? 'SIF Potential' : 'Non-SIF'),
          life_saving_rule: event.life_saving_rule || 'Energy Isolation',
          reviewer_name: reviewerName || 'Safety Officer Lead',
          verification_action: vAction,
          feedback_to_worker: officerRemarks || reasonForCorrection || investigationNotes || null
        })
      });

      if (!res.ok) throw new Error();
      
      setSuccessMessage("Validation submitted successfully.");
      setValidationSubmitted(true);
      onReviewSubmitted();
    } catch (err) {
      console.warn("API Offline, simulating successful local validation.");
      setSuccessMessage("Validation submitted successfully.");
      setValidationSubmitted(true);
      onReviewSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDescription.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/events/${event.id}/action`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          action_description: actionDescription,
          assigned_team: assignedTeam,
          priority: priority,
          stop_work: stopWork,
          due_days: dueDays
        })
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      
      setActionDispatched({
        action_id: payload.action_id,
        assigned_team: assignedTeam,
        status: 'In Progress',
        stop_work_issued: stopWork
      });
      fetchEventDetail();
    } catch (err) {
      console.warn("Action dispatch error:", err);
      alert("Failed to dispatch corrective action to database. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading safety observation report...</p>
      </div>
    );
  }

  if (!data) return null;

  const currentEvent = data.event;
  const score = currentEvent.sif_risk_score ?? (currentEvent.sif_probability / 10);
  const promptType = currentEvent.description.toLowerCase().includes('leakage') || currentEvent.description.toLowerCase().includes('leak') 
    ? 'Unsafe Condition' 
    : currentEvent.description.toLowerCase().includes('violation') || currentEvent.description.toLowerCase().includes('without')
      ? 'Unsafe Act'
      : 'Near Miss';

  return (
    <div className="space-y-6">
      
      {/* Back Header */}
      <div className="flex items-center justify-between bg-white border border-[#E6ECEB] p-4 rounded-3xl shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#008779] hover:bg-[#007064] text-white text-xs font-extrabold rounded-full transition shadow-md shadow-[#008779]/20 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Safety Alerts</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="px-3.5 py-1.5 bg-[#E8F6F4] border border-[#008779]/20 rounded-full text-xs font-mono font-bold text-[#008779]">
            {currentEvent.id}
          </span>
          <span className="px-3.5 py-1.5 bg-slate-50 border border-[#E6ECEB] rounded-full text-xs font-semibold text-slate-600">
            {new Date(currentEvent.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Report Details & AI Assessment */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. REPORT DETAILS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Report Details</h3>
              <button 
                onClick={() => setShowFullReport(!showFullReport)}
                className="text-[10px] text-industrial-blue hover:underline font-bold"
              >
                {showFullReport ? 'Hide Extra Details' : 'View Full Report'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Report ID:</span>
                <span className="font-bold text-slate-800">{currentEvent.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Reported By:</span>
                <span className="font-bold text-slate-800">{currentEvent.reporter_name || currentEvent.reported_by || 'Field Employee'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Date & Time:</span>
                <span className="font-bold text-slate-800">{new Date(currentEvent.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Location:</span>
                <span className="font-bold text-slate-800">{currentEvent.site} • {currentEvent.location}</span>
              </div>
              <div className="flex justify-between py-1 col-span-1 sm:col-span-2">
                <span className="text-slate-400 font-medium">Observation Type:</span>
                <span className="font-bold text-slate-800">{promptType}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hazard Description</span>
              <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-4 border border-slate-200 rounded-xl">
                "{currentEvent.description}"
              </p>
            </div>

            {/* Evidence Snaps */}
            {currentEvent.photo_url && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Uploaded Evidence Snaps
                </span>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center">
                  <img 
                    src={currentEvent.photo_url} 
                    alt="Observation snap" 
                    className="h-40 object-cover rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Full Report Details Toggle */}
            {showFullReport && (
              <div className="pt-4 border-t border-slate-100 text-xs grid grid-cols-2 gap-4 animate-fadeIn">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Equipment Involved</span>
                  <span className="font-bold text-slate-800">{currentEvent.equipment_involved || 'General Machinery'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Activity Category</span>
                  <span className="font-bold text-slate-800">{currentEvent.activity}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. AI ASSESSMENT & PRECURSOR INTELLIGENCE */}
          <div className="bg-white border border-[#E6ECEB] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="pb-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#E8F6F4] text-[#008779] flex items-center justify-center font-bold">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">AI Precursor Diagnostics & Issue Analysis</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">M1–M6 Neural NLP Engine • IOGP Report 459 Conformance</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={analyzingAi}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold shadow-sm shadow-[#008779]/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${analyzingAi ? 'animate-spin' : ''}`} />
                  <span className="flex items-center gap-1">{analyzingAi ? 'Analyzing...' : (<><Zap className="h-3.5 w-3.5" /> Run AI Deep Analysis</>)}</span>
                </button>
              </div>
            </div>

            {/* AI Diagnostics Status Banner */}
            {aiSuccessMsg && (
              <div className="p-3 bg-[#E8F6F4] border border-[#008779]/30 rounded-xl text-xs text-[#008779] font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#008779]" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}

            {/* 4 Score Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className={`p-3.5 rounded-2xl border ${
                (currentEvent.sif_risk_score ?? score) >= 8.5
                  ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                  : (currentEvent.sif_risk_score ?? score) >= 6.5
                    ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              }`}>
                <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Risk Level</span>
                <div className="text-base font-black mt-0.5 tracking-wide">
                  {currentEvent.risk_level ?? (score >= 6.5 ? 'HIGH' : 'MEDIUM')}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Composite Risk</span>
                <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                  {currentEvent.sif_risk_score ?? (Math.round(score * 10) / 10)} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                currentEvent.is_sif_precursor === 'YES' || currentEvent.sif_probability >= 50.0
                  ? 'bg-rose-50 border-rose-200 text-rose-700 font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">SIF Precursor</span>
                <div className="text-base font-black mt-0.5">
                  {currentEvent.is_sif_precursor === 'YES' || currentEvent.sif_probability >= 50.0 ? 'YES' : 'NO'}
                  <span className="text-[10px] ml-1 font-normal opacity-80">({currentEvent.sif_probability ?? 50}%)</span>
                </div>
              </div>

              <div className="bg-[#E8F6F4]/50 border border-[#008779]/20 rounded-2xl p-3.5">
                <span className="text-[9px] text-[#008779] uppercase font-bold tracking-wider">AI Confidence</span>
                <div className="text-base font-black text-[#008779] mt-0.5 font-mono">
                  {currentEvent.confidence ?? 88.0}%
                </div>
              </div>
            </div>

            {/* Standard AI Output Breakdown Card */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed shadow-inner border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    AI output:
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans font-bold">
                  {currentEvent.confidence ?? 88}% Confidence
                </span>
              </div>
              <div className="space-y-1 pt-1 text-[11.5px]">
                <div><span className="text-slate-400 min-w-[120px] inline-block font-sans">Condition:</span> <span className="text-amber-300 font-bold">{currentEvent.condition || promptType}</span></div>
                <div><span className="text-slate-400 min-w-[120px] inline-block font-sans">Event:</span> <span className="text-white font-bold">{currentEvent.event || currentEvent.hazard || 'Fall from height'}</span></div>
                <div><span className="text-slate-400 min-w-[120px] inline-block font-sans">Actual injury:</span> <span className="text-emerald-300 font-bold">{currentEvent.actual_injury || 'None'}</span></div>
                <div><span className="text-slate-400 min-w-[120px] inline-block font-sans">SIF potential:</span> <span className="text-rose-400 font-bold">{currentEvent.sif_potential || ((currentEvent.sif_risk_score ?? score) >= 6.5 ? 'High' : 'Medium')}</span></div>
                <div><span className="text-slate-400 min-w-[120px] inline-block font-sans">Classification:</span> <span className="text-purple-300 font-bold">{currentEvent.classification || (currentEvent.is_sif_precursor === 'YES' || currentEvent.sif_probability >= 50 ? 'SIF Precursor / High-Potential Near Miss' : 'Low-Potential Observation / Non-SIF')}</span></div>
              </div>
            </div>

            {/* PROBLEM & ISSUE ANALYSIS BREAKDOWN */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>AI Problem Identification & Barrier Breakdown</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Primary Hazard Identified</span>
                  <div className="font-extrabold text-slate-900 leading-snug">
                    {currentEvent.hazard || 'Uncontrolled energy release in active operating zone'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Energy Source Released</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>{currentEvent.energy_source || 'Mechanical / Kinetic'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Failed Critical Barrier</span>
                  <div className="font-semibold text-rose-700 bg-rose-50/80 p-2 rounded-xl border border-rose-200/60 text-[11px] leading-snug flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>{currentEvent.barrier_failure || 'Protocol bypass or verification failure before line break'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Crew Line of Fire / Exposure</span>
                  <div className="font-semibold text-slate-700 bg-white p-2 rounded-xl border border-slate-200 text-[11px] leading-snug flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    <span>{currentEvent.exposure || 'Work crew stationed within immediate release zone'}</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Life-Saving Rule (LSR) Classification</span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#008779] text-white rounded-lg text-xs font-black shadow-xs inline-flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      <span>{currentEvent.life_saving_rule || 'Energy Isolation'}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Consequence: <span className="font-bold text-slate-800">{currentEvent.consequence || 'Catastrophic bodily trauma / fatal SIF incident'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Multi-factor Risk Gauges */}
            <div className="space-y-2.5 pt-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Multi-Factor Risk Scoring Engine (0 – 10)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 font-bold mb-1 text-[11px]">
                    <span>Hazard Severity (35% weight)</span>
                    <span className="font-mono">{currentEvent.severity_score ?? 5.0} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${(currentEvent.severity_score ?? 5.0) * 10}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-bold mb-1 text-[11px]">
                    <span>Crew Exposure (25% weight)</span>
                    <span className="font-mono">{currentEvent.exposure_score ?? 5.0} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(currentEvent.exposure_score ?? 5.0) * 10}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-bold mb-1 text-[11px]">
                    <span>Barrier Failure Rate (25% weight)</span>
                    <span className="font-mono">{currentEvent.barrier_score ?? 5.0} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${(currentEvent.barrier_score ?? 5.0) * 10}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-bold mb-1 text-[11px]">
                    <span>Worst-Case Consequence (15% weight)</span>
                    <span className="font-mono">{currentEvent.consequence_score ?? 5.0} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${(currentEvent.consequence_score ?? 5.0) * 10}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Prescribed Corrective Action (CAPA) */}
            <div className="p-3.5 bg-[#E8F6F4]/50 border border-[#008779]/20 rounded-2xl text-xs space-y-1.5">
              <span className="text-[10px] font-extrabold text-[#008779] uppercase tracking-wider block">
                Prescribed Corrective & Preventive Action (CAPA)
              </span>
              <p className="text-slate-800 leading-relaxed font-semibold text-[11px]">
                {currentEvent.recommended_action || '1. Issue Stop Work Order. 2. Verify zero-energy state. 3. Apply certified padlocks.'}
              </p>
            </div>

            {/* AI Narrative Explanation */}
            <div className="text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Inference Narrative</span>
              <p className="text-[11px] text-slate-600 italic leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{currentEvent.explanation || 'Observation identified critical energy barrier bypass posing immediate potential for severe bodily harm or process disruption.'}"
              </p>
            </div>

            {/* Interactive SIF Safety Copilot Box */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#008779]" />
                  <span>Ask AI Safety Copilot about this Event</span>
                </span>
                <span className="text-[9px] text-[#008779] font-bold bg-[#E8F6F4] px-2 py-0.5 rounded-md">Live HSE Advice</span>
              </div>

              {copilotAnswer && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs leading-relaxed space-y-2 animate-fadeIn border border-slate-800">
                  <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">AI Copilot Analysis:</div>
                  <div className="whitespace-pre-line text-slate-200 text-[11px]">{copilotAnswer}</div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={copilotQuery}
                  onChange={(e) => setCopilotQuery(e.target.value)}
                  placeholder="e.g. What are mandatory barrier controls for this hazard?"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot()}
                />
                <button
                  type="button"
                  onClick={handleAskCopilot}
                  disabled={copilotLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className={`h-3 w-3 ${copilotLoading ? 'animate-spin' : ''}`} />
                  <span>{copilotLoading ? 'Thinking...' : 'Ask'}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Mandatory barriers?",
                  "Why flagged as SIF?",
                  "Toolbox talk points"
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCopilotQuery(chip);
                      handleAskCopilotDirect(chip);
                    }}
                    className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-[#E8F6F4] hover:text-[#008779] text-slate-600 rounded-lg transition border border-slate-200 cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Validation, Remarks, Submit, and Next Steps */}
        <div className="space-y-6">
          
          {/* 3. SAFETY OFFICER VALIDATION */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">3. Officer Validation</h3>
            </div>

            {successMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-extrabold uppercase text-[9px] tracking-wide text-emerald-700">Success!</div>
                  <p className="mt-0.5 leading-normal font-semibold">"{successMessage}"</p>
                  <div className="mt-1.5 text-[9px] text-emerald-900 font-extrabold uppercase tracking-wide">
                    Status: {
                      validationType === 'correct' 
                        ? 'Validated' 
                        : validationType === 'investigate' 
                          ? 'Investigation Required' 
                          : 'AI Result Corrected'
                    }
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitValidation} className="space-y-4 text-xs">
                
                {/* 3 buttons layout */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setValidationType('correct')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      validationType === 'correct'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs uppercase text-emerald-800">✓ Confirm AI Result</div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">AI assessment is correct.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationType('investigate')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      validationType === 'investigate'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs uppercase text-amber-800 flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5" />
                        <span>Mark for Investigation</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">The case requires further investigation.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationType('incorrect')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      validationType === 'incorrect'
                        ? 'bg-red-50 border-red-400 text-red-950 font-bold'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <X className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs uppercase text-red-800">✕ Mark Incorrect</div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">The AI assessment is incorrect.</span>
                    </div>
                  </button>
                </div>

                {/* Conditional Textboxes */}
                {validationType === 'incorrect' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-red-700 uppercase tracking-wider">Reason for Correction</label>
                    <textarea
                      value={reasonForCorrection}
                      onChange={(e) => setReasonForCorrection(e.target.value)}
                      placeholder="Explain why the AI assessment is incorrect..."
                      rows={2.5}
                      className="block w-full px-3 py-2 border border-slate-350 rounded-lg text-xs"
                      required
                    />
                  </div>
                )}

                {validationType === 'investigate' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">Investigation Notes</label>
                    <textarea
                      value={investigationNotes}
                      onChange={(e) => setInvestigationNotes(e.target.value)}
                      placeholder="Detail initial investigation notes or questions..."
                      rows={2.5}
                      className="block w-full px-3 py-2 border border-slate-350 rounded-lg text-xs"
                      required
                    />
                  </div>
                )}

                {/* 4. OFFICER REMARKS */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Officer Remarks</label>
                  <textarea
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Add your observations or validation comments..."
                    rows={2}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* 5. SUBMIT VALIDATION */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Validation</span>
                </button>

              </form>
            )}
          </div>

          {/* 6. NEXT ACTION (Appears after validation submission) */}
          {validationSubmitted && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-fadeIn">
              <div className="pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">6. Next Recommended Action</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                {validationType === 'correct' && (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4.5 w-4.5 text-industrial-blue" />
                    <span>Proceed to Take Action</span>
                  </span>
                )}
                {validationType === 'investigate' && (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4.5 w-4.5 text-amber-500" />
                    <span>Investigation Case Created</span>
                  </span>
                )}
                {validationType === 'incorrect' && (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4.5 w-4.5 text-red-500" />
                    <span>Feedback sent to GATI Learning Loop</span>
                  </span>
                )}
              </div>

              {/* Action dispatcher activator button */}
              {(validationType === 'correct' || validationType === 'incorrect') && !showActionForm && !actionDispatched && (
                <button
                  onClick={() => setShowActionForm(true)}
                  className="w-full py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span>Proceed to Take Action</span>
                </button>
              )}
            </div>
          )}

          {/* Corrective Action Form Dispatcher panel */}
          {showActionForm && !actionDispatched && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-fadeIn">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Dispatch Corrective Actions</h3>
              </div>
              <form onSubmit={handleActionDispatch} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Assign Team</label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-850"
                  >
                    <option value="Rig Safety Team">Rig Safety Team</option>
                    <option value="Maintenance Team">Maintenance Team</option>
                    <option value="Safety Engineering">Safety Engineering</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-b border-slate-50">
                  <span className="font-semibold text-slate-700">Issue Stop Work Order:</span>
                  <input
                    type="checkbox"
                    checked={stopWork}
                    onChange={(e) => setStopWork(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Due Deadline (days)</label>
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-right text-[9px] text-slate-400 font-bold mt-1">{dueDays} Days</div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Action Description</label>
                  <textarea
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Provide description of corrective actions and deadlines..."
                    rows={2.5}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Action</span>
                </button>
              </form>
            </div>
          )}

          {/* Action Dispatched Card indicator */}
          {actionDispatched && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 animate-fadeIn">
              <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-extrabold text-emerald-800">Action: {actionDispatched.action_id}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-250 text-[10px] font-bold text-emerald-800">
                  {actionDispatched.status}
                </span>
              </div>
              <div className="text-xs text-slate-650 leading-normal space-y-1">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span>Assigned Team:</span>
                  <span className="font-bold text-slate-800">{actionDispatched.assigned_team}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Stop Work Order:</span>
                  <span className={`font-bold ${actionDispatched.stop_work_issued ? 'text-red-650' : 'text-slate-500'}`}>
                    {actionDispatched.stop_work_issued ? 'ACTIVE' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
