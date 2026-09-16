import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { SafetyEvent } from '../types';
import { 
  RefreshCcw, 
  Search, 
  Filter, 
  X, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Play, 
  ArrowRight,
  ClipboardList,
  RotateCcw,
  Check
} from 'lucide-react';

interface TrackActionsProps {
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

interface ActionItem {
  id: string; // Action ID (e.g. ACT-1024)
  reportId: string; // Original Report ID (e.g. OBS-1024)
  issue: string; // Hazard/Issue name
  location: string; // Location / Unit
  assignedTeam: string;
  assignedPerson: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  deadline: string;
  createdDate: string;
  instructions: string;
  officerRemarks: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Resolved';
  rejectionReason?: string;
  resolutionDate?: string;
  verifiedBy?: string;
}

export const TrackActions: React.FC<TrackActionsProps> = ({ triggerNotification, triggerStateRefresh }) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');

  // Detail Modal State
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  
  // Verification states
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchActionItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/events'));
      if (!res.ok) throw new Error();
      const events: SafetyEvent[] = await res.json();
      
      // Map safety events that have action ids to ActionItem type
      const mappedActions: ActionItem[] = events
        .filter(e => e.action_id)
        .map(e => ({
          id: e.action_id || 'ACT-1024',
          reportId: e.id,
          issue: e.hazard || 'Safety Precursor Issue',
          location: e.site + ' - ' + e.location,
          assignedTeam: e.assigned_team || 'Maintenance Team',
          assignedPerson: 'Srinath K.',
          priority: e.risk_level === 'CRITICAL' ? 'CRITICAL' : e.risk_level === 'HIGH' ? 'HIGH' : e.risk_level === 'MEDIUM' ? 'MEDIUM' : 'LOW',
          deadline: '30 Aug 2026, 6:00 PM',
          createdDate: new Date(e.timestamp).toLocaleDateString(),
          instructions: e.description,
          officerRemarks: e.reviewer || 'Isolate valve and verify LOTO seals.',
          status: e.action_status === 'Overdue' ? 'Overdue' : e.action_status === 'In Progress' ? 'In Progress' : 'Pending'
        }));

