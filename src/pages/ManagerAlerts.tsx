import { apiUrl } from '../config/api';
import React, { useState, useMemo } from 'react';
import {
  Bell, AlertTriangle, ShieldAlert, Clock, ArrowUpRight,
  CheckCircle2, XCircle, Filter, RefreshCw, Send, Eye,
  Building2, Flame, UserCheck, CheckCheck, ChevronRight
} from 'lucide-react';
import { User as UserType } from '../types';

interface ManagerAlertsProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

export interface SafetyAlert {
  id: string;
  alertCode: string;
  title: string;
  type: 'HIGH_SIF' | 'BARRIER_FAILURE' | 'OVERDUE_INVESTIGATION' | 'ESCALATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  site: string;
  unit: string;
  timestamp: string;
  description: string;
  relatedReportCode?: string;
  assignedOfficer?: string;
  hoursOverdue?: number;
  barrierDetails?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';
  read: boolean;
}

const MOCK_ALERTS: SafetyAlert[] = [
  {
    id: 'ALT-101',
    alertCode: 'SIF-CRIT-0141',
    title: 'CRITICAL SIF PRECURSOR: Pressurized Gas Leak Flange Joint',
    type: 'HIGH_SIF',
    severity: 'CRITICAL',
    site: 'Duliajan Field',
    unit: 'Well Pad C-7',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    description: 'AI model flagged 87.4% SIF probability. High-pressure methane cloud detected near active electrical cabinet. 3 personnel in direct blast radius.',
    relatedReportCode: 'RPT-2024-0141',
    barrierDetails: 'Primary Relief Valve failed; secondary combustible gas detector offline.',
    status: 'ACTIVE',
    read: false
  },
  {
    id: 'ALT-102',
    alertCode: 'BAR-FAIL-0098',
    title: 'CRITICAL BARRIER FAILURE: Bypassed LOTO on High-Voltage Gas Compressor',
    type: 'BARRIER_FAILURE',
    severity: 'CRITICAL',
    site: 'Jorhat Gas Station',
    unit: 'Compressor Unit G-3',
    timestamp: new Date(Date.now() - 110 * 60000).toISOString(),
    description: 'Electrical disconnect box found unlocked with breaker energised during ongoing mechanical bearing replacement. Permit to Work violated.',
    relatedReportCode: 'RPT-2024-0139',
    barrierDetails: 'Padlock absent from energy isolation box. Danger tags not signed by lead electrician.',
    status: 'ACTIVE',
    read: false
  },
  {
    id: 'ALT-103',
    alertCode: 'OVD-TSK-0077',
    title: 'OVERDUE INVESTIGATION: Fall Protection Violation at Tower T-4',
    type: 'OVERDUE_INVESTIGATION',
    severity: 'HIGH',
    site: 'Numaligarh Refinery',
    unit: 'Distillation Column T-4',
    timestamp: new Date(Date.now() - 26 * 3600000).toISOString(),
    description: 'Assigned investigation task TSK-102 is now 26 hours past deadline without officer field report submission.',
    relatedReportCode: 'RPT-2024-0138',
    assignedOfficer: 'Deepa Hazarika',
    hoursOverdue: 26,
    status: 'ACTIVE',
    read: false
  },
  {
    id: 'ALT-104',
    alertCode: 'ESC-NOTIF-0045',
    title: 'ESCALATION TO GENERAL MANAGER: Confined Space Toxic Gas Exceedance',
    type: 'ESCALATION',
    severity: 'CRITICAL',
    site: 'Digboi Refinery',
    unit: 'Crude Sludge Tank 08',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    description: 'H2S gas concentration measured at 24 ppm inside tank manway (Threshold limit: 10 ppm). Work was halted by field officer, awaiting managerial clearance.',
    relatedReportCode: 'RPT-2024-0136',
    assignedOfficer: 'Bipul Saikia',
    barrierDetails: 'Forced mechanical ventilation fan stalled due to power fluctuation.',
    status: 'ESCALATED',
    read: true
  },
  {
    id: 'ALT-105',
    alertCode: 'BAR-FAIL-0092',
    title: 'BARRIER INTEGRITY WARNING: Corrosion on Offshore Drill Line Anchor',
    type: 'BARRIER_FAILURE',
    severity: 'HIGH',
    site: 'Duliajan Field',
    unit: 'Drilling Rig 4',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    description: 'NDT ultrasound thickness check indicates 32% metal loss on dead-line anchor pin. Rated load capacity compromised.',
    relatedReportCode: 'RPT-2024-0132',
    barrierDetails: 'Mechanical engineered load safety factor reduced below 1.5x.',
    status: 'ACTIVE',
    read: true
  },
  {
    id: 'ALT-106',
    alertCode: 'SIF-HIGH-0115',
    title: 'HIGH-SIF PRECURSOR: Mobile Crane Rigging Close to Overhead 33kV Line',
    type: 'HIGH_SIF',
    severity: 'HIGH',
    site: 'Numaligarh Refinery',
    unit: 'Offsite Storage Yard B',
    timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
    description: 'Crane boom approached within 2.1m of uninsulated power line during pipe transfer. Proximity sensor alarm sounded.',
    relatedReportCode: 'RPT-2024-0129',
    barrierDetails: 'Overhead electrical line proximity barrier near-miss.',
    status: 'ACKNOWLEDGED',
    read: true
  }
];

