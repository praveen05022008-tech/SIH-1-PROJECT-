import { apiUrl } from '../config/api';
import React, { useState, useEffect } from 'react';
import { SafetyEvent } from '../types';
import { 
  Search, 
  Eye, 
  Filter, 
  RefreshCcw, 
  X, 
  AlertOctagon, 
  ShieldAlert, 
  CheckSquare, 
  Inbox as InboxIcon,
  Camera,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface InboxProps {
  onViewEvent: (event: SafetyEvent) => void;
  triggerStateRefresh: boolean;
}

export const Inbox: React.FC<InboxProps> = ({ onViewEvent, triggerStateRefresh }) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search states
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  // Modal State
  const [selectedAlert, setSelectedAlert] = useState<SafetyEvent | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/events'));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.warn('Events fetch error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [triggerStateRefresh]);

  const clearFilters = () => {
    setSearch('');
    setRiskFilter('All');
    setTypeFilter('All');
    setStatusFilter('All');
    setDateFilter('All');
  };

  // Convert raw status to prompt status format
  const getPromptStatus = (eventStatus: string) => {
    switch (eventStatus) {
      case 'Needs Review': return 'Pending';
      case 'Confirmed': return 'Reviewed';
      case 'Action Dispatched': return 'Action Required';
      case 'Resolved': return 'Resolved';
      default: return 'Pending';
    }
  };

  // Convert raw category to prompt hazard type
  const getPromptType = (evt: SafetyEvent) => {
    if (evt.description.toLowerCase().includes('leakage') || evt.description.toLowerCase().includes('leak')) {
      return 'Unsafe Condition';
    }
    if (evt.description.toLowerCase().includes('violation') || evt.description.toLowerCase().includes('without')) {
      return 'Unsafe Act';
    }
    return 'Near Miss';
  };

  // Calculate summary counts
  const totalAlerts = events.length;
  const highRiskAlerts = events.filter(e => {
    const score = e.sif_risk_score ?? (e.sif_probability / 10);
    return score >= 6.5;
  }).length;
  const pendingReview = events.filter(e => e.status === 'Needs Review').length;
  const reviewedAlerts = events.filter(e => e.status !== 'Needs Review').length;

  // Filter logic
  const filteredEvents = events.filter(e => {
    const score = e.sif_risk_score ?? (e.sif_probability / 10);
    const risk = score >= 8.5 ? 'Critical' : score >= 6.5 ? 'High' : score >= 4.0 ? 'Medium' : 'Low';
    const type = getPromptType(e);
    const status = getPromptStatus(e.status);

    if (riskFilter !== 'All' && risk !== riskFilter) return false;
    if (typeFilter !== 'All' && type !== typeFilter) return false;
    if (statusFilter !== 'All' && status !== statusFilter) return false;
    
    if (search) {
      const q = search.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.hazard?.toLowerCase().includes(q) ||
        e.site.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 2. Alert Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Alerts</span>
            <div className="text-xl font-extrabold mt-1 text-slate-800">{totalAlerts}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Ingested logs</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
            <InboxIcon className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">High Risk</span>
            <div className="text-xl font-extrabold mt-1 text-red-600">{highRiskAlerts}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Score ≥ 6.5</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</span>
            <div className="text-xl font-extrabold mt-1 text-amber-500">{pendingReview}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Triage queue</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-industrial-orange">
            <AlertOctagon className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reviewed</span>
            <div className="text-xl font-extrabold mt-1 text-emerald-600">{reviewedAlerts}</div>
            <p className="text-[9px] text-slate-400 mt-0.5">Audits verified</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckSquare className="h-4.5 w-4.5" />
          </div>
        </div>

      </div>

      {/* 3. Search and Filters Bar */}
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
              placeholder="Search alerts by Alert ID, Hazard keyword, or location..."
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-industrial-blue"
            />
          </div>
          <button 
            onClick={clearFilters}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear Filters</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-50">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              <option value="All">All Risks</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Hazard Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              <option value="All">All Types</option>
              <option value="Unsafe Act">Unsafe Act</option>
              <option value="Unsafe Condition">Unsafe Condition</option>
              <option value="Near Miss">Near Miss</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Assurance Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Action Required">Action Required</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Reporting Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full py-1 px-2.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Safety Alert Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
            <span className="text-xs font-semibold">Loading Safety Alerts queue...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <InboxIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Safety Alerts Found</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-left">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                <tr>
                  <th className="px-5 py-3">Alert ID</th>
                  <th className="px-5 py-3">Hazard / Issue</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 text-center">Risk Level</th>
                  <th className="px-5 py-3 text-center">SIF Potential</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Reported Time</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEvents.map((evt) => {
                  const score = evt.sif_risk_score ?? (evt.sif_probability / 10);
                  const isCritical = score >= 8.5;
                  const isHigh = score >= 6.5 && score < 8.5;
                  const isMedium = score >= 4.0 && score < 6.5;

                  let riskBadgeStyle = 'bg-slate-50 text-slate-600 border-slate-200';
                  let riskDotColor = 'bg-slate-400';
                  if (isCritical) { riskBadgeStyle = 'bg-red-50 text-red-700 border-red-200 font-bold'; riskDotColor = 'bg-red-500'; }
                  else if (isHigh) { riskBadgeStyle = 'bg-orange-50 text-orange-700 border-orange-200 font-bold'; riskDotColor = 'bg-orange-500'; }
                  else if (isMedium) { riskBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200'; riskDotColor = 'bg-amber-500'; }
                  else { riskBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200'; riskDotColor = 'bg-emerald-500'; }

                  const promptStatus = getPromptStatus(evt.status);
                  let statusBadgeStyle = 'bg-slate-50 text-slate-500 border-slate-200';
                  if (promptStatus === 'Pending') statusBadgeStyle = 'bg-amber-50 text-industrial-orange border-amber-100 font-bold';
                  else if (promptStatus === 'Reviewed') statusBadgeStyle = 'bg-blue-50 text-industrial-blue border-blue-100';
                  else if (promptStatus === 'Action Required') statusBadgeStyle = 'bg-red-50 text-red-700 border-red-150 font-extrabold';
                  else if (promptStatus === 'Resolved') statusBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100';

                  const formattedTime = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3 font-bold text-slate-900">{evt.id}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{evt.hazard || 'Safety Precursor hazard'}</td>
                      <td className="px-5 py-3 text-slate-500 font-medium">{getPromptType(evt)}</td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{evt.site}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[9px] ${riskBadgeStyle}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${riskDotColor}`} />
                          <span>{isCritical ? 'Critical' : isHigh ? 'High' : isMedium ? 'Medium' : 'Low'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-slate-800">
                        {evt.sif_probability >= 50.0 ? 'Yes' : 'No'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] border uppercase ${statusBadgeStyle}`}>
                          {promptStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 font-medium">{formattedTime}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelectedAlert(evt)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-[#0B2A56] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto shadow-2xs"
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
        )}
      </div>

      {/* 7. View Alert Drawer / Modal overlay */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-end z-50 animate-fadeIn backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-slideLeft">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#0B2A56] text-white">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Safety Alert Preview</span>
                <h2 className="text-sm font-extrabold mt-1">Inspection details: {selectedAlert.id}</h2>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
              
              {/* Report Information */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Report Information</span>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Alert ID:</span>
                  <span className="font-bold text-slate-800">{selectedAlert.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Reported by:</span>
                  <span className="font-bold text-slate-800">Field Personnel</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Date & time:</span>
                  <span className="font-bold text-slate-800">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Location:</span>
                  <span className="font-bold text-slate-800">{selectedAlert.site} • {selectedAlert.location}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Observation Type:</span>
                  <span className="font-bold text-slate-800">{getPromptType(selectedAlert)}</span>
                </div>
                
                <div className="mt-2.5 pt-2">
                  <span className="text-slate-400 font-medium block mb-1">Hazard Description:</span>
                  <p className="italic bg-slate-50 p-3 border border-slate-200 rounded-lg leading-relaxed text-[11px] text-slate-600">
                    "{selectedAlert.description}"
                  </p>
                </div>
              </div>

              {/* Uploaded Evidence */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Uploaded Evidence Snaps
                </span>
                {selectedAlert.photo_url ? (
                  <div className="border border-slate-200 p-2 bg-slate-50 rounded-xl flex justify-center">
                    <img 
                      src={selectedAlert.photo_url} 
                      alt="Hazard evidence snap" 
                      className="h-28 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                ) : (
                  <div className="text-[10.5px] italic text-slate-400 bg-slate-50 border border-slate-100 p-2 rounded-lg text-center">
                    No photo or video evidence attachments provided.
                  </div>
                )}
              </div>

              {/* AI Assessment */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-industrial-purple" /> AI Ingestion Assessment
                </span>
                
                <div className="grid grid-cols-2 gap-3 py-1 text-xs">
                  <div className="bg-slate-50 p-2 border border-slate-150 rounded-lg text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">Risk Level</span>
                    <div className="font-extrabold mt-0.5 text-red-700 uppercase tracking-wide">
                      {selectedAlert.risk_level ?? 'HIGH'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 border border-slate-150 rounded-lg text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">SIF Potential</span>
                    <div className="font-extrabold mt-0.5 text-slate-800">
                      {selectedAlert.sif_probability >= 50.0 ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">AI Risk Score:</span>
                  <span className="font-bold text-red-600">
                    {selectedAlert.sif_risk_score ?? (selectedAlert.sif_probability / 10).toFixed(1)} / 10
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Detected Safety Rule:</span>
                  <span className="font-bold text-slate-800">{selectedAlert.life_saving_rule}</span>
                </div>

                <div className="mt-2.5">
                  <span className="text-slate-400 font-medium block mb-1">AI Recommendation:</span>
                  <p className="bg-purple-50/50 border border-purple-150 p-2.5 rounded-lg text-[10.5px] text-slate-700 leading-normal font-semibold">
                    {selectedAlert.recommended_action || 'Execute immediate barrier verification.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button
                onClick={() => setSelectedAlert(null)}
                className="flex-1 py-2 border border-slate-250 hover:bg-slate-100 rounded-lg font-bold text-slate-600 transition"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  onViewEvent(selectedAlert);
                  setSelectedAlert(null);
                }}
                className="flex-1 py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Review Alert</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
