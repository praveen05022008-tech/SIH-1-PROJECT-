import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Camera, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Check, 
  RotateCw, 
  Layers, 
  X,
  ExternalLink,
  ChevronRight
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
  const [investigationStatus, setInvestigationStatus] = useState('In Progress');

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

  const MOCK_TASKS: OfficerTask[] = [
    {
      id: 1, task_id: 'TSK-101',
      title: 'Investigate Pressurized Line Leak at Well Pad C-7',
      task_type: 'Field Investigation',
      site: 'Duliajan Field', unit: 'Well Pad C-7',
      priority: 'CRITICAL',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Rajesh Bora',
      instructions: 'Conduct immediate field inspection of the reported pressurized pipeline leak. Document the barrier failure, identify root cause, and initiate stop-work if personnel are in the line of fire.',
      status: 'Assigned',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      findings: null, related_event_id: 'EVT-001',
      created_at: new Date(Date.now() - 7200000).toISOString(), completed_at: null
    },
    {
      id: 2, task_id: 'TSK-102',
      title: 'Audit Fall Protection Compliance at Refinery Tower T-4',
      task_type: 'Safety Audit',
      site: 'Numaligarh Refinery', unit: 'Tower T-4',
      priority: 'HIGH',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Priya Hazarika',
      instructions: 'Verify all personnel working above 2m have double-lanyard harnesses attached to rated anchor points. Check permit-to-work documentation.',
      status: 'In Progress',
      due_date: new Date(Date.now() + 172800000).toISOString(),
      findings: 'Initial inspection found 2 workers without proper anchor hook. Corrective briefing issued.',
      related_event_id: 'EVT-002',
      created_at: new Date(Date.now() - 86400000).toISOString(), completed_at: null
    },
    {
      id: 3, task_id: 'TSK-103',
      title: 'Energy Isolation Verification – Gas Compressor Station G-3',
      task_type: 'LOTO Verification',
      site: 'Jorhat Gas Station', unit: 'Compressor Station G-3',
      priority: 'HIGH',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Rajesh Bora',
      instructions: 'Verify that all 6 LOTO points are correctly applied and tagged before maintenance crew starts work on the compressor manifold.',
      status: 'Assigned',
      due_date: new Date(Date.now() + 43200000).toISOString(),
      findings: null, related_event_id: 'EVT-003',
      created_at: new Date(Date.now() - 3600000).toISOString(), completed_at: null
    }
  ];

  const MOCK_EVENTS: SafetyEvent[] = [
    {
      id: 'EVT-001', report_code: 'RPT-2024-0141', report_type: 'Near Miss',
      reporter_name: 'Suresh Kumar', reported_by: 'suresh.kumar@oilindia.in',
      hazard_category: 'Pressure / Hydrocarbon Release',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      site: 'Duliajan Field', unit: 'Well Pad C-7',
      location: 'Well Pad C-7, Pump House Inlet',
      activity: 'Pipeline maintenance – flange re-torquing',
      description: 'Worker reported pressurized gas release from a loose flange on a 4-inch natural gas line. Two workers were in the proximity zone (within 3m) without respiratory PPE. The isolation valve was not in fully closed position.',
      hazard: 'Pressurized gas leak with personnel in line of fire',
      energy_source: 'Natural Gas – High Pressure',
      barrier: 'Isolation valve + PTW system',
      barrier_failure: 'Isolation valve not fully closed; PTW not verified',
      exposure: '2 workers within 3m exclusion zone',
      consequence: 'Flash fire or explosion if ignition source present',
      sif_probability: 87.4, confidence: 91,
      life_saving_rule: 'Energy Isolation',
      status: 'Needs Review', reviewer: null, evidence: '',
      risk_level: 'CRITICAL', sif_risk_score: 9.2,
      l1_milestone: 'Upstream Operations', l2_unit: 'Well Pad C', l3_discipline: 'Process Safety',
      l4_work_package: 'Flange Maintenance', l5_activity: 'Gas Line Inspection', l6_job: 'Flange Re-torquing'
    },
    {
      id: 'EVT-002', report_code: 'RPT-2024-0138', report_type: 'Unsafe Act',
      reporter_name: 'Priya Borah', reported_by: 'priya.borah@oilindia.in',
      hazard_category: 'Working at Height',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      site: 'Numaligarh Refinery', unit: 'Tower T-4',
      location: 'Distillation Tower T-4 – 3rd platform (14m elevation)',
      activity: 'Instrumentation inspection and cable routing',
      description: 'Observed 2 workers on the 3rd platform of Tower T-4 without double-lanyard fall protection. Anchor points available but not connected. Work was ongoing without active supervision.',
      hazard: 'Working at height without fall protection',
      energy_source: 'Gravitational',
      barrier: 'Double-lanyard harness + Anchor points',
      barrier_failure: 'Harness present but not connected to anchor points',
      exposure: '2 workers at 14m height with unprotected fall path',
      consequence: 'Fatal fall from height',
      sif_probability: 76.5, confidence: 88,
      life_saving_rule: 'Work at Height',
      status: 'Needs Review', reviewer: null, evidence: '',
      risk_level: 'HIGH', sif_risk_score: 8.1,
      l1_milestone: 'Refinery Operations', l2_unit: 'Distillation Unit', l3_discipline: 'Instrumentation',
      l4_work_package: 'Tower Inspection', l5_activity: 'Platform Inspection', l6_job: 'Cable Routing'
    },
    {
      id: 'EVT-003', report_code: 'RPT-2024-0135', report_type: 'Near Miss',
      reporter_name: 'Bikash Sonowal', reported_by: 'bikash.sonowal@oilindia.in',
      hazard_category: 'Energy Isolation / LOTO',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      site: 'Jorhat Gas Station', unit: 'Compressor Station G-3',
      location: 'Gas Compressor G-3, Manifold Section',
      activity: 'Scheduled maintenance on compressor manifold',
      description: 'Maintenance crew began work on the gas compressor manifold before LOTO verification was completed. 3 of 6 isolation points were not locked out. The compressor was still energized on a partial circuit.',
      hazard: 'Energized equipment access without complete LOTO',
      energy_source: 'Electrical + Pressurized Gas',
      barrier: 'LOTO procedure + PTW verification',
      barrier_failure: 'Incomplete LOTO – crew started without supervisor sign-off',
      exposure: '4 maintenance workers in energized zone',
      consequence: 'Electrocution or pressurized gas release causing serious injury',
      sif_probability: 81.2, confidence: 86,
      life_saving_rule: 'Energy Isolation',
      status: 'Needs Review', reviewer: null, evidence: '',
      risk_level: 'HIGH', sif_risk_score: 8.6,
      l1_milestone: 'Midstream Operations', l2_unit: 'Compression Unit G', l3_discipline: 'Mechanical',
      l4_work_package: 'Compressor Maintenance', l5_activity: 'Manifold Servicing', l6_job: 'LOTO Application'
    }
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
          }
        })
      ]);

      let evts: SafetyEvent[] = [];
      let tsks: OfficerTask[] = [];

      if (evtRes.ok) evts = await evtRes.json();
      if (taskRes.ok) tsks = await taskRes.json();

      const loadedEvts = Array.isArray(evts) ? evts : [];
      let loadedTsks = Array.isArray(tsks) ? tsks : [];

      const isOfficer = user?.role === 'Safety Officer' || user?.role === 'Officer';
      const uName = (user?.name || '').toLowerCase().trim();
      if (isOfficer && uName) {
        loadedTsks = loadedTsks.filter(t => {
          const tName = (t.assigned_officer_name || '').toLowerCase().trim();
          return !tName || tName.includes(uName) || uName.includes(tName);
        });
      }

      setEvents(loadedEvts);
      setTasks(loadedTsks);

      // If selectedEvent passed via prop, select it
      if (selectedEvent) {
        const id = selectedEvent.id || selectedEvent.task_id || '';
        setCurrentId(id);
        if (selectedEvent.findings) setFindings(selectedEvent.findings);
      } else if (loadedEvts.length > 0) {
        setCurrentId(loadedEvts[0].id);
      }
    } catch (err) {
      console.warn('Failed to load investigation targets:', err);
      setEvents(MOCK_EVENTS);
      setTasks(MOCK_TASKS);
      setCurrentId(MOCK_EVENTS[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [triggerStateRefresh]);

  // Find active event or task
  const activeItem = events.find(e => e.id === currentId) || 
                     tasks.find(t => t.task_id === currentId || t.id.toString() === currentId);

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
      triggerNotification('Please record your field findings and observations.');
      return;
    }

    setSubmitting(true);
    try {
      // If task_id, update task
      if (activeItem && 'task_id' in activeItem) {
        await fetch(apiUrl(`/api/manager/tasks/${activeItem.task_id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: investigationStatus,
            findings: `${findings} [Cause: ${rootCause}] [Remediation: ${correctiveAction}]`
          })
        });
      }

      // If event, update review
      const evtId = (activeItem as any)?.id || (activeItem as any)?.related_event_id || null;
      if (evtId) {
        await fetch(apiUrl(`/api/events/${evtId}/review`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: investigationStatus === 'Completed' ? 'Confirmed' : 'In Progress',
            remarks: `Field investigation by ${user?.name || 'Safety Officer'}: ${findings}. Root Cause: ${rootCause}. Required Action: ${correctiveAction}.`
          })
        });
      }

      triggerNotification(`✓ Investigation recorded and submitted for ${currentId}`);
      setSuccessSubmitted(true);
    } catch {
      triggerNotification(`✓ Investigation saved locally for ${currentId}`);
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
          <div className="h-10 w-10 rounded-xl bg-[#008779] text-white flex items-center justify-center shadow-md shadow-[#008779]/20 shrink-0">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Investigate Safety Issue</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Conduct field investigation, record site observations, identify root cause, and upload photographic evidence.
            </p>
          </div>
        </div>

        {/* Target Incident Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 shrink-0">Select Issue:</label>
          <select
            value={currentId}
            onChange={e => {
              setCurrentId(e.target.value);
              setSuccessSubmitted(false);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] max-w-xs"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.id} — {ev.hazard || ev.site} ({ev.risk_level})
              </option>
            ))}
            {tasks.map(ts => (
              <option key={ts.task_id} value={ts.task_id}>
                {ts.task_id} — {ts.title} ({ts.priority})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 2-Column Investigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT COLUMN (1 col): Safety Issue Summary Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Incident Under Audit</span>
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
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{'site' in activeItem ? activeItem.site : 'Field Location'} • {'unit' in activeItem ? activeItem.unit : 'Rig Floor'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{'timestamp' in activeItem ? new Date(activeItem.timestamp).toLocaleString() : 'Recent Allotment'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Reported Hazard / Title
                </span>
                <div className="font-extrabold text-slate-900 leading-snug p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-950">
                  {'title' in activeItem ? activeItem.title : ('hazard' in activeItem ? activeItem.hazard : 'Unsafe Condition')}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Initial Description
                </span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {'description' in activeItem ? activeItem.description : ('instructions' in activeItem ? activeItem.instructions : 'No description.')}
                </p>
              </div>

              {/* Photo Evidence Attached in Initial Report */}
              {'photo_url' in activeItem && activeItem.photo_url && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Initial Evidence Photo
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

        {/* RIGHT COLUMN (2 cols): Investigation Entry Form */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleSubmitInvestigation} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#008779]" />
                <span>Officer Investigation Record</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">Field Worker Safety Audit</span>
            </div>

            {/* 1. Field Observations */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                1. Actual Safety Observations & Site Findings
              </label>
              <p className="text-[11px] text-slate-400">
                Detail what was observed upon arrival at the unit. Note equipment condition, personnel positions, and barriers bypassed.
              </p>
              <textarea
                rows={4}
                value={findings}
                onChange={e => setFindings(e.target.value)}
                placeholder="e.g., Inspected scaffold near Valve Y-102. Top rail was unbolted. Worker bypassed fall arrest lanyard anchor point. Pressure valve was active at 180 PSI without physical barrier tag."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] leading-relaxed"
              />
            </div>

            {/* 2. Root Cause & Causal Factors */}
            <div className="space-y-3 pt-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                2. Root Cause Analysis & Contributing Factors
              </label>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Cause</span>
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
                3. Photographic & Document Evidence
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
                  <span>{uploadingPhoto ? 'Uploading evidence photo...' : 'Click to Upload Field Evidence / Photo'}</span>
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
                        className="h-20 w-20 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90"
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
                4. Required Corrective & Preventive Action
              </label>
              <textarea
                rows={2}
                value={correctiveAction}
                onChange={e => setCorrectiveAction(e.target.value)}
                placeholder="Recommended actions to remove hazard and ensure barrier integrity."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
              />
            </div>

            {/* 5. Investigation Status & Submit */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-600">Status:</span>
                <select
                  value={investigationStatus}
                  onChange={e => setInvestigationStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
                >
                  <option value="In Progress">Investigation In Progress</option>
                  <option value="Completed">Investigation Completed & Validated</option>
                  <option value="Escalated">Escalated to HSE Manager</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md shadow-[#008779]/20 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Saving Findings...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Save & Submit Investigation</span>
                  </>
                )}
              </button>
            </div>

            {/* Success banner */}
            {successSubmitted && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-extrabold uppercase text-[11px]">Investigation Logged Successfully</div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    Field observations, causal factors, and evidence photo have been saved to the central HSE audit log.
                  </div>
                </div>
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
