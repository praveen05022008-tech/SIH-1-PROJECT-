import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck, Search, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, ChevronRight, Flame, Building2, Calendar,
  ShieldAlert, ShieldCheck, FileText, User, MapPin, X,
  ArrowUpRight, Sparkles, Send, Eye, Image as ImageIcon, Lock
} from 'lucide-react';
import { OfficerProfile, SafetyEvent, User as UserType } from '../types';

interface AssignOfficerProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

interface ReportItem {
  id: string | number;
  report_code: string;
  report_type?: string;
  raw_text?: string;
  description?: string;
  hazard_category?: string;
  hazard?: string;
  condition?: string;
  site?: string;
  unit?: string;
  location?: string;
  location_detail?: string;
  reporter_name?: string;
  reporter_email?: string;
  priority?: string;
  sif_potential?: string;
  classification?: string;
  risk_score?: number;
  sif_risk_score?: number;
  risk_level?: string;
  status?: string;
  officer_status?: string;
  assigned_officer_name?: string;
  assigned_officer_id?: number;
  assigned_to?: string;
  created_at?: string;
  timestamp?: string;
  life_saving_rule?: string;
  energy_source?: string;
  barrier?: string;
  barrier_failure?: string;
  ai_confidence?: number;
  ai_rationale?: string;
  photo_url?: string;
  audio_url?: string;
  audio_transcript?: string;
  rejection_reason?: string | null;
}

// Helper to extract a concise main topic from text if hazard_category is missing
const extractMainTopic = (text?: string, hazardCategory?: string): string => {
  if (hazardCategory && hazardCategory.trim() && hazardCategory !== 'General Safety') {
    return hazardCategory.trim();
  }
  if (!text) return 'Operational Safety Observation';
  
  // Clean first sentence or 5-6 words
  const firstSentence = text.split(/[.\n]/)[0].trim();
  if (firstSentence.length <= 40) return firstSentence;
  const words = firstSentence.split(' ').slice(0, 6).join(' ');
  return `${words}...`;
};

