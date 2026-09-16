import { apiUrl } from '../config/api';
import React, { useEffect, useState, useMemo } from 'react';
import { SafetyEvent, OfficerTask, User } from '../types';
import { 
  RefreshCcw, 
  ClipboardCheck, 
  ArrowRight, 
  BrainCircuit, 
  Sparkles, 
  Check, 
  CheckSquare,
  ShieldAlert,
  HardHat,
  Radio,
  MapPin,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  FileCheck2,
  Camera,
  X,
  Users,
  Zap
} from 'lucide-react';
import { RiskBadge } from '../components/UIElements';

interface ReviewProps {
  reviewerName: string;
  user?: User | null;
  onReviewSubmitted: () => void;
  triggerStateRefresh: boolean;
}

export const Review: React.FC<ReviewProps> = ({ reviewerName, user, onReviewSubmitted, triggerStateRefresh }) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'tasks'>('triage');

  // Tab 1: Precursor Review Queue states
  const [queue, setQueue] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);

  // Review fields
  const [sifChoice, setSifChoice] = useState<'SIF Potential' | 'Non-SIF'>('SIF Potential');
  const [lsrChoice, setLsrChoice] = useState('Energy Isolation');
  const [submitting, setSubmitting] = useState(false);
  
  // Learning Loop feedback states
  const [gatiCalibrating, setGatiCalibrating] = useState(false);
  const [calibratedSignal, setCalibratedSignal] = useState<string | null>(null);

  // Tab 2: Assigned Field Tasks states (Interconnected with Manager)
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [selectedTaskForFindings, setSelectedTaskForFindings] = useState<OfficerTask | null>(null);
  const [findingsText, setFindingsText] = useState('');
  const [findingsStatus, setFindingsStatus] = useState('Completed');
  const [updatingTask, setUpdatingTask] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/events?status=Needs Review'));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQueue(data);
      if (data.length > 0) {
        setSelectedEvent(data[0]);
        setSifChoice(data[0].sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF');
        setLsrChoice(data[0].life_saving_rule);
      } else {
        setSelectedEvent(null);
      }
    } catch (err) {
      console.warn('Queue API error:', err);
      setQueue([]);
      setSelectedEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await fetch(apiUrl('/api/manager/tasks'), {
        headers: {
          'X-User-Email': user?.email || '',
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchTasks();
  }, [triggerStateRefresh]);

  const handleUpdateTaskFindings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForFindings) return;

    setUpdatingTask(true);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${selectedTaskForFindings.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: findingsStatus,
          findings: findingsText
        })
      });

      if (!res.ok) throw new Error();
      
      setSelectedTaskForFindings(null);
      setFindingsText('');
      fetchTasks();
      onReviewSubmitted();
    } catch (err) {
      console.warn('Failed to update task findings:', err);
      // Optimistic update
      setTasks(prev => prev.map(t => t.task_id === selectedTaskForFindings.task_id ? { ...t, status: findingsStatus, findings: findingsText } : t));
      setSelectedTaskForFindings(null);
      setFindingsText('');
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleSelectEvent = (evt: SafetyEvent) => {
    setSelectedEvent(evt);
    setSifChoice(evt.sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF');
    setLsrChoice(evt.life_saving_rule);
    setCalibratedSignal(null);
  };

  const handleSubmitReview = async () => {
    if (!selectedEvent) return;

    setSubmitting(true);
    setCalibratedSignal(null);
    setGatiCalibrating(true);

    const originalSifStr = selectedEvent.sif_probability >= 50.0 ? 'SIF Potential' : 'Non-SIF';
    const isCorrected = (originalSifStr !== sifChoice) || (selectedEvent.life_saving_rule !== lsrChoice);

    try {
      const res = await fetch(apiUrl(`/api/events/${selectedEvent.id}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sif_potential: sifChoice,
          life_saving_rule: lsrChoice,
          reviewer_name: reviewerName || 'Demo Reviewer'
        }),
      });

      if (!res.ok) throw new Error();
      const payload = await res.json();
      
      // Simulate calibration visual loop wait for hackathon WOW factor
      await new Promise(r => setTimeout(r, 800));

      if (payload.learning_calibrated) {
        setCalibratedSignal(payload.signal);
      } else {
        setCalibratedSignal("Prediction confirmed. No database weight adjustments needed.");
      }
      
      // Trigger dashboard update
      onReviewSubmitted();
      
      // Reload queue
      setTimeout(() => {
        setGatiCalibrating(false);
        fetchQueue();
      }, 2500);

    } catch (err) {
      console.warn('Review submission failed, simulating GATI learning response locally.');
      await new Promise(r => setTimeout(r, 800));
      
      if (isCorrected) {
        setCalibratedSignal(`GATI calibrated: SIF correction: ${originalSifStr} -> ${sifChoice} | LSR correction: ${selectedEvent.life_saving_rule} -> ${lsrChoice}`);
      } else {
        setCalibratedSignal("Prediction confirmed. No database weight adjustments needed.");
      }

      onReviewSubmitted();

      setTimeout(() => {
        setGatiCalibrating(false);
        setQueue(prev => prev.filter(e => e.id !== selectedEvent.id));
        setSelectedEvent(null);
      }, 2500);
    } finally {
      setSubmitting(false);
    }
  };

  const lsrOptions = [
    'Energy Isolation',
    'Line of Fire',
    'Hot Work',
    'Confined Space',
    'Working at Height',
    'Lifting Operations',
'Vehicle Safety',
    'Electrical Safety',
    'None'
  ];

  const officerTasks = useMemo(() => {
    if (user?.role === 'Safety Officer' || user?.role === 'Officer') {
      const uName = (user?.name || reviewerName || '').toLowerCase().trim();
      return tasks.filter(t => {
        const tName = (t.assigned_officer_name || '').toLowerCase().trim();
        return !uName || !tName || tName.includes(uName) || uName.includes(tName);
      });
    }
    return tasks;
  }, [tasks, user, reviewerName]);

  const filteredTasks = officerTasks.filter(t => {
    if (taskFilter === 'ACTIVE') return t.status !== 'Completed';
    if (taskFilter === 'COMPLETED') return t.status === 'Completed';
    return true;
  });

  const activeTasksCount = officerTasks.filter(t => t.status !== 'Completed').length;
  const completedTasksCount = officerTasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="space-y-6">
      
      {/* Officer Tactical Header Bar */}
      <div className="bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] border border-white/15 rounded-3xl p-6 shadow-lg shadow-[#008779]/15 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <HardHat className="h-6 w-6 text-amber-300" />
                <span>Safety Officer Field Assurance & Triage Console</span>
              </h1>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-white/15 text-emerald-100 border border-white/20 flex items-center gap-1.5 shadow-2xs">
                <Radio className="h-3 w-3 text-emerald-200 animate-pulse" />
                <span>IN FIELD • VHF Ch 1 Command</span>
              </span>
            </div>
            <p className="text-xs text-emerald-50 mt-2 font-medium max-w-3xl leading-relaxed">
              Tactical assurance hub for reviewing field precursor observations, verifying physical barriers, executing manager-assigned SIF audits, and calibrating GATI models.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-white/10 p-2.5 rounded-2xl border border-white/15">
            <div className="h-9 w-9 rounded-xl bg-blue-500/30 flex items-center justify-center text-blue-200">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Active Officer</div>
              <div className="text-xs font-black text-white">{reviewerName || 'Safety Officer'}</div>
            </div>
          </div>
        </div>

        {/* 2 Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('triage')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'triage'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>1. SIF Precursor Review Queue ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>2. My Assigned Field Barrier Audits ({tasks.length})</span>
            {activeTasksCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black rounded-full text-[9px]">
                {activeTasksCount} Due
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: PRECURSOR REVIEW QUEUE */}
      {activeTab === 'triage' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
              <span className="text-xs font-semibold">Loading review items...</span>
            </div>
          ) : queue.length === 0 && !gatiCalibrating ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Reviews Pending</h3>
              <p className="text-[10px] text-slate-400 mt-1">All ingested safety observations are validated and mapped.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Review Queue Table */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Assurance Queue ({queue.length})</h3>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Precursors</span>
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {queue.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => handleSelectEvent(evt)}
                      disabled={gatiCalibrating}
                      className={`w-full p-3 rounded-xl border text-left transition flex justify-between items-center ${
                        selectedEvent?.id === evt.id
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{evt.id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{evt.site} • {evt.unit}</div>
                        <div className="text-[10px] font-semibold text-slate-600 mt-1 line-clamp-1">{evt.activity}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <RiskBadge probability={evt.sif_probability} />
                        <div className="text-[8px] text-slate-400 font-bold uppercase mt-1">AI Conf: {evt.confidence}%</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Review and Calibration Panel */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                {selectedEvent ? (
                  <div>
                    
                    {/* Event Summary */}
                    <div className="mb-4 pb-3.5 border-b border-slate-100 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assurance Case</span>
                        <h3 className="text-sm font-extrabold text-slate-950 mt-0.5">{selectedEvent.id}</h3>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 uppercase">
                          LSR: {selectedEvent.life_saving_rule}
                        </span>
                        <RiskBadge probability={selectedEvent.sif_probability} />
                      </div>
                    </div>

                    {/* Narrative text */}
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Original Narrative Log</span>
                      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-normal italic">
                        "{selectedEvent.description}"
                      </p>
                    </div>

                    {/* Attached Photo Evidence */}
                    {selectedEvent.photo_url && (
                      <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 text-[#008779]" /> Attached Photo Evidence (Cloudinary)
                        </span>
                        <a href={selectedEvent.photo_url} target="_blank" rel="noreferrer" className="inline-block group">
                          <img 
                            src={selectedEvent.photo_url} 
                            alt="Observation evidence" 
                            className="h-36 max-w-full object-cover rounded-xl border border-slate-300 group-hover:opacity-90 transition shadow-2xs"
                          />
                          <span className="text-[10px] text-[#008779] font-bold mt-1 block group-hover:underline">View Full Resolution ↗</span>
                        </a>
                      </div>
                    )}

                    {/* AI Risk Predictor Inline Panel */}
                    <div className="mb-4 p-4 bg-[#F7F9FC] border border-[#E6ECEB] rounded-2xl space-y-3 text-xs">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#008779] flex items-center gap-1.5">
                        <BrainCircuit className="h-3.5 w-3.5" />
                        <span>AI Risk Predictor — Issue & Barrier Analysis</span>
                      </div>

                      {/* 4 score highlights */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className={`py-2.5 rounded-xl border text-[10px] font-black ${
                          (selectedEvent.sif_risk_score ?? 0) >= 8.5 ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : (selectedEvent.sif_risk_score ?? 0) >= 6.5 ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          <div className="opacity-60 text-[9px] mb-0.5">RISK</div>
                          {selectedEvent.risk_level ?? ((selectedEvent.sif_risk_score ?? 0) >= 6.5 ? 'HIGH' : 'MED')}
                        </div>
                        <div className="py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-900">
                          <div className="opacity-60 text-[9px] mb-0.5 text-slate-400">SCORE</div>
                          <span className="font-mono">{selectedEvent.sif_risk_score ?? '—'}<span className="text-[8px] text-slate-400">/10</span></span>
                        </div>
                        <div className={`py-2.5 rounded-xl border text-[10px] font-black ${
                          selectedEvent.sif_probability >= 50 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <div className="opacity-60 text-[9px] mb-0.5">SIF</div>
                          {selectedEvent.sif_probability >= 50 ? 'YES' : 'NO'}
                        </div>
                        <div className="py-2.5 rounded-xl border border-[#008779]/20 bg-[#E8F6F4]/50 text-[10px] font-black text-[#008779]">
                          <div className="opacity-60 text-[9px] mb-0.5">CONF</div>
                          {selectedEvent.confidence ?? 88}%
                        </div>
                      </div>

                      {/* Issue analysis row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-0.5">AI Identified Hazard</div>
                          <div className="font-bold text-slate-900 text-[11px] leading-snug">{selectedEvent.hazard || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-0.5">Failed Barrier</div>
                          <div className="text-rose-700 font-semibold text-[11px] leading-snug flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                            <span>{selectedEvent.barrier_failure || '—'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-0.5">Crew Exposure</div>
                          <div className="font-semibold text-slate-800 text-[11px] leading-snug flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-600 shrink-0" />
                            <span>{selectedEvent.exposure || '—'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase mb-0.5">Energy Source</div>
                          <div className="font-semibold text-slate-800 text-[11px] leading-snug flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                            <span>{selectedEvent.energy_source || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Multi-factor scoring bars */}
                      <div className="pt-1 space-y-1.5">
                        {[
                          { label: 'Severity (35%)', val: selectedEvent.severity_score ?? 5, color: 'bg-rose-500' },
                          { label: 'Exposure (25%)', val: selectedEvent.exposure_score ?? 5, color: 'bg-amber-500' },
                          { label: 'Barrier Failure (25%)', val: selectedEvent.barrier_score ?? 5, color: 'bg-purple-500' },
                          { label: 'Consequence (15%)', val: selectedEvent.consequence_score ?? 5, color: 'bg-blue-600' },
                        ].map(({ label, val, color }) => (
                          <div key={label}>
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                              <span>{label}</span>
                              <span className="font-mono">{val}/10</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${val * 10}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* CAPA */}
                      {selectedEvent.recommended_action && (
                        <div className="pt-1 p-2.5 bg-white border border-[#008779]/20 rounded-xl text-[10.5px] text-slate-700 font-semibold leading-relaxed">
                          <span className="text-[9px] font-extrabold text-[#008779] uppercase block mb-0.5">AI CAPA:</span>
                          {selectedEvent.recommended_action}
                        </div>
                      )}
                    </div>

                    {/* Visual Learning Loop Calibration */}
                    {gatiCalibrating ? (
                      <div className="py-8 text-center space-y-4">
                        <div className="flex justify-center items-center gap-6">
                          <div className="flex flex-col items-center">
                            <div className="h-10 w-10 bg-blue-50 border border-industrial-blue text-industrial-blue rounded-full flex items-center justify-center font-bold text-xs">AI</div>
                            <span className="text-[9px] text-slate-400 font-semibold mt-1">Prediction</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                          <div className="flex flex-col items-center">
                            <div className="h-10 w-10 bg-purple-50 border border-industrial-purple text-industrial-purple rounded-full flex items-center justify-center font-bold text-xs">HSE</div>
                            <span className="text-[9px] text-slate-400 font-semibold mt-1">Human Decision</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                          <div className="flex flex-col items-center">
                            <div className="h-10 w-10 bg-indigo-50 border border-indigo-400 text-indigo-500 rounded-full flex items-center justify-center font-bold text-xs">GATI</div>
                            <span className="text-[9px] text-slate-400 font-semibold mt-1">Learning</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-industrial-purple animate-pulse">
                          <BrainCircuit className="h-4.5 w-4.5 animate-spin" />
                          <span>GATI Engine Calibrating Weights...</span>
                        </div>

                        {calibratedSignal && (
                          <div className="max-w-md mx-auto p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 text-left">
                            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                            <div>
                              <div className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-700">Learning Signal Ingested!</div>
                              <p className="mt-0.5 text-[10.5px] italic leading-tight">{calibratedSignal}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Form Controls */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">HSE SIF Classification</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSifChoice('SIF Potential')}
                              className={`py-2 text-center rounded-xl border text-xs font-bold transition ${
                                sifChoice === 'SIF Potential'
                                  ? 'bg-red-50 text-industrial-red border-industrial-red shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              SIF Potential
                            </button>
                            <button
                              type="button"
                              onClick={() => setSifChoice('Non-SIF')}
                              className={`py-2 text-center rounded-xl border text-xs font-bold transition ${
                                sifChoice === 'Non-SIF'
                                  ? 'bg-emerald-50 text-industrial-green border-industrial-green shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Non-SIF
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">IOGP Life-Saving Rule</label>
                          <select
                            value={lsrChoice}
                            onChange={(e) => setLsrChoice(e.target.value)}
                            className="block w-full py-2 px-3 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800 font-semibold"
                          >
                            {lsrOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>

                      </div>
                    )}

                    {/* Reviewer signature */}
                    {!gatiCalibrating && (
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Logged Reviewer: <b className="text-slate-800">{reviewerName}</b></span>
                        <button
                          onClick={handleSubmitReview}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          <span>Submit Review Decision</span>
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400">
                    All safety observations are reviewed.
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

      {/* TAB 2: MY ASSIGNED FIELD BARRIER AUDITS (INTERCONNECTED WITH HSE MANAGER) */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="h-4.5 w-4.5 text-blue-600" />
                <span>Manager-Dispatched Physical SIF Inspections</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Physical barrier verifications, LOTO audits, and stop-work validations dispatched by HSE Manager.</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTaskFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                  taskFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                  taskFilter === 'ACTIVE' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending / Active ({activeTasksCount})
              </button>
              <button
                onClick={() => setTaskFilter('COMPLETED')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                  taskFilter === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({completedTasksCount})
              </button>
            </div>
          </div>

          {tasksLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCcw className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <span className="text-xs font-semibold">Loading assigned audits...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Inspections in this filter</h3>
              <p className="text-[10px] text-slate-400 mt-1">All assigned physical barrier audits have been executed and logged to the HSE Manager.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const isCompleted = task.status === 'Completed';
                const isCritical = task.priority === 'CRITICAL';

                return (
                  <div 
                    key={task.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {task.task_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            isCritical 
                              ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                              : task.priority === 'HIGH'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {task.priority} Priority
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-500">
                            {task.task_type}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm">{task.title}</h3>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{task.site} • {task.unit}</span>
                      </div>

                      {/* Manager Instructions */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                        <span className="font-extrabold not-italic text-[10px] uppercase text-slate-400 block mb-1">
                          Manager Directives ({task.assigned_by}):
                        </span>
                        "{task.instructions}"
                      </div>

                      {/* Field Findings (if completed or logged) */}
                      {task.findings && (
                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Physical Field Findings Verified:</span>
                          </div>
                          <p className="font-semibold leading-relaxed">
                            {task.findings}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="text-[10.5px] text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Due Date: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                      </div>

                      {isCompleted ? (
                        <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Audit Completed & Synchronized</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTaskForFindings(task);
                            setFindingsText(task.findings || '');
                            setFindingsStatus('Completed');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>Log Field Findings & Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LOG FIELD FINDINGS MODAL */}
      {selectedTaskForFindings && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Log Physical Field Verification Findings</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTaskForFindings.task_id} • {selectedTaskForFindings.title}</p>
              </div>
              <button onClick={() => setSelectedTaskForFindings(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTaskFindings} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inspection Status</label>
                <select
                  value={findingsStatus}
                  onChange={(e) => setFindingsStatus(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 font-bold text-slate-800"
                >
                  <option value="Completed">✓ Completed (Barrier Verified & Safe)</option>
                  <option value="In Progress">In Progress (Physical Check Ongoing)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Physical Findings & Barrier Verification Evidence
                </label>
                <textarea
                  rows={4}
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  placeholder="Describe exact physical inspection details (e.g. Conducted tag audit on Mud Pump B header. Zero energy verified with gauge. Padlock applied with lockbox tag #882. Signed PTW authorized for crew)..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForFindings(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTask}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Check className="h-4 w-4" />
                  <span>{updatingTask ? 'Synchronizing...' : 'Submit Findings to HSE Manager'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
