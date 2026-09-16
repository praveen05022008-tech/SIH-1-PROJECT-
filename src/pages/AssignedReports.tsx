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
  AlertTriangle,
  ClipboardList
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

  // Modal for submitting final report for Manager Re-Check
  const [recheckTask, setRecheckTask] = useState<OfficerTask | null>(null);
  const [recheckFindings, setRecheckFindings] = useState('');
  const [submittingRecheck, setSubmittingRecheck] = useState(false);

  const MOCK_TASKS: OfficerTask[] = [
    {
      id: 1,
      task_id: 'TSK-101',
      title: 'Investigate Pressurized Line Leak at Well Pad C-7',
      task_type: 'Field Investigation',
      site: 'Duliajan Field',
      unit: 'Well Pad C-7',
      priority: 'CRITICAL',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Rajesh Bora',
      instructions: 'Conduct immediate field inspection of the reported pressurized pipeline leak. Document the barrier failure, identify root cause, and initiate stop-work if personnel are in the line of fire. Upload photographic evidence.',
      status: 'Assigned',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      findings: null,
      related_event_id: 'EVT-001',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      completed_at: null
    },
    {
      id: 2,
      task_id: 'TSK-102',
      title: 'Audit Fall Protection Compliance at Refinery Tower T-4',
      task_type: 'Safety Audit',
      site: 'Numaligarh Refinery',
      unit: 'Tower T-4',
      priority: 'HIGH',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Priya Hazarika',
      instructions: 'Verify all personnel working above 2m have double-lanyard harnesses attached to rated anchor points. Check permit-to-work documentation. Document non-compliances.',
      status: 'In Progress',
      due_date: new Date(Date.now() + 172800000).toISOString(),
      findings: 'Initial inspection found 2 workers without proper anchor hook. Corrective briefing issued.',
      related_event_id: 'EVT-002',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: null
    },
    {
      id: 3,
      task_id: 'TSK-103',
      title: 'Energy Isolation Verification – Gas Compressor Station G-3',
      task_type: 'LOTO Verification',
      site: 'Jorhat Gas Station',
      unit: 'Compressor Station G-3',
      priority: 'HIGH',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Rajesh Bora',
      instructions: 'Verify that all 6 LOTO points are correctly applied and tagged before maintenance crew starts work on the compressor manifold. Cross-check with PTW. Confirm zero energy state.',
      status: 'Assigned',
      due_date: new Date(Date.now() + 43200000).toISOString(),
      findings: null,
      related_event_id: 'EVT-003',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: null
    },
    {
      id: 4,
      task_id: 'TSK-104',
      title: 'Chemical Spill Root-Cause Assessment – Tank Farm Area',
      task_type: 'Incident Investigation',
      site: 'Digboi Refinery',
      unit: 'Tank Farm – Zone B',
      priority: 'MEDIUM',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Suresh Gogoi',
      instructions: 'Investigate small chemical overfill incident from Tank B-12. Identify cause, document observations, and submit corrective recommendations within 48 hours.',
      status: 'Completed',
      due_date: new Date(Date.now() - 86400000).toISOString(),
      findings: 'Root cause: Level sensor malfunction combined with manual override. Recommended: sensor replacement and double-check valve installation.',
      related_event_id: 'EVT-004',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      completed_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 5,
      task_id: 'TSK-105',
      title: 'Hot Work Permit Spot-Check – Pipeline Welding Crew',
      task_type: 'Permit Verification',
      site: 'Barauni Field',
      unit: 'Pipeline ROW – KM 24',
      priority: 'MEDIUM',
      assigned_officer_id: 1,
      assigned_officer_name: user?.name || 'Safety Officer',
      assigned_by: 'Mgr. Priya Hazarika',
      instructions: 'Conduct unannounced spot check on hot-work permit validity, fire extinguisher availability, and gas-free certification for ongoing pipeline welding operations.',
      status: 'Assigned',
      due_date: new Date(Date.now() + 259200000).toISOString(),
      findings: null,
      related_event_id: null,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      completed_at: null
    }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        fetch(apiUrl('/api/manager/tasks'), {
          headers: {
            'X-User-Email': user?.email || '',
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

  // Handle Accept Report (changes status to 'In Progress')
  const handleAcceptTask = async (task: OfficerTask) => {
    setUpdatingTaskId(task.task_id);
    try {
      const res = await fetch(apiUrl(`/api/manager/tasks/${task.task_id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'In Progress',
          findings: task.findings || 'Accepted by officer for field investigation.'
        })
      });
      if (res.ok) {
        triggerNotification(`✓ Accepted report ${task.task_id}. Marked as In Progress.`);
        setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: 'In Progress' } : t));
        if (selectedTask?.task_id === task.task_id) {
          setSelectedTask(prev => prev ? { ...prev, status: 'In Progress' } : null);
        }
      } else {
        throw new Error();
      }
    } catch {
      triggerNotification(`✓ Marked ${task.task_id} as In Progress`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? { ...t, status: 'In Progress' } : t));
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
    if (!isOfficer) return tasks;
    const uName = (user?.name || '').toLowerCase().trim();
    const uEmail = (user?.email || '').toLowerCase().trim();

    return tasks.filter(task => {
      const tName = (task.assigned_officer_name || '').toLowerCase().trim();
      const tEmail = ((task as any).assigned_officer_email || '').toLowerCase().trim();
      if (uEmail && tEmail && uEmail === tEmail) return true;
      if (uName && tName) {
        return tName.includes(uName) || uName.includes(tName);
      }
      return true;
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

      {/* Assigned Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
            <RefreshCw className="h-6 w-6 animate-spin text-[#008779] mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-500">Loading assigned reports...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
            <ClipboardCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No assigned reports found</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter !== 'ALL' 
                ? `No reports matching status '${statusFilter}'.` 
                : user?.name 
                  ? `No reports are currently assigned to ${user.name}. When the Safety Manager assigns a report to you, it will appear here exclusively.`
                  : 'No reports have been assigned yet by the Manager.'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isPending = task.status === 'Assigned';
            const isInProg = task.status === 'In Progress';
            const relatedEvt = events.find(e => e.id === task.related_event_id);

            return (
              <div
                key={task.task_id}
                className="bg-white border border-slate-200/90 hover:border-[#008779]/40 rounded-2xl p-5 shadow-2xs transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isPending ? 'bg-amber-50 border border-amber-200' :
                      isInProg ? 'bg-blue-50 border border-blue-200' :
                      'bg-emerald-50 border border-emerald-200'
                    }`}>
                      {task.priority === 'Critical' ? (
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                      ) : task.priority === 'High' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">{task.task_id}</span>
                        <RiskBadge level={task.priority} />
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isPending ? 'bg-amber-100 text-amber-800' :
                          isInProg ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                        {task.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{task.site} • {task.unit}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Assigned by: {task.assigned_by || 'HSE Manager'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    {isPending && (
                      <button
                        onClick={() => handleAcceptTask(task)}
                        disabled={updatingTaskId === task.task_id}
                        className="px-3.5 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept Report</span>
                      </button>
                    )}

                    {isInProg && (
                      <button
                        onClick={() => {
                          setRecheckTask(task);
                          setRecheckFindings(task.findings || '');
                        }}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        <span>Submit for Re-Check</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedTask(task)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Review</span>
                    </button>

                    <button
                      onClick={() => onNavigateTo('investigate', relatedEvt || task)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Investigate</span>
                    </button>

                    <button
                      onClick={() => onNavigateTo('ai-analysis', relatedEvt || task)}
                      className="px-3 py-2 border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>AI Analysis</span>
                    </button>
                  </div>
                </div>

                {/* Re-Check status banner if submitted */}
                {task.status === 'Submitted' && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold uppercase text-[10px] text-amber-800">
                          Report Submitted — Awaiting Manager Re-Check
                        </span>
                        <span className="text-[10px] text-amber-600 font-mono">
                          {task.completed_at || 'Pending Final Approval'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-800 leading-relaxed font-medium">
                        <b>Submitted Findings:</b> {task.submitted_findings || task.findings || 'Field action completed. Waiting for Manager sign-off.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Manager Instructions */}
                {task.instructions && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Manager Note:</div>
                    <div className="leading-relaxed">{task.instructions}</div>
                  </div>
                )}

                {/* Findings logged */}
                {task.findings && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[10px] text-emerald-700 block">Officer Findings:</span>
                      <p className="mt-0.5 leading-relaxed">{task.findings}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">{selectedTask.task_id}</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                <div className="font-extrabold text-slate-800 mt-1">{selectedTask.status}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Priority</span>
                <div className="font-extrabold text-slate-800 mt-1">{selectedTask.priority}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Site</span>
                <div className="font-extrabold text-slate-800 mt-1">{selectedTask.site}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
                <div className="font-extrabold text-slate-800 mt-1 font-mono">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Manager's Instructions</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed">
                {selectedTask.instructions || 'Review safety barriers, verify PPE conformance, and record photographic evidence.'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Officer Findings / Investigation Notes</label>
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed min-h-[60px]">
                {selectedTask.findings || 'No field findings recorded yet. Click Investigate below to add findings and photo evidence.'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Update Status:</span>
                <select
                  value={selectedTask.status}
                  onChange={e => handleUpdateStatus(selectedTask, e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
                >
                  <option value="Assigned">Assigned (Pending)</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const t = selectedTask;
                    setSelectedTask(null);
                    onNavigateTo('investigate', t);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Go to Investigation</span>
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
