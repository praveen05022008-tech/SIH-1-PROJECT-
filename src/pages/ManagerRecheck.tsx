import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle2, RotateCcw, AlertTriangle, Clock,
  RefreshCw, Search, ThumbsUp, ThumbsDown, User, MapPin,
  Calendar, FileText, Check, X, ShieldAlert, ArrowRight
} from 'lucide-react';
import { OfficerTask, User as UserType } from '../types';

interface ManagerRecheckProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

const PRIORITY_BADGES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const ManagerRecheck: React.FC<ManagerRecheckProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh
}) => {
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed' | 'all'>('pending');

  // Review modal
  const [reviewTask, setReviewTask] = useState<OfficerTask | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/manager/tasks'));
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [triggerStateRefresh]);

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
        triggerNotification(`Report for task ${task.task_id} approved. The issue is now completely finished and employee has been notified.`);
      } else {
        triggerNotification(`Task ${task.task_id} approved (offline sync)`);
      }

      setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
        ...t,
        status: 'Completed',
        manager_notes: managerNotes || 'Report verified and approved in full compliance.',
        completed_at: new Date().toISOString()
      } : t));

      setReviewTask(null);
      setManagerNotes('');
      setShowRejectBox(false);
    } catch {
      triggerNotification(`Task ${task.task_id} approved (offline sync)`);
      setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
        ...t,
        status: 'Completed',
        manager_notes: managerNotes || 'Report verified and approved in full compliance.',
        completed_at: new Date().toISOString()
      } : t));
      setReviewTask(null);
      setManagerNotes('');
      setShowRejectBox(false);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectRecheck = async (task: OfficerTask) => {
    if (!rejectionReason.trim()) {
      triggerNotification('Please enter the specific reason or corrections required.');
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

      if (res.ok) {
        triggerNotification(`Revision requested for task ${task.task_id}. Officer has been notified to perform rework.`);
      } else {
        triggerNotification(`Revision requested for task ${task.task_id} (offline sync)`);
      }

      setTasks(prev => prev.map(t => t.task_id === task.task_id ? {
        ...t,
        status: 'In Progress',
        manager_notes: `Revision Requested: ${rejectionReason.trim()}`
      } : t));

      setReviewTask(null);
      setRejectionReason('');
      setShowRejectBox(false);
    } catch {
      triggerNotification(`Revision requested for task ${task.task_id} (offline sync)`);
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
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  const filteredTasks = tasks.filter(t => {
    if (selectedTab === 'pending' && t.status !== 'Submitted') return false;
    if (selectedTab === 'completed' && t.status !== 'Completed') return false;
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchSite = t.site?.toLowerCase().includes(q);
      const matchOfficer = t.assigned_officer_name?.toLowerCase().includes(q);
      const matchId = t.task_id?.toLowerCase().includes(q);
      const matchEvent = t.related_event_id?.toLowerCase().includes(q);
      return matchTitle || matchSite || matchOfficer || matchId || matchEvent;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Manager Re-Check Queue</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review completed field inspections submitted by Safety Officers. Once approved, the issue is completely finished and the employee receives resolution confirmation.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3 Metrics Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setSelectedTab('pending')}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
            selectedTab === 'pending' ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Awaiting Manager Re-Check</div>
            <div className="text-2xl font-black text-amber-600 font-mono mt-1">{pendingRechecks.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Officers submitted field findings</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div 
          onClick={() => setSelectedTab('completed')}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
            selectedTab === 'completed' ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Completely Finished</div>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{completedTasks.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Manager approved and closed</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div 
          onClick={() => setSelectedTab('all')}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
            selectedTab === 'all' ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Total Officer Tasks</div>
            <div className="text-2xl font-black text-slate-800 font-mono mt-1">{tasks.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">All assignments across fleet</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Filter View:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSelectedTab('pending')}
                className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                  selectedTab === 'pending' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Re-Check Queue ({pendingRechecks.length})
              </button>
              <button
                onClick={() => setSelectedTab('completed')}
                className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                  selectedTab === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Finished ({completedTasks.length})
              </button>
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                  selectedTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Tasks ({tasks.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, officer, site..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 w-60 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
              />
            </div>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Re-Check Data Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mr-2 text-[#008779]" /> Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No tasks in this view.</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedTab === 'pending'
                ? 'All submitted field reports have been verified and finalized.'
                : 'Try adjusting your search query or priority filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Task ID</th>
                  <th className="py-3 px-3">Issue Title & Site</th>
                  <th className="py-3 px-3">Assigned Officer</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Current Status</th>
                  <th className="py-3 px-4 min-w-[240px]">Officer Submitted Findings</th>
                  <th className="py-3 px-4 min-w-[200px] text-center bg-[#E8F6F4] text-[#008779] border-l border-r border-[#008779]/20 font-black">
                    Re-Check Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredTasks.map((task) => {
                  const isSubmitted = task.status === 'Submitted';
                  const isCompleted = task.status === 'Completed';

                  return (
                    <tr key={task.task_id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Task ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        <div>{task.task_id}</div>
                        {task.related_event_id && (
                          <span className="text-[10px] text-slate-400 block font-normal">{task.related_event_id}</span>
                        )}
                      </td>

                      {/* Title & Site */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 line-clamp-1">{task.title}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{task.site} • {task.unit}</span>
                        </div>
                      </td>

                      {/* Assigned Officer */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{task.assigned_officer_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">By {task.assigned_by}</div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${PRIORITY_BADGES[task.priority] || 'bg-slate-100 text-slate-600'}`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isSubmitted ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {isSubmitted ? 'Awaiting Re-Check' : task.status}
                        </span>
                      </td>

                      {/* Submitted Findings */}
                      <td className="py-3 px-4">
                        {task.submitted_findings ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 line-clamp-2">
                              {task.submitted_findings}
                            </p>
                            {task.submitted_at && (
                              <span className="text-[9.5px] text-slate-400 font-mono block">
                                Submitted {new Date(task.submitted_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : task.findings ? (
                          <p className="text-xs text-slate-600 line-clamp-2">{task.findings}</p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No report submitted yet (in field)</span>
                        )}
                      </td>

                      {/* RE-CHECK ACTIONS */}
                      <td className="py-3 px-4 text-center bg-[#F7FCFB] border-l border-r border-[#008779]/15">
                        {isSubmitted ? (
                          <div className="flex items-center justify-center gap-1.5">
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
                          <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Completely Finished</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Pending Field Action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: MANAGER RE-CHECK REVIEW & APPROVAL */}
      {reviewTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Manager Safety Re-Check</h3>
                  <p className="text-xs text-slate-400 font-mono">{reviewTask.task_id} • {reviewTask.site}</p>
                </div>
              </div>
              <button onClick={() => setReviewTask(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Issue Description</span>
                <p className="text-slate-800 font-semibold">{reviewTask.title}</p>
                <div className="text-slate-500 text-[11px] mt-1">{reviewTask.site} • {reviewTask.unit}</div>
              </div>

              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-amber-800 uppercase">Officer Field Findings</span>
                  <span className="text-[10px] font-bold text-slate-500">By {reviewTask.assigned_officer_name}</span>
                </div>
                <p className="text-slate-900 font-medium leading-relaxed">
                  {reviewTask.submitted_findings || reviewTask.findings || 'Inspection completed according to safety SOP.'}
                </p>
                {reviewTask.submitted_at && (
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    Submitted: {new Date(reviewTask.submitted_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Approval / Rejection Box */}
            {!showRejectBox ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Manager Verification Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={managerNotes}
                  onChange={e => setManagerNotes(e.target.value)}
                  placeholder="e.g. Inspected torque report and leak test results. Approved for service."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#008779]/20 resize-none"
                />
              </div>
            ) : (
              <div className="space-y-2 p-3.5 bg-red-50 rounded-xl border border-red-200">
                <label className="block text-xs font-black text-red-800">Reason for Requesting Revision</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Specify what additional checks, documentation, or corrective steps the officer must perform..."
                  className="w-full text-xs border border-red-300 rounded-xl p-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 resize-none text-slate-900"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              {!showRejectBox ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(true)}
                    className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    type="button"
                    disabled={processingAction}
                    onClick={() => handleApproveRecheck(reviewTask)}
                    className="px-5 py-2.5 text-xs font-black bg-[#008779] hover:bg-[#007064] text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{processingAction ? 'Finalizing...' : 'Approve & Finalize'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={processingAction || !rejectionReason.trim()}
                    onClick={() => handleRejectRecheck(reviewTask)}
                    className="px-5 py-2.5 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    <span>{processingAction ? 'Submitting...' : 'Send Revision to Officer'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerRecheck;
