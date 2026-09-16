import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare, Clock, RefreshCw, Search, CheckCircle2, XCircle,
  AlertTriangle, FileText, User, MapPin, Flame, ChevronDown,
  MessageSquare, ThumbsUp, ThumbsDown, Activity
} from 'lucide-react';
import { OfficerTask, User as UserType } from '../types';

interface ManagerActionsProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

const MOCK_TASKS: OfficerTask[] = [
  {
    id: 1, task_id: 'TSK-101',
    title: 'Investigate Pressurized Line Leak at Well Pad C-7',
    task_type: 'Field Investigation',
    site: 'Duliajan Field', unit: 'Well Pad C-7',
    priority: 'CRITICAL',
    assigned_officer_id: 1,
    assigned_officer_name: 'Ranjit Phukan',
    assigned_by: 'Mgr. Rajesh Bora',
    instructions: 'Conduct immediate field inspection of the reported pressurized pipeline leak.',
    status: 'Completed',
    due_date: new Date(Date.now() - 86400000).toISOString(),
    findings: 'Found corroded relief valve at flange joint F-14. Gas cloud confirmed. Isolation initiated. Photo evidence collected. Root cause: corrosion-induced seal failure. Recommended: immediate valve replacement and quarterly inspection schedule.',
    related_event_id: 'EVT-001',
    created_at: new Date(Date.now() - 7200000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2, task_id: 'TSK-102',
    title: 'Audit Fall Protection Compliance at Refinery Tower T-4',
    task_type: 'Safety Audit',
    site: 'Numaligarh Refinery', unit: 'Tower T-4',
    priority: 'HIGH',
    assigned_officer_id: 2,
    assigned_officer_name: 'Deepa Hazarika',
    assigned_by: 'Mgr. Priya Hazarika',
    instructions: 'Verify all personnel working above 2m have double-lanyard harnesses attached.',
    status: 'In Progress',
    due_date: new Date(Date.now() + 172800000).toISOString(),
    findings: 'Initial inspection found 2 workers without proper anchor hook. Corrective briefing issued on-site.',
    related_event_id: 'EVT-002',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: null
  },
  {
    id: 3, task_id: 'TSK-103',
    title: 'Energy Isolation Verification – Gas Compressor Station G-3',
    task_type: 'LOTO Verification',
    site: 'Jorhat Gas Station', unit: 'Compressor Station G-3',
    priority: 'HIGH',
    assigned_officer_id: 3,
    assigned_officer_name: 'Mridul Bora',
    assigned_by: 'Mgr. Rajesh Bora',
    instructions: 'Verify complete LOTO before maintenance resumes.',
    status: 'Assigned',
    due_date: new Date(Date.now() + 86400000).toISOString(),
    findings: null,
    related_event_id: 'EVT-003',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: null
  },
  {
    id: 4, task_id: 'TSK-104',
    title: 'Ground-Level Safety Inspection at Digboi CDU',
    task_type: 'Compliance Inspection',
    site: 'Digboi Refinery', unit: 'CDU Unit',
    priority: 'MEDIUM',
    assigned_officer_id: 1,
    assigned_officer_name: 'Ranjit Phukan',
    assigned_by: 'Mgr. Rajesh Bora',
    instructions: 'Walk-through inspection of all CDU work areas. Check PPE compliance and housekeeping.',
    status: 'Overdue',
    due_date: new Date(Date.now() - 172800000).toISOString(),
    findings: null,
    related_event_id: null,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    completed_at: null
  }
];

const STATUS_COLORS: Record<string, string> = {
  Assigned: 'bg-amber-50 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-slate-400',
};

export const ManagerActions: React.FC<ManagerActionsProps> = ({
  user, triggerNotification, triggerStateRefresh
}) => {
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState<OfficerTask | null>(null);
  const [managerNote, setManagerNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/manager/tasks'));
      let loaded: OfficerTask[] = [];
      if (res.ok) { const d = await res.json(); loaded = Array.isArray(d) ? d : []; }
      setTasks(loaded.length > 0 ? loaded : MOCK_TASKS);
    } catch {
      setTasks(MOCK_TASKS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [triggerStateRefresh]);

  const filtered = useMemo(() => tasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title?.toLowerCase().includes(q) || t.site?.toLowerCase().includes(q) ||
        t.assigned_officer_name?.toLowerCase().includes(q) || t.task_id?.toLowerCase().includes(q);
    }
    return true;
  }), [tasks, statusFilter, searchQuery]);

  const metrics = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    overdue: tasks.filter(t => t.status === 'Overdue').length,
    pendingReview: tasks.filter(t => t.status === 'Completed' && t.findings).length,
  }), [tasks]);

  const handleApprove = async (task: OfficerTask) => {
    setActionLoading(true);
    try {
      await fetch(apiUrl(`/api/manager/tasks/${task.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved', manager_note: managerNote || 'Approved by Manager.' })
      });
      triggerNotification(`Investigation ${task.task_id} approved. Corrective actions cleared.`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: 'Completed' } : t));
      setSelectedTask(null);
      setManagerNote('');
    } catch {
      triggerNotification(`${task.task_id} approved (offline mode).`);
      setSelectedTask(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (task: OfficerTask) => {
    if (!managerNote.trim()) {
      triggerNotification('Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await fetch(apiUrl(`/api/manager/tasks/${task.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', manager_note: managerNote })
      });
      triggerNotification(`${task.task_id} sent back to officer for rework.`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: 'In Progress' } : t));
      setSelectedTask(null);
      setManagerNote('');
    } catch {
      triggerNotification(`${task.task_id} rejected (offline mode).`);
      setSelectedTask(null);
    } finally {
      setActionLoading(false);
    }
  };

  const isOverdue = (task: OfficerTask) =>
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Actions & Reviews</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review officer investigations, approve/reject corrective actions, and monitor completion.
            </p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-2 cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: metrics.total, color: 'text-slate-800', bg: 'bg-slate-50', icon: <Activity className="h-4 w-4 text-slate-500" /> },
          { label: 'Pending Review', value: metrics.pendingReview, color: 'text-[#008779]', bg: 'bg-[#EBF7F5]', icon: <FileText className="h-4 w-4 text-[#008779]" /> },
          { label: 'In Progress', value: metrics.inProgress, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Clock className="h-4 w-4 text-blue-500" /> },
          { label: 'Overdue', value: metrics.overdue, color: 'text-red-600', bg: 'bg-red-50', icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
        ].map(m => (
          <div key={m.label} className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
              <div className={`h-7 w-7 rounded-lg ${m.bg} flex items-center justify-center`}>{m.icon}</div>
            </div>
            <div className={`text-2xl font-black font-mono ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Task list */}
        <div className="xl:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'Assigned', 'In Progress', 'Completed', 'Overdue'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-[#008779] text-white border-[#008779]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>{s}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search…" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 w-44 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filtered.map(task => (
                <div key={task.task_id}
                  onClick={() => setSelectedTask(selectedTask?.task_id === task.task_id ? null : task)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedTask?.task_id === task.task_id
                      ? 'border-[#008779] bg-[#EBF7F5] ring-2 ring-[#008779]/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 font-mono">{task.task_id}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-slate-400'}`} />
                        <span className="text-[10px] font-bold text-slate-500">{task.priority}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLORS[task.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {task.status}
                        </span>
                        {isOverdue(task) && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">OVERDUE</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="h-3 w-3" />{task.site}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <User className="h-3 w-3" />{task.assigned_officer_name}
                        </span>
                      </div>
                      {task.findings && (
                        <p className="text-[10px] text-[#008779] font-semibold mt-1.5 line-clamp-1 flex items-center gap-1">
                          <FileText className="h-3 w-3 inline shrink-0" />
                          <span>Findings: {task.findings}</span>
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${selectedTask?.task_id === task.task_id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">No tasks match the filter.</div>
              )}
            </div>
          )}
        </div>

        {/* Review Panel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#008779]" /> Review Panel
          </h3>

          {selectedTask ? (
            <div className="space-y-4">
              {/* Task summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <p className="text-xs font-black text-slate-800">{selectedTask.title}</p>
                <p className="text-[10px] text-slate-500">{selectedTask.site} — {selectedTask.unit}</p>
                <p className="text-[10px] text-slate-500">Officer: <span className="font-bold">{selectedTask.assigned_officer_name}</span></p>
                <p className="text-[10px] text-slate-500">Type: {selectedTask.task_type}</p>
                <p className="text-[10px] text-slate-500">Due: {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'N/A'}</p>
              </div>

              {/* Findings */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Officer Findings</label>
                <div className={`text-xs rounded-xl border p-3 min-h-[80px] ${selectedTask.findings ? 'bg-[#EBF7F5] border-[#008779]/20 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-400 italic'}`}>
                  {selectedTask.findings || 'No findings submitted yet. Officer is still working on this task.'}
                </div>
              </div>

              {/* Manager note */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Manager's Note</label>
                <textarea rows={3} value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder="Approval note or rejection reason..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] resize-none" />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleApprove(selectedTask)}
                  disabled={actionLoading || !selectedTask.findings}
                  className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer">
                  <ThumbsUp className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => handleReject(selectedTask)}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer">
                  <ThumbsDown className="h-3.5 w-3.5" /> Reject
                </button>
              </div>

              {!selectedTask.findings && (
                <p className="text-[10px] text-amber-600 font-semibold text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3 inline shrink-0" />
                  <span>Waiting for officer findings before approving.</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
              <CheckSquare className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-semibold">Select a task from the list</p>
              <p className="text-xs mt-1">to review, approve, or reject officer findings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
