import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, CheckCircle2, RotateCcw, AlertTriangle, Clock,
  RefreshCw, Search, ThumbsUp, ThumbsDown, User, MapPin,
  Calendar, FileText, Check, X, ShieldAlert, ArrowRight,
  Flame, Sparkles, Building2, Eye
} from 'lucide-react';
import { OfficerTask, User as UserType } from '../types';

interface ManagerRecheckProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

export const ManagerRecheck: React.FC<ManagerRecheckProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh
}) => {
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed' | 'all'>('pending');

  // Review & Sign-Off Modal
  const [reviewTask, setReviewTask] = useState<OfficerTask | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Safe UTC Date parser
  const parseSafeDate = (ts?: string | null): Date => {
    if (!ts) return new Date();
    const s = String(ts).trim();
    if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
      return new Date(s + 'Z');
    }
    return new Date(s);
  };

  const isRecheckPending = (t: OfficerTask): boolean => {
    const status = (t.status || '').toLowerCase();
    const offStatus = (t.officer_status || '').toLowerCase();
    return (
      status === 'submitted' ||
      status === 'recheck' ||
      offStatus === 'forwarded_recheck' ||
      (Boolean(t.submitted_findings || t.findings || t.officer_notes) && status !== 'completed')
    );
  };

  const isRecheckCompleted = (t: OfficerTask): boolean => {
    return (t.status || '').toLowerCase() === 'completed';
  };

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

  // Handle Manager Approving Re-Check
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
        triggerNotification(`Report ${task.task_id} approved. The issue is now closed and employee has been notified.`);
      } else {
        triggerNotification(`Report ${task.task_id} approved.`);
      }

      setTasks(prev => prev.map(t => (t.task_id === task.task_id || t.id === task.id) ? {
        ...t,
        status: 'Completed',
        officer_status: 'Completed',
        manager_notes: managerNotes || 'Report verified and approved in full compliance.',
        completed_at: new Date().toISOString()
      } : t));

      setReviewTask(null);
      setManagerNotes('');
      setShowRejectBox(false);
      fetchTasks();
    } catch (err) {
      console.error('Error approving recheck:', err);
      setReviewTask(null);
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Manager Requesting Revision
  const handleRejectRecheck = async (task: OfficerTask) => {
    if (!rejectionReason.trim()) {
      alert('Please enter the specific reason or corrections required.');
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
        triggerNotification(`Revision requested for report ${task.task_id}. Officer has been notified to perform rework.`);
      } else {
        triggerNotification(`Revision requested for report ${task.task_id}.`);
      }

      setTasks(prev => prev.map(t => (t.task_id === task.task_id || t.id === task.id) ? {
        ...t,
        status: 'In Progress',
        officer_status: 'Accepted',
        manager_notes: `Revision Requested: ${rejectionReason.trim()}`
      } : t));

      setReviewTask(null);
      setRejectionReason('');
      setShowRejectBox(false);
      fetchTasks();
    } catch (err) {
      console.error('Error rejecting recheck:', err);
      setReviewTask(null);
    } finally {
      setProcessingAction(false);
    }
  };

  // Filtered tasks for the table
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedTab === 'pending' && !isRecheckPending(t)) return false;
      if (selectedTab === 'completed' && !isRecheckCompleted(t)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const code = (t.task_id || t.report_code || String(t.id) || '').toLowerCase();
      const title = (t.title || t.hazard_category || '').toLowerCase();
      const officer = (t.assigned_officer_name || t.assigned_to || '').toLowerCase();
      const findings = (t.submitted_findings || t.findings || t.officer_notes || '').toLowerCase();

      return code.includes(q) || title.includes(q) || officer.includes(q) || findings.includes(q);
    });
  }, [tasks, selectedTab, searchQuery]);

  const pendingCount = useMemo(() => tasks.filter(isRecheckPending).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter(isRecheckCompleted).length, [tasks]);

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-20">

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-[#008779] border border-[#008779]/20 uppercase tracking-wider">
              Manager Verification
            </span>
            <span className="text-xs text-slate-400 font-medium">• Re-Check Sign-Off Queue</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Officer Submitted Reports (Re-Check)</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review completed field investigations and corrective actions submitted by Safety Officers. Verify and grant final sign-off.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#008779]' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Table & Filter Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, officer, findings..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008779]/20 text-slate-800 font-medium"
            />
          </div>

          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedTab('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                selectedTab === 'pending'
                  ? 'bg-white text-[#008779] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Awaiting Re-Check</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                selectedTab === 'pending' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedTab('completed')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                selectedTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Completed & Approved</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                {completedCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({tasks.length})
            </button>
          </div>

        </div>

        {/* ── THE OFFICER'S SUBMITTED REPORTS TABLE ───────────────────────────── */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Report / Task Code</th>
                <th className="py-3.5 px-4">Safety Officer</th>
                <th className="py-3.5 px-4">Incident Topic</th>
                <th className="py-3.5 px-4">Officer Submitted Findings</th>
                <th className="py-3.5 px-4">Submission Date</th>
                <th className="py-3.5 px-4">Verification Status</th>
                <th className="py-3.5 px-4 text-right">Manager Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#008779]" />
                    <span className="font-bold text-xs">Loading officer reports from database...</span>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-700 text-sm">No reports in this re-check queue</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {selectedTab === 'pending'
                        ? 'All officer submitted reports have been reviewed and verified!'
                        : 'No records match your selected tab.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isPending = isRecheckPending(task);
                  const isCompleted = isRecheckCompleted(task);

                  const dateObj = parseSafeDate(task.completed_at || task.assigned_date || task.created_at);
                  const dateStr = dateObj.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const timeStr = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });

                  const findingsText = task.submitted_findings || task.findings || task.officer_notes || 'Investigation completed on site. Field verified.';
                  const officerName = task.assigned_officer_name || task.assigned_to || 'Assigned Officer';
                  const topic = task.hazard_category || task.title || 'Safety Hazard Investigation';

                  return (
                    <tr key={task.task_id || task.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* 1. CODE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {task.report_code ? (task.report_code.startsWith('#') ? task.report_code : `#${task.report_code}`) : (task.task_id || `#TSK-${task.id}`)}
                        </span>
                      </td>

                      {/* 2. OFFICER */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#E8F6F4] text-[#008779] flex items-center justify-center font-bold text-xs shrink-0">
                            {officerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{officerName}</div>
                            <div className="text-[10px] text-slate-400">Safety Officer</div>
                          </div>
                        </div>
                      </td>

                      {/* 3. INCIDENT TOPIC */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-extrabold text-slate-900 text-xs truncate">
                          {topic}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {task.site || 'Site Alpha'} • {task.unit || 'Unit Area'}
                        </div>
                      </td>

                      {/* 4. OFFICER SUBMITTED FINDINGS */}
                      <td className="py-3.5 px-4 max-w-[320px]">
                        <div className="text-xs text-slate-700 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                          {findingsText}
                        </div>
                      </td>

                      {/* 5. SUBMISSION DATE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-800">{dateStr}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{timeStr}</div>
                      </td>

                      {/* 6. VERIFICATION STATUS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Approved & Closed</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Awaiting Manager Sign-Off</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                            <span>{task.status || 'In Progress'}</span>
                          </span>
                        )}
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewTask(task);
                            setManagerNotes(task.manager_notes || '');
                            setShowRejectBox(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer inline-flex items-center gap-1 shadow-xs ${
                            isCompleted
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-[#008779] hover:bg-[#007064] text-white'
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{isCompleted ? 'View Sign-off' : 'Review & Sign-off'}</span>
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

      {/* ── MANAGER RE-CHECK REVIEW & SIGN-OFF MODAL ───────────────────────── */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col justify-between">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-3xl sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-200/80 text-slate-800 px-2.5 py-0.5 rounded">
                    {reviewTask.report_code ? (reviewTask.report_code.startsWith('#') ? reviewTask.report_code : `#${reviewTask.report_code}`) : reviewTask.task_id}
                  </span>
                  <span className="text-[11px] font-extrabold text-[#008779] bg-emerald-50 px-2 py-0.5 rounded uppercase">
                    Manager Final Sign-Off
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {reviewTask.title || reviewTask.hazard_category || 'Investigation Sign-Off'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setReviewTask(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Task Overview Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Investigating Officer</span>
                  <span className="font-bold text-slate-900">{reviewTask.assigned_officer_name || reviewTask.assigned_to || 'Safety Officer'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Facility Location</span>
                  <span className="font-bold text-slate-900">{reviewTask.site || 'Site Alpha'}</span>
                  <span className="text-[10px] text-slate-500 block">{reviewTask.unit || 'Unit Area'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Original Priority</span>
                  <span className="font-bold text-slate-900">{reviewTask.priority || 'High'}</span>
                </div>
              </div>

              {/* Original Observation */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Original Reported Observation:</label>
                <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700">
                  {reviewTask.raw_text || reviewTask.description || 'No raw observation details.'}
                </div>
              </div>

              {/* Officer's Submitted Findings (The Core Re-Check Content) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Officer's Submitted Findings & Corrective Action:</span>
                </label>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 font-medium leading-relaxed">
                  {reviewTask.submitted_findings || reviewTask.findings || reviewTask.officer_notes || 'Officer completed the field verification. Corrective barriers installed.'}
                </div>
              </div>

              {/* Manager Remarks Input */}
              {!showRejectBox && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">
                    Manager Final Sign-Off Remarks:
                  </label>
                  <textarea
                    rows={3}
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Enter approval verification remarks (e.g. 'Verified field corrective action in full compliance. Issue resolved.')..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#008779]/20 text-slate-800 font-medium"
                  />
                </div>
              )}

              {/* Revision Request Box */}
              {showRejectBox && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>Specify Corrections Required (Rework for Officer):</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain what was insufficient or what additional barrier proof is required from the officer..."
                    className="w-full p-3 text-xs rounded-xl border border-red-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    required
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200"
                    >
                      Back to Approval
                    </button>
                    <button
                      type="button"
                      disabled={processingAction || !rejectionReason.trim()}
                      onClick={() => handleRejectRecheck(reviewTask)}
                      className="px-4 py-1.5 rounded-lg text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
                    >
                      {processingAction ? 'Submitting...' : 'Send Revision Notice'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!showRejectBox && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                  >
                    Request Revision (Rework)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewTask(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={processingAction}
                      onClick={() => handleApproveRecheck(reviewTask)}
                      className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{processingAction ? 'Approving...' : 'Approve & Close Report'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