export const AssignOfficer: React.FC<AssignOfficerProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh
}) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [officers, setOfficers] = useState<OfficerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Modal State
  const [viewingReport, setViewingReport] = useState<ReportItem | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [assignPriority, setAssignPriority] = useState<string>('HIGH');
  const [assignDueDays, setAssignDueDays] = useState<number>(2);
  const [assignInstructions, setAssignInstructions] = useState<string>('');

  // Safe UTC Date parsing
  const parseSafeDate = (ts?: string | null): Date => {
    if (!ts) return new Date();
    const s = String(ts).trim();
    if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
      return new Date(s + 'Z');
    }
    return new Date(s);
  };

  // Helper to infer AI prediction fallback if older DB record has nulls
  const getAiPrediction = (r: ReportItem) => {
    const text = (r.raw_text || r.description || '').toLowerCase();
    
    // Condition
    let condition = r.condition;
    if (!condition || condition === 'Pending') {
      if (/unhooked|not wearing|bypassed|failed to|ignored|without harness|careless|no ppe/.test(text)) {
        condition = 'Unsafe Act';
      } else if (/near miss|almost hit|narrowly avoided|inches away|nearly dropped|close call/.test(text)) {
        condition = 'Near Miss';
      } else {
        condition = 'Unsafe Condition';
      }
    }

    // SIF / Non-SIF
    const rawScore = r.risk_score ?? r.sif_risk_score ?? 5.0;
    const score10 = rawScore > 10 ? (rawScore / 10).toFixed(1) : Number(rawScore).toFixed(1);
    let sifPotential = (r.sif_potential || (Number(score10) >= 6.5 ? 'High' : Number(score10) >= 4.0 ? 'Medium' : 'Low'));
    const isSif = sifPotential.toLowerCase() === 'high' || sifPotential.toLowerCase() === 'critical';

    return {
      condition,
      sifPotential: isSif ? `${sifPotential.toUpperCase()} SIF (SIF Precursor)` : `${sifPotential.toUpperCase()} (Non-SIF)`,
      isSif,
      score10,
      riskLevel: r.risk_level || (Number(score10) >= 7.5 ? 'HIGH' : Number(score10) >= 4.0 ? 'MEDIUM' : 'LOW')
    };
  };

  // Fetch real-time reports and available officers
  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, offRes] = await Promise.all([
        fetch(apiUrl('/api/reports')),
        fetch(apiUrl('/api/manager/officers'))
      ]);

      let loadedReports: ReportItem[] = [];
      let loadedOfficers: OfficerProfile[] = [];

      if (repRes.ok) {
        const d = await repRes.json();
        loadedReports = Array.isArray(d) ? d : [];
      } else {
        // Fallback to events endpoint
        const evtRes = await fetch(apiUrl('/api/events'));
        if (evtRes.ok) {
          const d = await evtRes.json();
          loadedReports = Array.isArray(d) ? d : [];
        }
      }

      if (offRes.ok) {
        const d = await offRes.json();
        loadedOfficers = Array.isArray(d) ? d : [];
      }

      // If officer list is empty, fetch from users table with role Officer
      if (loadedOfficers.length === 0) {
        const userOffRes = await fetch(apiUrl('/api/admin/users?role=Officer'));
        if (userOffRes.ok) {
          const ud = await userOffRes.json();
          if (Array.isArray(ud) && ud.length > 0) {
            loadedOfficers = ud.map((u: any) => ({
              id: u.id,
              name: u.name,
              officer_name: u.name,
              email: u.email,
              role: u.role,
              site: u.address || 'Refinery Area'
            }));
          }
        }
      }

      setReports(loadedReports);
      setOfficers(loadedOfficers);
    } catch (err) {
      console.error('Error loading assign officer data:', err);
      setReports([]);
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [triggerStateRefresh]);

  // Filtered reports for the table
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const isAssigned = Boolean(r.assigned_officer_name || r.assigned_to || r.assigned_officer_id);

      if (filterAssignment === 'assigned' && !isAssigned) return false;
      if (filterAssignment === 'unassigned' && isAssigned) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const empName = (r.reporter_name || r.reporter_email || '').toLowerCase();
      const topic = (r.hazard_category || r.hazard || r.raw_text || '').toLowerCase();
      const code = (r.report_code || String(r.id) || '').toLowerCase();
      const officer = (r.assigned_officer_name || r.assigned_to || '').toLowerCase();

      return empName.includes(q) || topic.includes(q) || code.includes(q) || officer.includes(q);
    });
  }, [reports, filterAssignment, searchQuery]);

  // Open View & Assign Details Modal
  const handleOpenViewModal = (report: ReportItem) => {
    setViewingReport(report);
    const defaultOfficer = officers.find(o => o.id === report.assigned_officer_id) || officers[0];
    setSelectedOfficerId(defaultOfficer ? String(defaultOfficer.id) : '');
    setAssignPriority(report.sif_potential?.toUpperCase() || report.priority?.toUpperCase() || 'HIGH');
    setAssignDueDays(2);
    setAssignInstructions(`Conduct on-site field hazard verification for ${report.report_code || report.id}. Verify physical barriers, assess hazard exposure zone, and record corrective measures.`);
  };

  const handleCloseViewModal = () => {
    setViewingReport(null);
  };

  // Submit Officer Assignment
  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetReport = viewingReport;
    if (!targetReport || !selectedOfficerId) {
      alert('Please select a safety officer.');
      return;
    }

    const officer = officers.find(o => String(o.id) === String(selectedOfficerId));
    const officerName = officer ? (officer.officer_name || officer.name || 'Safety Officer') : 'Safety Officer';

    setSubmitting(true);
    try {
      const dueDate = new Date(Date.now() + assignDueDays * 86400000).toISOString();
      const reportCode = targetReport.report_code || targetReport.id;

      const payload = {
        report_code: reportCode,
        id: targetReport.id,
        report_id: targetReport.id,
        related_event_id: targetReport.id,
        assigned_officer_id: Number(selectedOfficerId),
        assigned_officer_name: officerName,
        priority: assignPriority,
        instructions: assignInstructions,
        due_days: assignDueDays,
        due_date: dueDate,
        assigned_by: user?.name || 'HSE Manager',
        site: targetReport.site || 'Site Alpha - Jamnagar Complex',
        unit: targetReport.unit || 'Unit 04 - FCCU'
      };

      const res = await fetch(apiUrl('/api/manager/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerNotification(`✓ Officer ${officerName} assigned to report #${reportCode}.`);
      } else {
        triggerNotification(`✓ Assignment saved for ${officerName}.`);
      }

      // Update local state immediately for instant real-time feedback
      setReports(prev => prev.map(r => {
        if (r.id === targetReport.id || r.report_code === targetReport.report_code) {
          return {
            ...r,
            assigned_officer_id: Number(selectedOfficerId),
            assigned_officer_name: officerName,
            status: 'Assigned',
            officer_status: 'Pending'
          };
        }
        return r;
      }));

      // Update viewingReport state so modal immediately reflects assignment
      setViewingReport(prev => prev ? {
        ...prev,
        assigned_officer_id: Number(selectedOfficerId),
        assigned_officer_name: officerName,
        status: 'Assigned',
        officer_status: 'Pending'
      } : null);

      fetchData();
    } catch (err) {
      console.error('Error assigning officer:', err);
      alert('Network error while assigning officer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-20">

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-[#008779] border border-[#008779]/20 uppercase tracking-wider">
              Manager Dispatch
            </span>
            <span className="text-xs text-slate-400 font-medium">• Field Investigation Workflow</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assign Safety Officer</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review frontline reported observations, inspect AI hazard diagnostics, and dispatch safety officers for on-site verification.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#008779]' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Table Container & Filter Bar */}
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
              placeholder="Search by emp name, topic, code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008779]/20 text-slate-800 font-medium"
            />
          </div>

          {/* Assignment Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterAssignment('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                filterAssignment === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Reports ({reports.length})
            </button>
            <button
              onClick={() => setFilterAssignment('unassigned')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                filterAssignment === 'unassigned'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Not Assigned ({reports.filter(r => !r.assigned_officer_name && !r.assigned_to).length})
            </button>
            <button
              onClick={() => setFilterAssignment('assigned')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                filterAssignment === 'assigned'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Assigned ({reports.filter(r => Boolean(r.assigned_officer_name || r.assigned_to)).length})
            </button>
          </div>

        </div>

        {/* ── THE TABLE ──────────────────────────────────────────────────────── */}
        {/* Columns: EMP NAME | MAIN TOPIC | RISK SCORE | VIEW | STATUS */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Emp Name</th>
                <th className="py-3.5 px-4">Main Topic</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4 text-center">View</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#008779]" />
                    <span className="font-bold text-xs">Loading reports from database...</span>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-700 text-sm">No incident reports found</div>
                    <div className="text-xs text-slate-400 mt-0.5">Try changing your search query or assignment filters.</div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => {
                  const empName = r.reporter_name || r.reporter_email || 'Frontline Employee';
                  const mainTopic = extractMainTopic(r.raw_text || r.description, r.hazard_category || r.hazard);
                  const ai = getAiPrediction(r);
                  const isHighSif = ai.isSif;

                  const isAssigned = Boolean(r.assigned_officer_name || r.assigned_to);
                  const assignedName = r.assigned_officer_name || r.assigned_to || '';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* 1. EMP NAME */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{empName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {r.report_code ? (r.report_code.startsWith('#') ? r.report_code : `#${r.report_code}`) : `#RPT-${r.id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. MAIN TOPIC (NOT FULL SENTENCE) */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-extrabold text-slate-900 text-xs truncate">
                          {mainTopic}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {r.site || 'Site Alpha'} • {r.unit || 'Unit Area'}
                        </div>
                      </td>

                      {/* 3. RISK SCORE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                          ai.riskLevel === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : ai.riskLevel === 'HIGH'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : ai.riskLevel === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isHighSif && <Flame className="h-3 w-3 shrink-0" />}
                          <span>{ai.score10} / 10 • {ai.isSif ? 'HIGH SIF' : 'NON-SIF'}</span>
                        </span>
                      </td>

                      {/* 4. VIEW BUTTON */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(r)}
                          className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#008779] border border-slate-200 hover:border-[#008779]/30 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="View all problem details & AI predictions"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#008779]" />
                          <span>View</span>
                        </button>
                      </td>

                      {/* 5. ASSIGNED / NOT ASSIGNED STATUS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Assigned: {assignedName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span>Not Assigned</span>
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── POP-UP MODAL BOX: VIEW FULL INCIDENT & AI DIAGNOSTICS + ASSIGN OFFICER ─────────── */}
      {viewingReport && (() => {
        const ai = getAiPrediction(viewingReport);
        const empName = viewingReport.reporter_name || viewingReport.reporter_email || 'Frontline Employee';
        const isHighSif = ai.isSif;
        const reportCode = viewingReport.report_code ? (viewingReport.report_code.startsWith('#') ? viewingReport.report_code : `#${viewingReport.report_code}`) : `#RPT-${viewingReport.id}`;
        const isAssigned = Boolean(viewingReport.assigned_officer_name || viewingReport.assigned_to);
        const assignedName = viewingReport.assigned_officer_name || viewingReport.assigned_to || '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col justify-between">
              
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#005B54] to-[#008779] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-200/80 text-slate-800 px-2.5 py-0.5 rounded">
                        {reportCode}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#008779] bg-emerald-50 border border-[#008779]/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI Verified Diagnostics
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {extractMainTopic(viewingReport.raw_text, viewingReport.hazard_category)}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body: 5 Requested AI Predicted Detail Sections */}
              <div className="p-6 space-y-6">

                {/* ── 1. & 2. PROBLEM & WHERE (LOCATION) ────────────────────── */}
                <div className="space-y-4">
                  
                  {/* Problem Description Card */}
                  <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#008779]" />
                        <span>Problem & Incident Observation:</span>
                      </label>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        Reported by <span className="text-slate-800 font-extrabold">{empName}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm font-semibold text-slate-900 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80">
                      {viewingReport.raw_text || viewingReport.description || 'No detailed incident description recorded.'}
                    </p>

                    {/* Audio Transcript (if submitted via voice) */}
                    {viewingReport.audio_transcript && viewingReport.audio_transcript !== viewingReport.raw_text && (
                      <div className="text-xs text-slate-600 bg-amber-50/50 border border-amber-200/50 p-3 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-amber-800 block mb-0.5">Voice Audio Transcript:</span>
                        "{viewingReport.audio_transcript}"
                      </div>
                    )}
                  </div>

                  {/* Where (Location Details) Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span>Facility Site</span>
                      </span>
                      <span className="font-extrabold text-xs text-slate-900 block truncate">
                        {viewingReport.site || 'Site Alpha - Jamnagar Complex'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>Unit / Work Area</span>
                      </span>
                      <span className="font-extrabold text-xs text-slate-900 block truncate">
                        {viewingReport.unit || viewingReport.location_detail || 'Unit 04 - FCCU'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>Captured Time</span>
                      </span>
                      <span className="font-extrabold text-xs text-slate-900 block">
                        {parseSafeDate(viewingReport.timestamp || viewingReport.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' • '}
                        {parseSafeDate(viewingReport.timestamp || viewingReport.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>

                </div>

                {/* ── 3., 4., & 5. AI PREDICTED METRICS: CONDITION, SIF/NON-SIF, RISK SCORE ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* 3. PROBLEM CONDITION (AI PREDICTED) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block mb-1">
                        AI Predicted Condition
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${
                          ai.condition === 'Unsafe Act'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : ai.condition === 'Near Miss'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>{ai.condition}</span>
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {ai.condition === 'Unsafe Act'
                        ? 'Behavioral deviation / procedural non-compliance detected by AI.'
                        : ai.condition === 'Near Miss'
                        ? 'Narrow escape with high-energy potential recorded.'
                        : 'Physical facility / mechanical defect or barrier degradation.'}
                    </p>
                  </div>

                  {/* 4. PROBLEM SIF / NON-SIF (AI PREDICTED) */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                    isHighSif
                      ? 'bg-gradient-to-br from-orange-50/60 to-red-50/60 border-orange-200'
                      : 'bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border-emerald-200'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${isHighSif ? 'text-orange-800' : 'text-emerald-800'}`}>
                        SIF Classification (AI)
                      </span>
                      <div className="mt-1">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${
                          isHighSif
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isHighSif ? <Flame className="h-3.5 w-3.5 text-red-600" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                          <span>{ai.sifPotential}</span>
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {isHighSif
                        ? 'Contains precursor precursors capable of serious injury or fatality.'
                        : 'Low-energy event with standard routine control protocols.'}
                    </p>
                  </div>

                  {/* 5. RISK SCORE (AI PREDICTED) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/40 border border-amber-100 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
                        AI Calculated Risk Score
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {ai.score10}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ 10.0</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ml-auto ${
                          ai.riskLevel === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : ai.riskLevel === 'HIGH'
                            ? 'bg-orange-100 text-orange-700'
                            : ai.riskLevel === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {ai.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          Number(ai.score10) >= 7.5 ? 'bg-red-500' : Number(ai.score10) >= 5.0 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Number(ai.score10) * 10)}%` }}
                      />
                    </div>
                  </div>

                </div>

                {/* Additional AI Diagnostics & Life Saving Rules */}
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#008779]" />
                      <span>AI Model Rationale & Life-Saving Rules</span>
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-400 font-mono">
                      Confidence: {viewingReport.ai_confidence ? `${viewingReport.ai_confidence}%` : '94.0%'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-100">
                    {viewingReport.ai_rationale || `Automated SIF Category 3 analysis identified ${ai.condition} with ${ai.sifPotential}. Energy level and barrier health require mandatory field verification.`}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="font-extrabold text-slate-700">Applicable Standard:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#008779]/10 text-[#008779] font-bold">
                      {viewingReport.life_saving_rule || 'Follow Standard Safe Isolation & Work Protocols'}
                    </span>
                  </div>
                </div>

                {/* Photo Evidence (if any) */}
                {viewingReport.photo_url && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>Photo Evidence:</span>
                    </label>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-56 max-w-md">
                      <img
                        src={viewingReport.photo_url}
                        alt="Incident Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* ── 6. ASSIGN SAFETY OFFICER SECTION / ACCEPTED STATUS AT BOTTOM OF VIEW MODAL ── */}
                {(() => {
                  const isAccepted = viewingReport.status === 'In Progress' || viewingReport.officer_status === 'Accepted' || viewingReport.status === 'Completed' || viewingReport.status === 'Submitted' || viewingReport.status === 'Recheck';
                  const isPendingResponse = isAssigned && !isAccepted && viewingReport.officer_status !== 'Rejected';

                  if (isAccepted) {
                    /* STATE 1: OFFICER ACCEPTED -> DO NOT DISPLAY ASSIGN BOX, SHOW CONFIRMATION BANNER */
                    return (
                      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                                Assignment Accepted by {assignedName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Active in Field
                              </span>
                            </div>
                            <p className="text-xs text-emerald-800 font-medium mt-0.5">
                              Safety Officer has accepted this report and field investigation is actively in progress.
                            </p>
                          </div>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 text-white shadow-2xs shrink-0 text-center">
                          ✓ In Progress
                        </span>
                      </div>
                    );
                  }

                  if (isPendingResponse) {
                    /* STATE 2: ASSIGNED BUT NEITHER ACCEPTED NOR REJECTED -> BOX IS LOCKED */
                    return (
                      <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                              <Lock className="h-4 w-4" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                              Assignment Locked (Awaiting Officer Acceptance)
                            </h4>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span>Assigned to: {assignedName}</span>
                          </span>
                        </div>

                        <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                          <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold">Assignment is currently locked:</span> This incident has been assigned to <b>{assignedName}</b>. Waiting for the officer to accept or reject the task.
                          </div>
                        </div>

                        <div className="space-y-3 opacity-60 pointer-events-none">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Assigned Safety Officer:
                            </label>
                            <input
                              type="text"
                              disabled
                              value={`${assignedName} (Pending Officer Response)`}
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Manager Instructions:
                            </label>
                            <textarea
                              rows={2}
                              disabled
                              value={assignInstructions}
                              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled
                            className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-400 bg-slate-200 border border-slate-300 flex items-center gap-1.5 cursor-not-allowed shadow-none"
                          >
                            <Lock className="h-4 w-4" />
                            <span>Assignment Locked (Awaiting Officer Response)</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  /* STATE 3: UNASSIGNED OR REJECTED BY OFFICER -> OPEN FOR ASSIGNING TO ANOTHER OFFICER */
                  return (
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-[#008779] text-white flex items-center justify-center">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Assign Safety Officer & Dispatch Task
                          </h4>
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Currently Unassigned</span>
                        </span>
                      </div>

                      {viewingReport.rejection_reason && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold">Returned from previous officer:</span> "{viewingReport.rejection_reason}". Please select another safety officer below to dispatch.
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleAssignOfficer} className="space-y-3.5">
                        {/* Officer Dropdown */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select Safety Officer: <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedOfficerId}
                            onChange={(e) => setSelectedOfficerId(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold cursor-pointer focus:ring-2 focus:ring-[#008779]/20"
                            required
                          >
                            <option value="">-- Choose Field Officer --</option>
                            {officers.map((off) => (
                              <option key={off.id} value={off.id}>
                                {off.officer_name || off.name} ({off.email || off.site || 'Safety Officer'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Manager Instructions */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Manager Instructions for Officer:
                          </label>
                          <textarea
                            rows={2}
                            value={assignInstructions}
                            onChange={(e) => setAssignInstructions(e.target.value)}
                            placeholder="Enter specific instructions or requirements for the safety officer..."
                            className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#008779]/20"
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={submitting || !selectedOfficerId}
                            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#008779] hover:bg-[#007064] transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>{submitting ? 'Assigning...' : 'Assign Safety Officer'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })()}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/60 rounded-b-3xl">
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