      setActions(mappedActions);
    } catch (err) {
      console.warn("API error fetching actions:", err);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [triggerStateRefresh]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setTeamFilter('All');
  };

  // Summaries
  const pendingCount = actions.filter(a => a.status === 'Pending').length;
  const inProgressCount = actions.filter(a => a.status === 'In Progress').length;
  const completedCount = actions.filter(a => a.status === 'Completed').length;
  const overdueCount = actions.filter(a => a.status === 'Overdue').length;

  // Filter
  const filteredActions = actions.filter(a => {
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && a.priority !== priorityFilter) return false;
    if (teamFilter !== 'All' && a.assignedTeam !== teamFilter) return false;
    
    if (search) {
      const q = search.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.issue.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Action status updates
  const handleUpdateStatus = (actionId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: newStatus } : a));
    if (selectedAction?.id === actionId) {
      setSelectedAction(prev => prev ? { ...prev, status: newStatus } : null);
    }
    triggerNotification(`Action ${actionId} status changed to ${newStatus}`);
  };

  // Verification handling
  const handleVerifyResolution = (actionId: string, confirm: boolean) => {
    if (confirm) {
      setActions(prev => prev.map(a => a.id === actionId ? { 
        ...a, 
        status: 'Resolved',
        resolutionDate: new Date().toLocaleDateString(),
        verifiedBy: 'Safety Officer Lead'
      } : a));
      
      setSelectedAction(prev => prev ? { 
        ...prev, 
        status: 'Resolved',
        resolutionDate: new Date().toLocaleDateString(),
        verifiedBy: 'Safety Officer Lead'
      } : null);

      setSuccessBanner("Resolution verified: Safety Issue Resolved.");
      triggerNotification(`Action ${actionId} resolution verified.`);
    } else {
      setShowRejectionInput(true);
    }
  };

  const submitRejection = (actionId: string) => {
    if (!rejectionReason.trim()) return;

    setActions(prev => prev.map(a => a.id === actionId ? { 
      ...a, 
      status: 'In Progress',
      rejectionReason: rejectionReason 
    } : a));

    setSelectedAction(prev => prev ? { 
      ...prev, 
      status: 'In Progress',
      rejectionReason: rejectionReason 
    } : null);

    setSuccessBanner("Action sent back for correction.");
    setShowRejectionInput(false);
    setRejectionReason('');
    triggerNotification(`Action ${actionId} rejected and sent back.`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading actions logbook...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 2. ACTION SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
            <div className="text-xl font-extrabold mt-1 text-slate-800">{pendingCount}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Waiting to start</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Clock className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
            <div className="text-xl font-extrabold mt-1 text-slate-800">{inProgressCount}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Active field tasks</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-industrial-blue">
            <Play className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
            <div className="text-xl font-extrabold mt-1 text-slate-800">{completedCount}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Awaiting verification</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overdue</span>
            <div className="text-xl font-extrabold mt-1 text-red-650">{overdueCount}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Missed deadlines</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="h-4.5 w-4.5" />
          </div>
        </div>

      </div>

      {/* 3. SEARCH AND FILTERS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions by Action ID, Safety Issue, or location..."
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            />
          </div>
          <button 
            onClick={clearFilters}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-655 rounded-lg text-xs font-semibold transition"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear Filters</span>
          </button>
        </div>

        {/* Dropdown filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-50 text-xs">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Action Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Priority Level</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Assigned Team</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="All">All Teams</option>
              <option value="Maintenance Team">Maintenance Team</option>
              <option value="Operations Team">Operations Team</option>
              <option value="Safety Team">Safety Team</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. ACTION LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150 text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
              <tr>
                <th className="px-5 py-3">Action ID</th>
                <th className="px-5 py-3">Safety Issue</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Assigned Team</th>
                <th className="px-5 py-3 text-center">Priority</th>
                <th className="px-5 py-3">Deadline</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredActions.map((a) => {
                let statusStyle = 'bg-slate-50 text-slate-600 border-slate-200';
                if (a.status === 'Pending') statusStyle = 'bg-amber-50 text-industrial-orange border-amber-200 font-bold';
                else if (a.status === 'In Progress') statusStyle = 'bg-blue-50 text-industrial-blue border-blue-200 font-bold';
                else if (a.status === 'Completed') statusStyle = 'bg-emerald-50 text-emerald-800 border-emerald-250 font-bold';
                else if (a.status === 'Overdue') statusStyle = 'bg-red-50 text-red-750 border-red-200 font-extrabold animate-pulse';
                else if (a.status === 'Resolved') statusStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold';

                let priorityStyle = 'bg-slate-50 text-slate-500 border-slate-200';
                if (a.priority === 'CRITICAL') priorityStyle = 'bg-red-50 text-red-700 border-red-200';
                else if (a.priority === 'HIGH') priorityStyle = 'bg-orange-50 text-orange-700 border-orange-200';
                else if (a.priority === 'MEDIUM') priorityStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                else if (a.priority === 'LOW') priorityStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3 font-bold text-slate-900">{a.id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{a.issue}</td>
                    <td className="px-5 py-3 text-slate-500">{a.location}</td>
                    <td className="px-5 py-3 text-slate-600 font-medium">{a.assignedTeam}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] uppercase font-bold ${priorityStyle}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-medium">{a.deadline}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 border rounded text-[9px] uppercase ${statusStyle}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedAction(a);
                          setSuccessBanner(null);
                          setShowRejectionInput(false);
                          setRejectionReason('');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-[#0B2A56] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto shadow-3xs"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. VIEW ACTION DETAILS PANEL / DRAWER */}
      {selectedAction && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-end z-50 animate-fadeIn backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-slideLeft">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#0B2A56] text-white">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Corrective Action Monitor</span>
                <h2 className="text-sm font-extrabold mt-1">Status: {selectedAction.id}</h2>
              </div>
              <button 
                onClick={() => setSelectedAction(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
              
              {/* Success validation alerts */}
              {successBanner && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn font-semibold">
                  <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span>{successBanner}</span>
                </div>
              )}

              {/* ACTION INFORMATION */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Action Information</span>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Action ID:</span>
                  <span className="font-bold text-slate-800">{selectedAction.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Original Report ID:</span>
                  <span className="font-bold text-slate-800">{selectedAction.reportId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Safety Issue:</span>
                  <span className="font-bold text-slate-800">{selectedAction.issue}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Location:</span>
                  <span className="font-bold text-slate-800">{selectedAction.location}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Priority:</span>
                  <span className="font-bold text-red-655 uppercase">{selectedAction.priority}</span>
                </div>
              </div>

              {/* ASSIGNMENT */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsibility</span>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Assigned Team:</span>
                  <span className="font-bold text-slate-800">{selectedAction.assignedTeam}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Responsible Person:</span>
                  <span className="font-bold text-slate-800">{selectedAction.assignedPerson}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Deadline:</span>
                  <span className="font-bold text-red-600">{selectedAction.deadline}</span>
                </div>
              </div>

              {/* ACTION DETAILS */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Action Instructions</span>
                <p className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg leading-relaxed text-slate-600 italic">
                  "{selectedAction.instructions}"
                </p>
                {selectedAction.rejectionReason && (
                  <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 font-semibold leading-relaxed">
                    <span className="block font-bold text-[9px] text-red-700 uppercase tracking-wider mb-0.5">Correction Loop Feedback:</span>
                    "{selectedAction.rejectionReason}"
                  </div>
                )}
              </div>

              {/* PROGRESS TIMELINE */}
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progress Status</span>
                
                <div className="flex flex-col gap-2.5 pl-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-emerald-600 border-2 border-emerald-100 flex items-center justify-center text-[9px] text-white">✓</div>
                    <span className="font-bold text-slate-800">Action Created</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-emerald-600 border-2 border-emerald-100 flex items-center justify-center text-[9px] text-white">✓</div>
                    <span className="font-bold text-slate-800">Assigned Team</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center text-[9px] ${
                      selectedAction.status !== 'Pending' ? 'bg-emerald-600 border-emerald-100 text-white' : 'bg-slate-100 border-slate-300'
                    }`}>{selectedAction.status !== 'Pending' ? '✓' : ''}</div>
                    <span className={`font-semibold ${selectedAction.status !== 'Pending' ? 'text-slate-800' : 'text-slate-400'}`}>In Progress</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center text-[9px] ${
                      selectedAction.status === 'Completed' || selectedAction.status === 'Resolved' ? 'bg-emerald-600 border-emerald-100 text-white' : 'bg-slate-100 border-slate-300'
                    }`}>{selectedAction.status === 'Completed' || selectedAction.status === 'Resolved' ? '✓' : ''}</div>
                    <span className={`font-semibold ${selectedAction.status === 'Completed' || selectedAction.status === 'Resolved' ? 'text-slate-800' : 'text-slate-400'}`}>Completed</span>
                  </div>
                </div>
              </div>

              {/* 8. ACTION STATUS UPDATE (Allows updates to Pending / In Progress / Completed) */}
              {selectedAction.status !== 'Resolved' && (
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Update Status</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedAction.id, 'Pending')}
                      className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition ${
                        selectedAction.status === 'Pending' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedAction.id, 'In Progress')}
                      className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition ${
                        selectedAction.status === 'In Progress' ? 'bg-blue-50 border-blue-300 text-industrial-blue' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedAction.id, 'Completed')}
                      className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition ${
                        selectedAction.status === 'Completed' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              )}

              {/* 7. OFFICER VERIFICATION (Only when status is Completed) */}
              {selectedAction.status === 'Completed' && (
                <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Verify Resolution</span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifyResolution(selectedAction.id, true)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition text-[10.5px] flex items-center justify-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Confirm Resolution</span>
                    </button>
                    <button
                      onClick={() => handleVerifyResolution(selectedAction.id, false)}
                      className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition text-[10.5px] flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Send Back</span>
                    </button>
                  </div>

                  {showRejectionInput && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 animate-fadeIn">
                      <label className="block text-[9px] font-bold text-red-700 uppercase tracking-wider">Reason for Rejection</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why the repair needs revision... (e.g. Repair completed, but the area still requires additional inspection.)"
                        rows={2}
                        className="block w-full px-2.5 py-1.5 border border-slate-350 rounded-lg text-xs"
                      />
                      <button
                        onClick={() => submitRejection(selectedAction.id)}
                        className="w-full py-1 bg-red-650 hover:bg-red-705 text-white rounded-lg font-bold text-[10px] transition"
                      >
                        Submit Rejection
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 9. RESOLUTION STATE */}
              {selectedAction.status === 'Resolved' && (
                <div className="bg-indigo-50/40 border border-indigo-200 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-650" /> Safety Issue Resolved
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-750">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Action ID:</span>
                      <span className="font-bold text-slate-800">{selectedAction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolution Date:</span>
                      <span className="font-bold text-slate-800">{selectedAction.resolutionDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verified By:</span>
                      <span className="font-bold text-slate-800">{selectedAction.verifiedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Final Status:</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-extrabold text-[8px]">
                        RESOLVED
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setSelectedAction(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg font-bold transition"
              >
                Close Monitor
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