export const ManagerAlerts: React.FC<ManagerAlertsProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh
}) => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>(MOCK_ALERTS);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<SafetyAlert | null>(alerts[0]);
  const [escalationNote, setEscalationNote] = useState<string>('');
  const [showEscalateModal, setShowEscalateModal] = useState<boolean>(false);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const matchType = selectedType === 'ALL' || a.type === selectedType;
      const matchSev = selectedSeverity === 'ALL' || a.severity === selectedSeverity;
      return matchType && matchSev;
    });
  }, [alerts, selectedType, selectedSeverity]);

  const unreadCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length, [alerts]);
  const overdueCount = useMemo(() => alerts.filter(a => a.type === 'OVERDUE_INVESTIGATION' && a.status === 'ACTIVE').length, [alerts]);

  const handleSelectAlert = (alt: SafetyAlert) => {
    setSelectedAlert(alt);
    if (!alt.read) {
      setAlerts(prev => prev.map(a => a.id === alt.id ? { ...a, read: true } : a));
    }
  };

  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED', read: true } : a));
    if (selectedAlert?.id === id) {
      setSelectedAlert(prev => prev ? { ...prev, status: 'ACKNOWLEDGED', read: true } : null);
    }
    triggerNotification(`Alert ${id} acknowledged.`);
  };

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED', read: true } : a));
    if (selectedAlert?.id === id) {
      setSelectedAlert(prev => prev ? { ...prev, status: 'RESOLVED', read: true } : null);
    }
    triggerNotification(`Alert ${id} dismissed and marked resolved.`);
  };

  const handleEscalateSubmit = () => {
    if (!selectedAlert) return;
    setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? {
      ...a,
      status: 'ESCALATED',
      read: true
    } : a));
    setSelectedAlert(prev => prev ? { ...prev, status: 'ESCALATED', read: true } : null);
    setShowEscalateModal(false);
    setEscalationNote('');
    triggerNotification(`CRITICAL ESCALATION: Alert ${selectedAlert.alertCode} escalated to Head of Safety & GM.`);
  };

  const handleMarkAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    triggerNotification('All safety alerts marked as read.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-1">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>EXECUTIVE ALARM MONITOR & INCIDENT ESCALATIONS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Safety Alerts & Urgent Escalations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time notifications for High-SIF predictions, safety barrier compromises, and overdue field investigations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Metric Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Critical SIF / Barrier Alerts</span>
            <div className="text-2xl font-black text-red-900 mt-1">{criticalCount} Active</div>
            <p className="text-[11px] text-red-700 mt-0.5">Immediate managerial intervention required</p>
          </div>
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Overdue Field Audits</span>
            <div className="text-2xl font-black text-amber-900 mt-1">{overdueCount} Pending</div>
            <p className="text-[11px] text-amber-800 mt-0.5">Investigation past regulatory SLA target</p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Unread Alerts</span>
            <div className="text-2xl font-black text-blue-900 mt-1">{unreadCount} New</div>
            <p className="text-[11px] text-blue-800 mt-0.5">Awaiting manager acknowledgment</p>
          </div>
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Type:
          </span>
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'HIGH_SIF', label: 'High SIF' },
            { id: 'BARRIER_FAILURE', label: 'Barrier Failure' },
            { id: 'OVERDUE_INVESTIGATION', label: 'Overdue Audits' },
            { id: 'ESCALATION', label: 'Escalations' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedType === t.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
          </select>
        </div>
      </div>

      {/* Split Layout: Alert List on Left, Detail & Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800">No Alerts Match Criteria</h3>
              <p className="text-xs text-slate-500 mt-1">All high-priority alerts have been addressed or filtered out.</p>
            </div>
          ) : (
            filteredAlerts.map(alt => {
              const isSelected = selectedAlert?.id === alt.id;
              return (
                <div
                  key={alt.id}
                  onClick={() => handleSelectAlert(alt)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100'
                      : alt.read
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-red-50/30 border-red-200 hover:border-red-300'
                  }`}
                >
                  {/* Unread indicator */}
                  {!alt.read && (
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        alt.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {alt.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {alt.alertCode}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        alt.status === 'ACTIVE'
                          ? 'bg-amber-100 text-amber-800'
                          : alt.status === 'ESCALATED'
                          ? 'bg-purple-100 text-purple-800'
                          : alt.status === 'ACKNOWLEDGED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {alt.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1">
                    {alt.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                    {alt.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Building2 className="w-3.5 h-3.5" />
                      {alt.site} • {alt.unit}
                    </span>
                    <span>{new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Alert Details & Action Panel (5 cols) */}
        <div className="lg:col-span-5">
          {selectedAlert ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 sticky top-24">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono block">
                    {selectedAlert.alertCode}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                    {selectedAlert.title}
                  </h2>
                </div>
                <span className={`px-2.5 py-1 text-xs font-extrabold rounded-lg uppercase shrink-0 ${
                  selectedAlert.severity === 'CRITICAL'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {selectedAlert.severity}
                </span>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Location</span>
                  <strong className="text-slate-800">{selectedAlert.site}</strong>
                  <div className="text-slate-500 text-[11px]">{selectedAlert.unit}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Alert Timestamp</span>
                  <strong className="text-slate-800">{new Date(selectedAlert.timestamp).toLocaleString()}</strong>
                </div>
                {selectedAlert.relatedReportCode && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Related Report</span>
                    <strong className="text-blue-600 font-mono">{selectedAlert.relatedReportCode}</strong>
                  </div>
                )}
                {selectedAlert.assignedOfficer && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Officer</span>
                    <strong className="text-slate-800">{selectedAlert.assignedOfficer}</strong>
                  </div>
                )}
                {selectedAlert.hoursOverdue !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Overdue Duration</span>
                    <strong className="text-red-600">{selectedAlert.hoursOverdue} hours past target</strong>
                  </div>
                )}
              </div>

              {/* Detailed Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Detailed Hazard Synopsis
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {selectedAlert.description}
                </p>
              </div>

              {/* Barrier Information if available */}
              {selectedAlert.barrierDetails && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Barrier Compromise Analysis
                  </h4>
                  <div className="text-xs text-red-800 bg-red-50 p-3 rounded-xl border border-red-200">
                    {selectedAlert.barrierDetails}
                  </div>
                </div>
              )}

              {/* Manager Actions Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    disabled={selectedAlert.status === 'ACKNOWLEDGED' || selectedAlert.status === 'RESOLVED'}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acknowledge
                  </button>

                  <button
                    onClick={() => setShowEscalateModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Escalate to GM
                  </button>
                </div>

                <button
                  onClick={() => handleDismiss(selectedAlert.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Dismiss / Mark Resolved
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              Select an alert from the list to review details and take executive action.
            </div>
          )}
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalateModal && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
              <ArrowUpRight className="w-5 h-5" />
              <span>CONFIRM EXECUTIVE ESCALATION</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Escalate Alert: {selectedAlert.alertCode}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This will trigger an urgent SMS/Email broadcast to the General Manager (Operations) and Head of HSE.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Executive Justification / Instructions:
              </label>
              <textarea
                value={escalationNote}
                onChange={(e) => setEscalationNote(e.target.value)}
                rows={3}
                placeholder="Specify reason for immediate managerial escalation..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalateSubmit}
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
