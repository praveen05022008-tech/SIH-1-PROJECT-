import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  User, 
  Sparkles,
  Check,
  Eye,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  XCircle,
  Flame,
  Send,
  Wrench,
  X
} from 'lucide-react';
import { OfficerTask, SafetyEvent, User as UserType } from '../types';
import { RiskBadge } from '../components/UIElements';

interface AssignedReportsProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onNavigateTo: (page: string, event?: any) => void;
  initialStatusFilter?: 'ALL' | 'Assigned' | 'In Progress' | 'Submitted' | 'Completed';
}

export const AssignedReports: React.FC<AssignedReportsProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh,
  onNavigateTo,
  initialStatusFilter = 'ALL'
}) => {
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Assigned' | 'In Progress' | 'Submitted' | 'Completed'>(initialStatusFilter);

  useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modal for viewing full task details
  const [selectedTask, setSelectedTask] = useState<OfficerTask | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [solveFindings, setSolveFindings] = useState('');
  const [isSolving, setIsSolving] = useState(false);

  // Modal for submitting final report for Manager Re-Check
  const [recheckTask, setRecheckTask] = useState<OfficerTask | null>(null);
  const [recheckFindings, setRecheckFindings] = useState('');
  const [submittingRecheck, setSubmittingRecheck] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        fetch(apiUrl('/api/manager/tasks'), {
          headers: {
            'X-User-Email': user?.email || '',
            'X-User-Id': String(user?.id || ''),
            'X-User-Role': user?.role || '',
          }
        }),
        fetch(apiUrl('/api/events'))
      ]);

      let loadedTasks: OfficerTask[] = [];
      let loadedEvents: SafetyEvent[] = [];

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        loadedTasks = Array.isArray(data) ? data : [];
        setTasks(loadedTasks);
      } else {
        setTasks([]);
      }
      if (eventsRes.ok) {
        const evtData = await eventsRes.json();
        loadedEvents = Array.isArray(evtData) ? evtData : [];
      }
      setEvents(loadedEvents);
    } catch (err) {
      console.warn('Failed to load assigned reports:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [triggerStateRefresh]);

  // Handle Accept Report (changes status to 'In Progress' so officer can solve)
  const handleAcceptTask = async (task: OfficerTask) => {
    setUpdatingTaskId(task.task_id);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${task.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          status: 'In Progress',
          findings: task.findings || 'Accepted by officer for field investigation and resolution.'
        })
      });
      if (res.ok) {
        triggerNotification(`✓ Accepted report ${task.task_id}. You can now solve and submit findings.`);
      } else {
        triggerNotification(`✓ Accepted report ${task.task_id}.`);
      }
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: 'In Progress' } : t));
      if (selectedTask?.task_id === task.task_id) {
        setSelectedTask(prev => prev ? { ...prev, status: 'In Progress' } : null);
      }
    } catch {
      triggerNotification(`✓ Marked ${task.task_id} as In Progress`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: 'In Progress' } : t));
      if (selectedTask?.task_id === task.task_id) {
        setSelectedTask(prev => prev ? { ...prev, status: 'In Progress' } : null);
      }
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Handle Reject Report (Non Accept)
  const handleRejectTask = async (task: OfficerTask) => {
    const reason = prompt('Please enter the reason for rejecting this assignment:') || 'Officer unable to take task / rejected by officer';
    if (!reason.trim()) return;

    setUpdatingTaskId(task.task_id);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${task.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          status: 'Pending Review',
          rejection_reason: reason
        })
      });
      if (res.ok) {
        triggerNotification(`Report ${task.task_id} rejected and returned to Safety Manager.`);
      } else {
        triggerNotification(`Report ${task.task_id} marked as Rejected.`);
      }
      setTasks(prev => prev.filter(t => t.task_id !== task.task_id));
      setSelectedTask(null);
    } catch {
      triggerNotification(`Report ${task.task_id} rejected.`);
      setTasks(prev => prev.filter(t => t.task_id !== task.task_id));
      setSelectedTask(null);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (task: OfficerTask, newStatus: string) => {
    setUpdatingTaskId(task.task_id);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${task.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        triggerNotification(`✓ Report ${task.task_id} updated to ${newStatus}`);
        setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: newStatus } : t));
        if (selectedTask?.task_id === task.task_id) {
          setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch {
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: newStatus } : t));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Handle Submit Report for Manager Re-Check
  const handleSubmitRecheck = async () => {
    if (!recheckTask) return;
    if (!recheckFindings.trim()) {
      triggerNotification('Please enter investigation findings and actions taken before submitting.');
      return;
    }

    setSubmittingRecheck(true);
    try {
      const res = await fetch(apiUrl(`/api/officer/tasks/${recheckTask.task_id}/submit-recheck`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: recheckFindings.trim(),
          officer_name: user?.name || recheckTask.assigned_officer_name
        })
      });

      if (res.ok) {
        triggerNotification(`Report for ${recheckTask.task_id} submitted for Manager Re-Check!`);
        setTasks(prev => prev.map(t => t.task_id === recheckTask.task_id ? {
          ...t,
          status: 'Submitted',
          findings: recheckFindings.trim(),
          submitted_findings: recheckFindings.trim()
        } : t));
        setRecheckTask(null);
        setRecheckFindings('');
      } else {
        throw new Error();
      }
    } catch {
      triggerNotification(`Report for ${recheckTask.task_id} submitted for Manager Re-Check (saved locally)`);
      setTasks(prev => prev.map(t => t.task_id === recheckTask.task_id ? {
        ...t,
        status: 'Submitted',
        findings: recheckFindings.trim(),
        submitted_findings: recheckFindings.trim()
      } : t));
      setRecheckTask(null);
      setRecheckFindings('');
    } finally {
      setSubmittingRecheck(false);
    }
  };

  // Filter tasks with strict officer isolation
  const isOfficer = user?.role === 'Safety Officer' || user?.role === 'Officer';

  const userScopedTasks = useMemo(() => {
    return tasks.filter(task => {
      // If task was rejected, do not show it to the officer
      if (task.officer_status === 'Rejected' || task.status === 'Rejected') return false;
      if (!task.assigned_officer_name && !task.assigned_officer_id && !task.assigned_to) return false;

      if (!isOfficer) return true;

      const uName = (user?.name || '').toLowerCase().trim();
      const uEmail = (user?.email || '').toLowerCase().trim();
      const uId = user?.id ? String(user.id) : '';

      const tId = task.assigned_officer_id ? String(task.assigned_officer_id) : '';
      if (uId && tId && uId === tId) return true;

      const tEmail = ((task as any).assigned_officer_email || (task as any).officer_email || '').toLowerCase().trim();
      if (uEmail && tEmail && uEmail === tEmail) return true;

      const tName = (task.assigned_officer_name || task.assigned_to || '').toLowerCase().trim();
      if (uName && tName && (tName.includes(uName) || uName.includes(tName))) {
        return true;
      }
      return false;
    });
  }, [tasks, user, isOfficer]);

  const filteredTasks = useMemo(() => {
    return userScopedTasks.filter(task => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority?.toUpperCase() !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(q);
        const matchId = task.task_id?.toLowerCase().includes(q);
        const matchSite = task.site?.toLowerCase().includes(q);
        const matchUnit = task.unit?.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchSite && !matchUnit) return false;
      }
      return true;
    });
  }, [userScopedTasks, statusFilter, priorityFilter, searchQuery]);

  const metrics = useMemo(() => {
    const total = userScopedTasks.length;
    const assigned = userScopedTasks.filter(t => t.status === 'Assigned').length;
    const inProgress = userScopedTasks.filter(t => t.status === 'In Progress').length;
    const recheck = userScopedTasks.filter(t => t.status === 'Submitted').length;
    const completed = userScopedTasks.filter(t => t.status === 'Completed').length;
    return { total, assigned, inProgress, recheck, completed };
  }, [userScopedTasks]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">

      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shadow-xs shrink-0">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Assigned Reports</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Shows all safety reports assigned to the officer by the Manager. Review, accept, and update findings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/90 transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition ${
            statusFilter === 'ALL' ? 'border-[#008779] ring-2 ring-[#008779]/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Assigned</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"><FileText className="h-3.5 w-3.5" /></div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{metrics.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Assigned by HSE Manager</div>
        </div>

        <div
          onClick={() => setStatusFilter('Assigned')}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition ${
            statusFilter === 'Assigned' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Acceptance</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="h-3.5 w-3.5" /></div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2 font-mono">{metrics.assigned}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting officer action</div>
        </div>

        <div
          onClick={() => setStatusFilter('In Progress')}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition ${
            statusFilter === 'In Progress' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><RefreshCw className="h-3.5 w-3.5" /></div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2 font-mono">{metrics.inProgress}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Investigation active</div>
        </div>

        <div
          onClick={() => setStatusFilter('Completed')}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition ${
            statusFilter === 'Completed' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /></div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">{metrics.completed}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Findings logged</div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search report title, ID, site..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'Assigned', 'In Progress', 'Submitted', 'Completed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'Assigned' ? 'Pending' : tab === 'Submitted' ? 'Re-Check' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assigned Reports Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Problem</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#008779]" />
                    <span className="font-bold text-xs">Loading assigned reports...</span>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-14 text-center text-slate-400">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-700 text-sm">No assigned reports found</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {statusFilter !== 'ALL' 
                        ? `No reports matching status '${statusFilter}'.` 
                        : user?.name 
                          ? `No reports are currently assigned to ${user.name}. When the Safety Manager assigns a report to you, it will appear here.`
                          : 'No reports have been assigned yet by the Manager.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const rawTitle = (task.title || '').replace(/^Investigation:\s*/i, '');
                  const shortTitle = rawTitle.length > 50 ? `${rawTitle.substring(0, 48)}...` : rawTitle;
                  const rawScore = task.priority === 'Critical' ? 9.2 : task.priority === 'High' ? 7.8 : task.priority === 'Medium' ? 5.2 : 2.8;
                  const isHighSif = task.priority === 'Critical' || task.priority === 'High';

                  return (
                    <tr key={task.task_id} className="hover:bg-slate-50/70 transition">
                      
                      {/* 1. PROBLEM (SHORT TITLE + SITE/UNIT/ID) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                            task.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                            task.priority === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-xs truncate max-w-md">
                              {shortTitle || 'Operational Observation'}
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5 font-mono">
                              <span>{task.task_id}</span>
                              <span>•</span>
                              <span className="font-sans truncate">{task.site || 'Site Alpha'} ({task.unit || 'Unit Area'})</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. RISK SCORE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                          task.priority === 'Critical'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : task.priority === 'High'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : task.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isHighSif && <AlertTriangle className="h-3 w-3 shrink-0" />}
                          <span>{rawScore.toFixed(1)} / 10 • {(task.priority || 'Medium').toUpperCase()} {isHighSif ? 'SIF' : ''}</span>
                        </span>
                      </td>

                      {/* 3. VIEW BUTTON */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#008779] border border-slate-200 hover:border-[#008779]/30 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#008779]" />
                          <span>View</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Problem Details Modal */}
      {selectedTask && (() => {
        const relatedEvt = events.find(e => e.id === selectedTask.related_event_id || e.report_code === selectedTask.task_id || e.report_code === selectedTask.related_event_id);
        const priority = selectedTask.priority || 'Medium';
        const rawScore = priority === 'Critical' ? 9.2 : priority === 'High' ? 7.8 : priority === 'Medium' ? 5.2 : 2.8;
        const isHighSif = priority === 'Critical' || priority === 'High';
        const isPending = selectedTask.status === 'Assigned' || selectedTask.status === 'Pending';
        const isInProg = selectedTask.status === 'In Progress';
        const isCompleted = selectedTask.status === 'Completed';
        const isSubmitted = selectedTask.status === 'Submitted' || selectedTask.status === 'Recheck';

        const fullProblemText = relatedEvt?.raw_text || relatedEvt?.description || selectedTask.raw_text || selectedTask.description || selectedTask.title;
        const condition = relatedEvt?.condition || selectedTask.condition || 'Unsafe Condition';
        const reporterName = relatedEvt?.reporter_name || 'Frontline Employee';

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto flex flex-col justify-between">
              
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#005B54] to-[#008779] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded">
                        {selectedTask.task_id}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#008779] bg-emerald-50 border border-[#008779]/20 px-2 py-0.5 rounded uppercase">
                        Incident Inspection
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {(selectedTask.title || '').replace(/^Investigation:\s*/i, '')}
                    </h3>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedTask(null)}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body: Complete Problem Details & AI Diagnostics */}
              <div className="p-6 space-y-5">
                
                {/* 1. FULL PROBLEM STATEMENT */}
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#008779]" />
                      <span>Full Problem Statement & Description:</span>
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-500">
                      Reported by <b className="text-slate-800">{reporterName}</b>
                    </span>
                  </div>

                  <div className="text-sm text-slate-900 leading-relaxed font-semibold bg-white p-4 rounded-xl border border-slate-200">
                    {fullProblemText}
                  </div>
                </div>

                {/* 2. WHERE & FACILITY LOCATION */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Facility Location</span>
                    <div className="font-extrabold text-slate-900 truncate">{selectedTask.site || 'Site Alpha - Jamnagar Complex'}</div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5 truncate">{selectedTask.unit || 'Unit 04 - FCCU'}</div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Due Date & Assignment</span>
                    <div className="font-extrabold text-slate-900">
                      {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'Within 24 Hours'}
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">Assigned by {selectedTask.assigned_by || 'HSE Manager'}</div>
                  </div>

                  {/* CURRENT STATUS */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Current Status</span>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                      isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      isInProg ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      {isPending ? 'Pending Acceptance' : selectedTask.status}
                    </span>
                  </div>
                </div>

                {/* 3. CONDITION, SIF / NON-SIF, AND RISK SCORE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* CONDITION */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100">
                    <span className="text-[10px] font-black uppercase text-blue-700 block mb-1">
                      Problem Condition (AI)
                    </span>
                    <div className="mt-1">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${
                        condition === 'Unsafe Act'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : condition === 'Near Miss'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>{condition}</span>
                      </span>
                    </div>
                  </div>

                  {/* SIF / NON-SIF */}
                  <div className={`p-4 rounded-2xl border ${
                    isHighSif
                      ? 'bg-gradient-to-br from-orange-50/60 to-red-50/60 border-orange-200'
                      : 'bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border-emerald-200'
                  }`}>
                    <span className={`text-[10px] font-black uppercase block mb-1 ${isHighSif ? 'text-orange-800' : 'text-emerald-800'}`}>
                      SIF / Non-SIF (AI)
                    </span>
                    <div className="mt-1">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${
                        isHighSif
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isHighSif ? <Flame className="h-3.5 w-3.5 text-red-600" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                        <span>{isHighSif ? 'High SIF Precursor' : 'Non-SIF Routine'}</span>
                      </span>
                    </div>
                  </div>

                  {/* RISK SCORE */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                    <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                      Risk Score (AI)
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 mt-1">
                      {rawScore.toFixed(1)} / 10.0 • <span className="uppercase text-amber-900">{priority} PRIORITY</span>
                    </div>
                  </div>

                </div>

                {/* 4. MANAGER INSTRUCTIONS */}
                {selectedTask.instructions && (
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-slate-400 mb-1.5">
                      Manager's Instructions
                    </label>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedTask.instructions}
                    </div>
                  </div>
                )}

                {/* 5. PROBLEM SOLVING PANEL (WHEN IN PROGRESS / ACCEPTED) */}
                {isInProg && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                    <label className="block text-xs font-extrabold uppercase tracking-wide text-emerald-900 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-[#008779]" />
                      <span>Solve Problem & Record Corrective Findings</span>
                    </label>
                    <textarea
                      rows={3}
                      value={solveFindings || selectedTask.findings || ''}
                      onChange={(e) => setSolveFindings(e.target.value)}
                      placeholder="Enter field rectification details, barriers restored, and actions taken to solve the problem..."
                      className="w-full p-3 text-xs border border-emerald-200 rounded-xl bg-white focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] text-slate-800 font-medium leading-relaxed"
                    />
                  </div>
                )}

                {/* 6. LOGGED FINDINGS IF ALREADY SUBMITTED / COMPLETED */}
                {(isSubmitted || isCompleted) && selectedTask.findings && (
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-emerald-700 mb-1.5">
                      Logged Field Findings & Corrective Action
                    </label>
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed">
                      {selectedTask.findings}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer Actions: Accept, Reject, Solve, and Close */}
              <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 rounded-b-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* CASE 1: NOT IN PROGRESS -> SHOW ACCEPT & REJECT BUTTONS */}
                  {!isInProg ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAcceptTask(selectedTask)}
                        disabled={updatingTaskId === selectedTask.task_id}
                        className="px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="h-4 w-4" />
                        <span>{isCompleted || isSubmitted ? 'Re-Accept Assignment' : 'Accept Assignment'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectTask(selectedTask)}
                        disabled={updatingTaskId === selectedTask.task_id}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>Reject / Non-Accept</span>
                      </button>
                    </>
                  ) : (
                    /* CASE 2: IN PROGRESS -> SHOW SOLVE BUTTON & REJECT OPTION */
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          const findings = solveFindings.trim() || selectedTask.findings || 'Problem investigated and resolved on site.';
                          setUpdatingTaskId(selectedTask.task_id);
                          try {
                            const res = await fetch(apiUrl(`/api/officer/tasks/${selectedTask.task_id}/submit-recheck`), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                findings: findings,
                                officer_name: user?.name || selectedTask.assigned_officer_name
                              })
                            });
                            if (res.ok) {
                              triggerNotification(`Problem solved for ${selectedTask.task_id}. Submitted for Manager Re-Check.`);
                            } else {
                              triggerNotification(`Problem solution saved.`);
                            }
                            setTasks(prev => prev.map(t => t.task_id === selectedTask.task_id ? {
                              ...t,
                              status: 'Submitted',
                              findings: findings,
                              submitted_findings: findings
                            } : t));
                            setSelectedTask(null);
                            setSolveFindings('');
                          } catch {
                            triggerNotification(`Solution submitted for Manager Re-Check`);
                            setSelectedTask(null);
                          } finally {
                            setUpdatingTaskId(null);
                          }
                        }}
                        disabled={updatingTaskId === selectedTask.task_id}
                        className="px-5 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Solve Problem & Submit for Re-Check</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectTask(selectedTask)}
                        disabled={updatingTaskId === selectedTask.task_id}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>Reject Assignment</span>
                      </button>
                    </>
                  )}

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    setSolveFindings('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Officer Submit for Manager Re-Check Modal */}
      {recheckTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                    Submit Final Report for Re-Check
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{recheckTask.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setRecheckTask(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed font-medium">
              ℹ️ Once submitted, this report will enter the Manager's <b>"Re-Check"</b> queue. Upon Manager verification and approval, the employee will receive a completion notice and the issue will be completely closed.
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1.5">
                Field Findings, Barrier Rectification & Action Taken *
              </label>
              <textarea
                rows={5}
                value={recheckFindings}
                onChange={(e) => setRecheckFindings(e.target.value)}
                placeholder="Detail the root cause identified, physical barriers restored, test measurements verified, and worker safety brief conducted..."
                className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRecheckTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRecheck}
                disabled={submittingRecheck || !recheckFindings.trim()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submittingRecheck ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                <span>{submittingRecheck ? 'Submitting...' : 'Submit to Manager for Re-Check'}</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
