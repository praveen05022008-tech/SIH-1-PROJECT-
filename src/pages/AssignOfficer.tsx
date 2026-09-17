import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  UserCheck, Send, Search, ClipboardList, Clock, AlertTriangle,
  CheckCircle2, RefreshCw, ChevronRight, Flame, Building2, Calendar,
  ShieldAlert, ShieldCheck, FileText, User, MapPin, RotateCcw, Check, X, Eye, ThumbsUp, ThumbsDown, Info
} from 'lucide-react';
import { OfficerProfile, OfficerTask, SafetyEvent, User as UserType } from '../types';

interface AssignOfficerProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  initialTab?: 'assign' | 'recheck' | 'all';
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const AssignOfficer: React.FC<AssignOfficerProps> = ({
  user, triggerNotification, triggerStateRefresh, initialTab = 'assign'
}) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [officers, setOfficers] = useState<OfficerProfile[]>([]);
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [activeTab, setActiveTab] = useState<'assign' | 'recheck' | 'all'>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);

  // Review modal for Re-Check
  const [reviewTask, setReviewTask] = useState<OfficerTask | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const [assignForm, setAssignForm] = useState({
    officerId: '',
    priority: 'HIGH',
    dueDays: 2,
    instructions: '',
    taskType: 'Field Investigation'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evtRes, offRes, taskRes] = await Promise.all([
        fetch(apiUrl('/api/events')),
        fetch(apiUrl('/api/manager/officers')),
        fetch(apiUrl('/api/manager/tasks'))
      ]);
      let loadedEvents: SafetyEvent[] = [];
      let loadedOfficers: OfficerProfile[] = [];
      let loadedTasks: OfficerTask[] = [];

      if (evtRes.ok) { const d = await evtRes.json(); loadedEvents = Array.isArray(d) ? d : []; }
      if (offRes.ok) { const d = await offRes.json(); loadedOfficers = Array.isArray(d) ? d : []; }
      if (taskRes.ok) { const d = await taskRes.json(); loadedTasks = Array.isArray(d) ? d : []; }

      setEvents(loadedEvents);
      setOfficers(loadedOfficers);
      setTasks(loadedTasks);
    } catch {
      setEvents([]);
      setOfficers([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [triggerStateRefresh]);

  const filteredEvents = events.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (e.site?.toLowerCase().includes(q) || e.hazard_category?.toLowerCase().includes(q) ||
      e.report_code?.toLowerCase().includes(q) || e.reporter_name?.toLowerCase().includes(q));
  });

  const handleAssign = async () => {
    if (!selectedEvent || !assignForm.officerId) {
      triggerNotification('Please select a report and an officer.');
      return;
    }
    const officer = officers.find(o => String(o.id) === String(assignForm.officerId));
    setSubmitting(true);
    try {
      const dueDate = new Date(Date.now() + assignForm.dueDays * 86400000).toISOString();
      const hazardTitle = selectedEvent.hazard_category || selectedEvent.hazard || selectedEvent.report_type || 'Safety Incident';
      const offName = officer ? (officer.officer_name || officer.name || 'Officer') : 'Officer';
      const payload = {
        title: `Investigate: ${hazardTitle} at ${selectedEvent.site || 'Site'}`,
        task_type: assignForm.taskType,
        site: selectedEvent.site || 'Field Site',
        unit: selectedEvent.unit || 'Operational Unit',
        priority: assignForm.priority,
        assigned_officer_id: Number(assignForm.officerId),
        instructions: assignForm.instructions || `Investigate the reported ${hazardTitle} incident. Document findings, take photographs, identify root cause, and submit written report.`,
        due_days: assignForm.dueDays,
        due_date: dueDate,
        related_event_id: selectedEvent.id,
        assigned_by: user?.name || 'HSE Manager',
        assigned_officer_name: offName
      };
      const res = await fetch(apiUrl('/api/manager/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const reportLabel = selectedEvent.report_code || selectedEvent.id || 'Report';
      if (res.ok) {
        triggerNotification(`Report ${reportLabel} assigned specifically to Safety Officer ${offName} with ${assignForm.priority} priority.`);
      } else {
        triggerNotification(`Assignment created for ${offName} (offline mode)`);
      }
      setSelectedEvent(null);
      setAssignForm({ officerId: '', priority: 'HIGH', dueDays: 2, instructions: '', taskType: 'Field Investigation' });
      fetchData();
    } catch {
      const off = officers.find(o => String(o.id) === String(assignForm.officerId));
      triggerNotification(`Assignment created for ${off ? (off.officer_name || off.name) : 'Officer'} (offline mode)`);
      setSelectedEvent(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Manager approves officer's submitted re-check report
  const handleApproveRecheck = async (task: OfficerTask) => {
    setProcessingAction(true);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${task.task_id}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_name: user?.name || 'HSE Manager',
          manager_notes: managerNotes || 'Report verified and approved in full compliance.'
        })
      });

      if (res.ok) {
        triggerNotification(`Issue ${task.task_id} approved! Issue is completely finished and employee has been sent confirmation.`);
        setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
          ...t,
          status: 'Completed',
          manager_notes: managerNotes || 'Approved by Manager'
        } : t));
        setReviewTask(null);
        setManagerNotes('');
      } else {
        throw new Error();
      }
    } catch {
      triggerNotification(`Issue ${task.task_id} approved! Marked as completely finished.`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
        ...t,
        status: 'Completed',
        manager_notes: managerNotes || 'Approved by Manager'
      } : t));
      setReviewTask(null);
      setManagerNotes('');
    } finally {
      setProcessingAction(false);
    }
  };

  // Manager requests revision from officer
  const handleRejectRecheck = async (task: OfficerTask) => {
    if (!rejectionReason.trim()) {
      triggerNotification('Please enter the revision notes or reason for requesting re-work.');
      return;
    }

    setProcessingAction(true);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${task.task_id}/reject`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_name: user?.name || 'HSE Manager',
          rejection_reason: rejectionReason.trim()
        })
      });

      triggerNotification(`Re-work requested for task ${task.task_id}. Officer will be notified.`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
        ...t,
        status: 'In Progress',
        manager_notes: `Revision Requested: ${rejectionReason.trim()}`
      } : t));
      setReviewTask(null);
      setRejectionReason('');
      setShowRejectBox(false);
    } catch {
      triggerNotification(`Re-work requested for task ${task.task_id}`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
        ...t,
        status: 'In Progress',
        manager_notes: `Revision Requested: ${rejectionReason.trim()}`
      } : t));
      setReviewTask(null);
      setRejectionReason('');
      setShowRejectBox(false);
    } finally {
      setProcessingAction(false);
    }
  };

  const pendingRechecks = tasks.filter(t => t.status === 'Submitted');

  const riskColor = (level?: string) => {
    if (level === 'CRITICAL') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'HIGH') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (level === 'MEDIUM') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Assign Safety Officer</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select open safety observations and assign them to designated officers with specific instructions and priorities.
            </p>
          </div>
        </div>

        <button onClick={fetchData} disabled={loading}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ASSIGN ISSUES SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Report selection */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#008779]" />
                <span>Select a Safety Observation to Assign</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 w-52 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                />
              </div>
            </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading reports…
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {filteredEvents.map(evt => {
                    const rawScore = evt.sif_risk_score ?? (evt.risk_score != null ? (evt.risk_score > 10 ? evt.risk_score / 10 : evt.risk_score) : 4.5);
                    const score = Number(rawScore) || 4.5;
                    const potential = (evt.sif_potential || (score >= 6.5 ? 'HIGH' : score >= 4.0 ? 'MEDIUM' : 'LOW')).toUpperCase();
                    const isHigh = potential === 'CRITICAL' || potential === 'HIGH' || score >= 6.5;

                    return (
                      <div key={evt.id}
                        onClick={() => setSelectedEvent(selectedEvent?.id === evt.id ? null : evt)}
                        className={`border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                          selectedEvent?.id === evt.id
                            ? 'border-[#008779] bg-[#EBF7F5] ring-2 ring-[#008779]/15 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-[10px] font-black text-slate-400 font-mono">{evt.report_code || evt.id}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${riskColor(evt.risk_level)}`}>{evt.risk_level || potential}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{evt.report_type || evt.condition || 'Observation'}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 truncate">{evt.hazard_category || evt.hazard || 'Operational Safety Hazard'}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{evt.description || evt.raw_text || 'Field observation reported.'}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <MapPin className="h-3 w-3 text-[#008779] shrink-0" />
                                <span>{evt.location_detail ? `${evt.site || 'Site'} — ${evt.unit || 'Unit'} (${evt.location_detail})` : `${evt.site || 'Site'} — ${evt.unit || 'Unit'}`}</span>
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <User className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{evt.reporter_name || 'Frontline Employee'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : score >= 4.0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {potential} • {score.toFixed(1)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">SIF Score</span>
                            {selectedEvent?.id === evt.id && (
                              <CheckCircle2 className="h-4 w-4 text-[#008779] mt-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredEvents.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">No reports found.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Assignment form */}
          <div className="space-y-4">
            {/* Selected report summary */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${selectedEvent ? 'border-[#008779]/30' : 'border-slate-200'}`}>
              <h3 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#008779]" /> Selected Report
              </h3>
              {selectedEvent ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-slate-800">{selectedEvent.hazard_category || selectedEvent.hazard}</p>
                  <p className="text-[10px] text-slate-500">
                    {selectedEvent.location_detail ? `${selectedEvent.site} — ${selectedEvent.unit} (${selectedEvent.location_detail})` : `${selectedEvent.site} — ${selectedEvent.unit}`}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{selectedEvent.description || selectedEvent.raw_text}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${riskColor(selectedEvent.risk_level)}`}>
                    <Flame className="h-2.5 w-2.5" /> {selectedEvent.risk_level || 'MEDIUM'} RISK
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">← Select a report from the list</p>
              )}
            </div>

            {/* Assignment Form */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Send className="h-4 w-4 text-[#008779]" /> Assignment Details
              </h3>

              {/* Officer Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Assign to Officer *</label>
                <select
                  value={assignForm.officerId}
                  onChange={e => setAssignForm(p => ({ ...p, officerId: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]">
                  <option value="">— Select Officer —</option>
                  {officers.map(o => {
                    const offName = o.officer_name || o.name || 'Safety Officer';
                    const tag = o.id_number || o.site || o.role || 'Safety Officer';
                    return (
                      <option key={o.id} value={o.id}>
                        {offName} • {tag}{o.status === 'Off Duty' ? ' [OFF DUTY]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Task Type</label>
                <select
                  value={assignForm.taskType}
                  onChange={e => setAssignForm(p => ({ ...p, taskType: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]">
                  <option>Field Investigation</option>
                  <option>Safety Audit</option>
                  <option>LOTO Verification</option>
                  <option>Root Cause Analysis</option>
                  <option>Barrier Assessment</option>
                  <option>Compliance Inspection</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Priority Level</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                    <button key={p}
                      onClick={() => setAssignForm(prev => ({ ...prev, priority: p }))}
                      className={`text-[9px] font-black py-1.5 rounded-lg border transition cursor-pointer ${
                        assignForm.priority === p ? PRIORITY_COLORS[p] + ' shadow-xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Due In (Days) — {assignForm.dueDays} day{assignForm.dueDays > 1 ? 's' : ''}
                </label>
                <input type="range" min={1} max={14} value={assignForm.dueDays}
                  onChange={e => setAssignForm(p => ({ ...p, dueDays: Number(e.target.value) }))}
                  className="w-full accent-[#008779]" />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                  <span>1 day</span><span>7 days</span><span>14 days</span>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Instructions (Optional)</label>
                <textarea
                  rows={3}
                  value={assignForm.instructions}
                  onChange={e => setAssignForm(p => ({ ...p, instructions: e.target.value }))}
                  placeholder="Additional instructions for the officer..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleAssign}
                disabled={submitting || !selectedEvent || !assignForm.officerId}
                className="w-full py-2.5 bg-[#008779] hover:bg-[#007064] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md shadow-[#008779]/20 transition flex items-center justify-center gap-2 cursor-pointer">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{submitting ? 'Assigning…' : 'Assign to Officer'}</span>
              </button>
            </div>
          </div>
        </div>

      {/* ALL ASSIGNED OFFICER TASKS TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#008779]" />
              <span>Assigned Safety Officer Tasks</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                {tasks.length} Total
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live tracking of all tasks assigned to field safety officers across operational sites.
            </p>
          </div>
        </div>

          {/* TABLE WITH RE-CHECK COLUMN */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Task ID</th>
                  <th className="py-3 px-3">Issue Title & Site</th>
                  <th className="py-3 px-3">Assigned Officer</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Current Status</th>
                  <th className="py-3 px-4 min-w-[220px]">Officer Submitted Findings</th>
                  <th className="py-3 px-4 min-w-[200px] text-center bg-[#E8F6F4] text-[#008779] border-l border-r border-[#008779]/20 font-black">
                    RE-CHECK (Manager Review)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {tasks.map((task) => {
                  const isSubmitted = task.status === 'Submitted';
                  const isCompleted = task.status === 'Completed';

                  return (
                    <tr key={task.task_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {task.task_id}
                        {task.related_event_id && (
                          <span className="text-[10px] text-slate-400 block font-normal">{task.related_event_id}</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 line-clamp-1">{task.title}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">{task.site} • {task.unit}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{task.assigned_officer_name}</div>
                        <div className="text-[10px] text-slate-400">By {task.assigned_by}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${riskColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isSubmitted ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {isSubmitted ? 'Re-Check' : task.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-700 font-medium line-clamp-2 leading-snug">
                          {task.submitted_findings || task.findings || (
                            <span className="text-slate-400 italic">No report submitted yet by officer.</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 bg-[#F7FCFB] border-l border-r border-[#008779]/15">
                        {isSubmitted ? (
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                setReviewTask(task);
                                setManagerNotes('');
                                setRejectionReason('');
                                setShowRejectBox(false);
                              }}
                              className="px-3 py-1.5 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Re-Check Report</span>
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <div className="text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Completely Finished</span>
                            </span>
                            {task.manager_notes && (
                              <span className="text-[10px] text-slate-500 block mt-1 line-clamp-1">
                                {task.manager_notes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 text-[11px] italic">
                            Waiting for officer report
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No tasks currently recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* RE-CHECK APPROVAL & REVISION MODAL */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                    Manager Re-Check & Final Verification
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{reviewTask.title}</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewTask(null);
                  setShowRejectBox(false);
                }}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Task & Location</span>
                <span className="font-bold text-slate-800">{reviewTask.task_id} • {reviewTask.site}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Safety Officer</span>
                <span className="font-bold text-slate-800">{reviewTask.assigned_officer_name}</span>
              </div>
            </div>

            {/* Officer's Submitted Findings */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Officer's Field Findings & Rectifications:
              </label>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                {reviewTask.submitted_findings || reviewTask.findings || 'No notes provided.'}
              </div>
            </div>

            {/* If manager wants to approve */}
            {!showRejectBox ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Manager Final Sign-Off Remarks:
                  </label>
                  <textarea
                    rows={3}
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Enter approval remarks (e.g. Verified zero-energy state, barrier restored, safe to resume work)..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-snug font-medium">
                    Approving will mark this issue as <b>Completely Finished</b>. The reporter employee will receive a complete confirmation message.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowRejectBox(true)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                  >
                    Need changes? Request Re-work
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReviewTask(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApproveRecheck(reviewTask)}
                      disabled={processingAction}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {processingAction ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Approve & Completely Finish Issue</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* If manager wants to request re-work */
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-amber-700 mb-1">
                    What needs to be rectified by the Officer? *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify missing photo evidence, incomplete test measurements, or unverified LOTO points..."
                    className="w-full p-2.5 text-xs border border-amber-300 rounded-xl bg-amber-50/50 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowRejectBox(false)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 underline cursor-pointer"
                  >
                    ← Back to Approval
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReviewTask(null);
                        setShowRejectBox(false);
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRejectRecheck(reviewTask)}
                      disabled={processingAction || !rejectionReason.trim()}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {processingAction ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      <span>Send Back for Re-Work</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

