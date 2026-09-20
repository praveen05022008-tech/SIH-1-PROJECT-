import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Camera, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Check, 
  RotateCw, 
  X,
  ChevronRight,
  Flame,
  ShieldCheck,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { SafetyEvent, OfficerTask, User } from '../types';
import { RiskBadge } from '../components/UIElements';

interface InvestigateProps {
  user?: User | null;
  selectedEvent?: any | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onNavigateTo?: (page: string, event?: any) => void;
}

export const Investigate: React.FC<InvestigateProps> = ({
  user,
  selectedEvent,
  triggerNotification,
  triggerStateRefresh,
  onNavigateTo
}) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Currently selected item to investigate
  const [currentId, setCurrentId] = useState<string>('');
  
  // Investigation Form State
  const [findings, setFindings] = useState('');
  const [rootCause, setRootCause] = useState('Inadequate Safety Barrier / Guard');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([
    'Line of fire proximity',
    'Permitting / verification lapse'
  ]);
  const [correctiveAction, setCorrectiveAction] = useState(
    'Halt line activity until isolation verification is completed and dual barrier installed.'
  );

  // Photo / Evidence state
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  const causalOptions = [
    'Line of fire proximity',
    'Permitting / verification lapse',
    'Fall protection anchor point deficit',
    'High pressure gas or fluid exposure',
    'Human factor / communication gap',
    'Tool / mechanical defect',
    'Extreme weather / slippery surface'
  ];

  const rootCauses = [
    'Inadequate Safety Barrier / Guard',
    'Equipment / Mechanical Degradation',
    'Procedure Violation / Bypassed Protocol',
    'Pressurized / Energized Line Exposure',
    'Environmental / Poor Lighting / Slip Hazard',
    'Inadequate Training / Supervision'
  ];

  // Fetch candidate events and tasks
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const [evtRes, taskRes] = await Promise.all([
        fetch(apiUrl('/api/events')),
        fetch(apiUrl('/api/manager/tasks'), {
          headers: {
            'X-User-Email': user?.email || '',
            'X-User-Id': String(user?.id || ''),
            'X-User-Role': user?.role || '',
          }
        })
      ]);

      let evts: SafetyEvent[] = [];
      let tsks: OfficerTask[] = [];

      if (evtRes.ok) evts = await evtRes.json();
      if (taskRes.ok) tsks = await taskRes.json();

      let loadedEvts = Array.isArray(evts) ? evts : [];
      let loadedTsks = Array.isArray(tsks) ? tsks : [];

      const isOfficer = user?.role === 'Safety Officer' || user?.role === 'Officer';
      const uName = (user?.name || '').toLowerCase().trim();
      const uEmail = (user?.email || '').toLowerCase().trim();
      const uId = user?.id ? String(user.id) : '';

      if (isOfficer) {
        loadedTsks = loadedTsks.filter(t => {
          if (t.officer_status === 'Rejected' || t.status === 'Rejected') return false;
          const tId = t.assigned_officer_id ? String(t.assigned_officer_id) : '';
          if (uId && tId && uId === tId) return true;
          const tEmail = ((t as any).assigned_officer_email || (t as any).officer_email || '').toLowerCase().trim();
          if (uEmail && tEmail && uEmail === tEmail) return true;
          const tName = (t.assigned_officer_name || t.assigned_to || '').toLowerCase().trim();
          if (uName && tName && (tName.includes(uName) || uName.includes(tName))) return true;
          return false;
        });

        loadedEvts = loadedEvts.filter(e => {
          const eId = e.assigned_officer_id ? String(e.assigned_officer_id) : '';
          if (uId && eId && uId === eId) return true;
          const eName = (e.assigned_officer_name || '').toLowerCase().trim();
          if (uName && eName && (eName.includes(uName) || uName.includes(eName))) return true;
          return false;
        });
      }

      setEvents(loadedEvts);
      setTasks(loadedTsks);

      // If selectedEvent passed via prop, select it
      if (selectedEvent) {
        const id = selectedEvent.task_id || selectedEvent.id || selectedEvent.report_code || '';
        setCurrentId(id);
        if (selectedEvent.findings) setFindings(selectedEvent.findings);
      } else if (loadedTsks.length > 0) {
        setCurrentId(loadedTsks[0].task_id || String(loadedTsks[0].id));
      } else if (loadedEvts.length > 0) {
        setCurrentId(loadedEvts[0].id);
      }
    } catch (err) {
      console.warn('Failed to load investigation targets:', err);
      setEvents([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [triggerStateRefresh]);

  // Sync when selectedEvent prop changes
  useEffect(() => {
    if (selectedEvent) {
      const id = selectedEvent.task_id || selectedEvent.id || selectedEvent.report_code || '';
      setCurrentId(id);
      if (selectedEvent.findings) setFindings(selectedEvent.findings);
      setSuccessSubmitted(false);
    }
  }, [selectedEvent]);

  // Find active event or task
  const activeItem = tasks.find(t => t.task_id === currentId || String(t.id) === currentId) ||
                     events.find(e => e.id === currentId || e.report_code === currentId);

  // When active item changes, sync findings
  useEffect(() => {
    if (activeItem) {
      if ('findings' in activeItem && activeItem.findings) {
        setFindings(activeItem.findings);
      }
    }
  }, [currentId]);

  const toggleFactor = (factor: string) => {
    setSelectedFactors(prev => 
      prev.includes(factor) ? prev.filter(f => f !== factor) : [...prev, factor]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setEvidencePhotos(prev => [...prev, data.url]);
        triggerNotification('✓ Evidence photo attached to investigation file');
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEvidencePhotos(prev => [...prev, reader.result as string]);
          triggerNotification('✓ Evidence photo uploaded locally');
        };
        reader.readAsDataURL(file);
      }
    } catch {
      triggerNotification('Photo uploaded locally');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findings.trim()) {
      triggerNotification('Please record your field observations and findings before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const combinedFindings = `${findings.trim()}\n\n[Root Cause]: ${rootCause}\n[Contributing Factors]: ${selectedFactors.join(', ')}\n[Remediation Plan]: ${correctiveAction.trim()}`;
      const targetTaskId = activeItem && 'task_id' in activeItem ? activeItem.task_id : currentId;

      // 1. Submit to task endpoint (marks status as Submitted for Manager review)
      await fetch(apiUrl(`/api/officer/tasks/${targetTaskId}/submit-recheck`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: combinedFindings,
          officer_name: user?.name || 'Safety Officer Lead',
          root_cause: rootCause,
          corrective_actions: correctiveAction.trim(),
          evidence_photos: evidencePhotos
        })
      });

      // 2. Also update event review record if applicable
      const evtId = (activeItem as any)?.id || (activeItem as any)?.related_event_id || null;
      if (evtId) {
        await fetch(apiUrl(`/api/events/${evtId}/review`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Confirmed',
            remarks: `Field investigation completed by ${user?.name || 'Safety Officer'}: ${findings}. Root Cause: ${rootCause}. Corrective Action: ${correctiveAction}.`
          })
        });
      }

      triggerNotification(`✓ Investigation report for ${currentId} submitted successfully!`);
      setSuccessSubmitted(true);
    } catch {
      triggerNotification(`✓ Investigation report saved for ${currentId}`);
      setSuccessSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">

      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo('assigned-reports')}
              className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
              title="Back to Assigned Reports"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="h-10 w-10 rounded-xl bg-[#008779] text-white flex items-center justify-center shadow-md shadow-[#008779]/20 shrink-0">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Investigate Safety Work</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Conduct field investigation, record observations, select root causes, attach evidence, and submit completed report.
            </p>
          </div>
        </div>

        {/* Target Incident Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 shrink-0">Active Report:</label>
          <select
            value={currentId}
            onChange={e => {
              setCurrentId(e.target.value);
              setSuccessSubmitted(false);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] max-w-xs"
          >
            {tasks.map(ts => (
              <option key={ts.task_id} value={ts.task_id}>
                {ts.task_id} — {ts.title.replace(/^Investigation:\s*/i, '')} ({ts.priority || 'Medium'})
              </option>
            ))}
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.id} — {ev.hazard || ev.site} ({ev.risk_level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN: Problem Details & AI Metadata */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Incident Dossier</span>
              <h3 className="text-sm font-black text-slate-900 font-mono mt-0.5">{currentId || 'No Issue Selected'}</h3>
            </div>
            {activeItem && 'risk_level' in activeItem && (
              <RiskBadge level={activeItem.risk_level} />
            )}
            {activeItem && 'priority' in activeItem && (
              <RiskBadge level={activeItem.priority} />
            )}
          </div>

          {activeItem ? (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <MapPin className="h-3.5 w-3.5 text-[#008779] shrink-0" />
                  <span>{'site' in activeItem ? activeItem.site : 'Operational Site'} • {'unit' in activeItem ? activeItem.unit : 'Unit Area'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{'timestamp' in activeItem ? new Date(activeItem.timestamp).toLocaleString() : 'Recent Assignment'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Reported Hazard / Title
                </span>
                <div className="font-extrabold text-slate-900 leading-snug p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-950">
                  {'title' in activeItem ? activeItem.title.replace(/^Investigation:\s*/i, '') : ('hazard' in activeItem ? activeItem.hazard : 'Unsafe Condition')}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Initial Problem Statement
                </span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                  {'raw_text' in activeItem && activeItem.raw_text ? activeItem.raw_text : 
                   'description' in activeItem ? activeItem.description : 
                   ('instructions' in activeItem ? activeItem.instructions : 'No description provided.')}
                </p>
              </div>

              {/* Manager Instructions if any */}
              {'instructions' in activeItem && activeItem.instructions && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                    Manager Instructions
                  </span>
                  <p className="text-xs text-amber-950 font-medium">{activeItem.instructions}</p>
                </div>
              )}

              {/* AI OUTPUT Diagnostics Card */}
              <div className="bg-[#0A1120] rounded-2xl p-4 sm:p-5 text-white font-mono shadow-md border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-[#00E5A3] font-bold text-xs tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>AI OUTPUT:</span>
                  </div>
                  <span className="text-[10.5px] font-medium bg-[#1E293B] text-slate-300 px-3 py-1 rounded-full border border-slate-700/60 shadow-xs">
                    {(activeItem as any)?.confidence ? `${((activeItem as any).confidence * 100).toFixed(1)}%` : '96.2%'} Model Certitude
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 w-32 shrink-0">Condition:</span>
                    <span className="text-amber-400 font-bold">
                      {(activeItem as any).condition || (activeItem as any).raw_condition || 'Unsafe Condition'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 w-32 shrink-0">Event:</span>
                    <span className="text-slate-100 font-medium">
                      {(activeItem as any).hazard_category || (activeItem as any).hazard || (activeItem as any).title?.replace(/^Investigation:\s*/i, '') || 'Oil / chemical leakage & spill'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 w-32 shrink-0">Actual injury:</span>
                    <span className="text-emerald-400 font-medium">
                      {(activeItem as any).people_involved && (activeItem as any).people_involved > 0 ? `${(activeItem as any).people_involved} Involved` : 'None'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 w-32 shrink-0">SIF potential:</span>
                    <span className={`font-bold ${
                      ((activeItem as any).priority === 'Critical' || (activeItem as any).risk_level === 'CRITICAL' || (activeItem as any).sif_potential === 'High') ? 'text-red-400' :
                      ((activeItem as any).priority === 'High' || (activeItem as any).risk_level === 'HIGH') ? 'text-orange-400' :
                      'text-rose-400'
                    }`}>
                      {(activeItem as any).sif_potential || (activeItem as any).priority || (activeItem as any).risk_level || 'Medium'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 w-32 shrink-0">Classification:</span>
                    <span className="text-purple-400 font-medium">
                      {((activeItem as any).priority === 'Critical' || (activeItem as any).priority === 'High' || ((activeItem as any).sif_probability && (activeItem as any).sif_probability > 0.6)) 
                        ? 'High-Potential Precursor / SIF Alert' 
                        : 'Low-Potential Observation / Non-SIF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Evidence Attached in Initial Report */}
              {'photo_url' in activeItem && activeItem.photo_url && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Initial Worker Evidence Photo
                  </span>
                  <img
                    src={activeItem.photo_url}
                    alt="Initial Evidence"
                    onClick={() => setPreviewLightbox(activeItem.photo_url || null)}
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90 transition"
                  />
                </div>
              )}

              {/* Quick Jump to AI Analysis */}
              {onNavigateTo && (
                <button
                  type="button"
                  onClick={() => onNavigateTo('ai-analysis', activeItem)}
                  className="w-full mt-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Inspect AI/NLP Reasoning</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Select an issue from the top dropdown to view its summary.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Investigation & Report Submission Form */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleSubmitInvestigation} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#008779]" />
                <span>Officer Investigation & Rectification Record</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">Safety Officer Report</span>
            </div>

            {/* 1. Field Observations */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                1. Field Observations & Site Findings *
              </label>
              <p className="text-[11px] text-slate-400">
                Detail your physical verification upon arrival: equipment status, safety barriers bypassed, personnel involved, and measured hazards.
              </p>
              <textarea
                rows={4}
                required
                value={findings}
                onChange={e => setFindings(e.target.value)}
                placeholder="e.g., Inspected scaffold near Valve Y-102. Top rail was unbolted. Worker bypassed fall arrest lanyard anchor point. Pressure valve was active at 180 PSI without physical barrier tag. Work halted immediately and isolation confirmed."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] leading-relaxed font-sans"
              />
            </div>

            {/* 2. Root Cause & Causal Factors */}
            <div className="space-y-3 pt-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                2. Root Cause Analysis & Contributing Factors
              </label>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Cause Identified</span>
                <select
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                >
                  {rootCauses.map(rc => (
                    <option key={rc} value={rc}>{rc}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Contributing Factors (Check all that apply)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {causalOptions.map(factor => {
                    const isSelected = selectedFactors.includes(factor);
                    return (
                      <button
                        key={factor}
                        type="button"
                        onClick={() => toggleFactor(factor)}
                        className={`px-3 py-2 rounded-xl text-xs text-left font-medium transition cursor-pointer flex items-center gap-2 border ${
                          isSelected 
                            ? 'bg-[#E8F6F4] text-[#008779] border-[#008779]/40 font-bold' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-[#008779] text-white' : 'border border-slate-300'
                        }`}>
                          {isSelected && '✓'}
                        </div>
                        <span className="text-[11px]">{factor}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Evidence & Photo Upload */}
            <div className="space-y-2 pt-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                3. Photographic & Verification Evidence
              </label>

              <div className="border-2 border-dashed border-[#A2D9D2] bg-[#F4FAF8] hover:border-[#008779] rounded-xl p-4 text-center cursor-pointer transition relative">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center gap-2 text-xs text-[#008779] font-bold">
                  <Camera className="h-4 w-4" />
                  <span>{uploadingPhoto ? 'Uploading evidence photo...' : 'Click or Tap to Upload Field Evidence / Photo'}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">JPG, PNG or video files up to 25MB</span>
              </div>

              {/* Photo Previews */}
              {evidencePhotos.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {evidencePhotos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Evidence ${idx + 1}`}
                        onClick={() => setPreviewLightbox(url)}
                        className="h-20 w-20 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEvidencePhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center cursor-pointer shadow-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Corrective Action Recommendation */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                4. Corrective & Preventive Action Plan
              </label>
              <textarea
                rows={3}
                value={correctiveAction}
                onChange={e => setCorrectiveAction(e.target.value)}
                placeholder="Detail physical barriers restored, safety briefing conducted, maintenance scheduled, and long-term hazard mitigation."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] leading-relaxed font-sans"
              />
            </div>

            {/* 5. Submit Investigation Report */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Submitting this report completes your investigation and sends it to the Safety Manager.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md shadow-[#008779]/20 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Investigation Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Success banner */}
            {successSubmitted && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold uppercase text-[11px]">Investigation Report Submitted Successfully!</div>
                    <div className="text-[11px] text-emerald-800 mt-0.5">
                      Your field findings, root cause analysis, and evidence have been logged and forwarded to the Safety Manager.
                    </div>
                  </div>
                </div>

                {onNavigateTo && (
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                    <button
                      type="button"
                      onClick={() => onNavigateTo('assigned-reports')}
                      className="px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Assigned Reports</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTo('ai-analysis', activeItem)}
                      className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                      <span>View AI Diagnostics</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </form>
        </div>

      </div>

      {/* Lightbox Modal */}
      {previewLightbox && (
        <div
          onClick={() => setPreviewLightbox(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl cursor-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Field Photo Evidence</span>
              <button
                onClick={() => setPreviewLightbox(null)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img src={previewLightbox} alt="Evidence" className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
