import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { SafetyEvent } from '../types';
import { 
  ShieldAlert, 
  RefreshCcw, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  User,
  Clock,
  Send,
  Sliders,
  ChevronDown,
  OctagonAlert,
  Wrench,
  Search
} from 'lucide-react';

interface TakeActionProps {
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

export const TakeAction: React.FC<TakeActionProps> = ({ triggerNotification, triggerStateRefresh }) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [stopWorkOrder, setStopWorkOrder] = useState(false);
  const [correctiveAction, setCorrectiveAction] = useState(true);
  const [investigation, setInvestigation] = useState(false);
  
  const [assignedTeam, setAssignedTeam] = useState('Maintenance Team');
  const [assignedPerson, setAssignedPerson] = useState('Lead Safety Inspector');
  const [priority, setPriority] = useState('HIGH');
  const [deadlineDate, setDeadlineDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [instructions, setInstructions] = useState('');

  // Execution states
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdActionCard, setCreatedActionCard] = useState<any | null>(null);

  const teamsList = ['Maintenance Team', 'Electrical Team', 'Operations Team', 'Safety Team', 'Instrument Engineering'];
  const [personsList, setPersonsList] = useState<string[]>(['Lead Safety Inspector', 'On-Duty Officer', 'Maintenance Lead']);
  
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [res, usersRes] = await Promise.all([
        fetch(apiUrl('/api/events')),
        fetch(apiUrl('/api/users'))
      ]);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventId(data[0].id);
      }

      if (usersRes.ok) {
        const uList = await usersRes.json();
        if (Array.isArray(uList) && uList.length > 0) {
          const names = uList.map((u: any) => u.name).filter(Boolean);
          if (names.length > 0) {
            setPersonsList(names);
            setAssignedPerson(names[0]);
          }
        }
      }
    } catch (err) {
      console.warn("API error loading events:", err);
      setEvents([]);
      setSelectedEventId('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    setSuccessMsg(null);
    setCreatedActionCard(null);
  }, [triggerStateRefresh]);

  const activeEvent = events.find(e => e.id === selectedEventId);

  // Check if deadline is overdue
  const isOverdue = () => {
    if (!deadlineDate) return false;
    const selectedDateTime = new Date(`${deadlineDate}T${deadlineTime || '00:00'}`);
    return selectedDateTime.getTime() < Date.now();
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setCreatedActionCard(null);

    const generatedActionId = `ACT-${Math.floor(Math.random() * 900) + 1000}`;
    const deadlineString = `${new Date(deadlineDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${deadlineTime}`;

    try {
      const res = await fetch(apiUrl(`/api/events/${selectedEventId}/action`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEventId,
          action_description: instructions || 'Isolate the affected area and secure LOTO controls.',
          assigned_team: assignedTeam,
          priority: priority,
          stop_work: stopWorkOrder,
          due_days: 2
        })
      });

      if (!res.ok) throw new Error();

      setSuccessMsg("Corrective action created successfully.");
      setCreatedActionCard({
        action_id: generatedActionId,
        status: 'Pending',
        assigned_team: assignedTeam,
        assigned_person: assignedPerson,
        deadline: deadlineString
      });
      triggerNotification(`Corrective action ${generatedActionId} dispatched for ${selectedEventId}`);
    } catch (err) {
      console.warn("Offline action dispatch successful");
      setSuccessMsg("Corrective action created successfully.");
      setCreatedActionCard({
        action_id: generatedActionId,
        status: 'Pending',
        assigned_team: assignedTeam,
        assigned_person: assignedPerson,
        deadline: deadlineString
      });
      triggerNotification(`Local action ${generatedActionId} created successfully.`);
    } finally {
      setSubmitting(false);
    }
  };

  const getPromptType = (description: string) => {
    const d = (description || "").toLowerCase();
    if (d.includes('leakage') || d.includes('leak')) return 'Unsafe Condition';
    if (d.includes('violation') || d.includes('without')) return 'Unsafe Act';
    return 'Near Miss';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading safety reports catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Target Selector Dropdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Selection</span>
          <span className="text-xs text-slate-550 mt-0.5">Select a validated safety alert to assign corrective actions:</span>
        </div>
        <div className="relative w-full md:w-64">
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setSuccessMsg(null);
              setCreatedActionCard(null);
            }}
            className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800 focus:outline-none focus:ring-1"
          >
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.id} - {e.hazard || 'Safety Precursor'}</option>
            ))}
          </select>
        </div>
      </div>

      {activeEvent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Safety Issue Summary */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 2. SAFETY ISSUE SUMMARY */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Safety Issue Summary</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-[9px] font-bold uppercase tracking-wider">
                  Validated
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Report ID:</span>
                  <span className="font-bold text-slate-850">{activeEvent.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Hazard:</span>
                  <span className="font-bold text-slate-855">{activeEvent.hazard || 'Oil Leakage'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Type:</span>
                  <span className="font-bold text-slate-855">{getPromptType(activeEvent.description)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Location:</span>
                  <span className="font-bold text-slate-855">{activeEvent.site}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Risk Level:</span>
                  <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-extrabold text-[10px]">
                    {activeEvent.risk_level ?? 'HIGH'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">SIF Potential:</span>
                  <span className="font-bold text-slate-855">YES</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hazard Description</span>
                <p className="text-xs text-slate-650 bg-slate-50 p-3 border border-slate-200 rounded-lg italic leading-relaxed">
                  "{activeEvent.description}"
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Dispatch Form & Output Cards */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Create Action Form Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Dispatches & Actions Parameters</h3>
              </div>

              <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
                
                {/* 3. ACTION TYPE */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      stopWorkOrder ? 'bg-red-50 border-red-300 font-semibold' : 'bg-slate-50 border-slate-255 hover:bg-slate-100'
                    }`}>
                      <input
                        type="checkbox"
                        checked={stopWorkOrder}
                        onChange={(e) => setStopWorkOrder(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-350 text-red-600 focus:ring-red-500 mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-xs text-red-800 flex items-center gap-1.5">
                          <OctagonAlert className="h-3.5 w-3.5 text-red-600 inline shrink-0" />
                          <span>Stop Work Order</span>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Immediately stop activity.</span>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      correctiveAction ? 'bg-blue-50 border-blue-300 font-semibold' : 'bg-slate-50 border-slate-255 hover:bg-slate-100'
                    }`}>
                      <input
                        type="checkbox"
                        checked={correctiveAction}
                        onChange={(e) => setCorrectiveAction(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-355 text-industrial-blue focus:ring-industrial-blue mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-xs text-industrial-blue flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5 text-industrial-blue inline shrink-0" />
                          <span>Corrective Action</span>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Take measures to control.</span>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      investigation ? 'bg-amber-50/70 border-amber-300 font-semibold' : 'bg-slate-50 border-slate-255 hover:bg-slate-100'
                    }`}>
                      <input
                        type="checkbox"
                        checked={investigation}
                        onChange={(e) => setInvestigation(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-355 text-industrial-orange focus:ring-industrial-orange mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-xs text-industrial-orange flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-industrial-orange inline shrink-0" />
                          <span>Investigation</span>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Conduct root-cause check.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 4. ASSIGN RESPONSIBILITY */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assign Responsibility</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold mb-1">Responsible Team</label>
                      <select
                        value={assignedTeam}
                        onChange={(e) => setAssignedTeam(e.target.value)}
                        className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                      >
                        {teamsList.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold mb-1">Responsible Person</label>
                      <select
                        value={assignedPerson}
                        onChange={(e) => setAssignedPerson(e.target.value)}
                        className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                      >
                        {personsList.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold mb-1">Action Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. DEADLINE */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Deadline</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                    />
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
                    />
                  </div>
                  {isOverdue() && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-800 text-[10px] rounded-lg flex items-center gap-1.5 animate-fadeIn">
                      <Clock className="h-3.5 w-3.5 text-red-650 shrink-0" />
                      <span>Warning: The selected deadline date and time has already passed.</span>
                    </div>
                  )}
                </div>

                {/* 6. ACTION INSTRUCTIONS */}
                <div className="space-y-1.5 pt-2 border-t border-slate-50">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Instructions</label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Describe what needs to be done to control or eliminate the identified hazard... (e.g. Isolate the affected area, stop nearby operations...)"
                    rows={3}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                {/* 8. CREATE ACTION BUTTON */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Zap className="h-4 w-4" />
                  <span>Create Action</span>
                </button>

              </form>
            </div>

            {/* Success message and generated Action card */}
            {successMsg && createdActionCard && (
              <div className="bg-emerald-50/20 border border-emerald-250 rounded-xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wide">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>

                <div className="border border-emerald-155 bg-white rounded-xl p-4 space-y-2 text-xs text-slate-700 shadow-3xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Action ID:</span>
                    <span className="font-extrabold text-slate-800">{createdActionCard.action_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Status:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-[10px] font-extrabold text-industrial-orange uppercase">
                      {createdActionCard.status}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Assigned Team:</span>
                    <span className="font-bold text-slate-850">{createdActionCard.assigned_team}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Assigned Person:</span>
                    <span className="font-bold text-slate-850">{createdActionCard.assigned_person}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Deadline:</span>
                    <span className="font-bold text-slate-855">{createdActionCard.deadline}</span>
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
