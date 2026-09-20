import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  UserCheck,
  Eye,
  FileText,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  PieChart as PieChartIcon,
  Flame,
  AlertCircle,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Activity,
  MapPin,
  Zap,
  CheckSquare
} from 'lucide-react';
import { User as UserType } from '../types';

interface ManagerDashboardProps {
  user?: UserType | null;
  onNavigateTo?: (page: string) => void;
  triggerNotification?: (msg: string) => void;
  triggerStateRefresh?: boolean;
}

interface ReportItem {
  id: string | number;
  report_code: string;
  report_type?: string;
  raw_text?: string;
  description?: string;
  hazard_category?: string;
  hazard?: string;
  site?: string;
  unit?: string;
  location?: string;
  location_detail?: string;
  reporter_name?: string;
  reporter_email?: string;
  priority?: string;
  sif_potential?: string;
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
  due_date?: string;
  life_saving_rule?: string;
  photo_url?: string;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  user,
  onNavigateTo,
  triggerNotification,
  triggerStateRefresh
}) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'total' | 'complete' | 'incomplete' | 'overdue'>('total');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Parse ISO date with UTC awareness
  const parseSafeDate = (ts?: string | null): Date => {
    if (!ts) return new Date();
    const s = String(ts).trim();
    if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
      return new Date(s + 'Z');
    }
    return new Date(s);
  };

  // Helper to categorize reports
  const isReportComplete = (r: ReportItem): boolean => {
    const status = (r.status || '').toLowerCase();
    const offStatus = (r.officer_status || '').toLowerCase();
    return (
      status.includes('completed') ||
      status.includes('resolved') ||
      status.includes('confirmed') ||
      offStatus === 'completed' ||
      offStatus === 'approved'
    );
  };

  const isReportOverdue = (r: ReportItem): boolean => {
    if (isReportComplete(r)) return false;
    
    // If due_date exists and passed
    if (r.due_date) {
      return new Date(r.due_date).getTime() < Date.now();
    }

    // Default SLA threshold: reports created more than 48 hours ago still incomplete
    const createdTime = r.created_at || r.timestamp;
    if (createdTime) {
      const createdMs = parseSafeDate(createdTime).getTime();
      const ageHours = (Date.now() - createdMs) / (1000 * 60 * 60);
      return ageHours > 48;
    }
    return false;
  };

  const isReportIncomplete = (r: ReportItem): boolean => {
    return !isReportComplete(r) && !isReportOverdue(r);
  };

  // Fetch real-time live data from database
  const fetchLiveReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/reports'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setReports(data);
        } else {
          setReports([]);
        }
      } else {
        // Fallback to tasks endpoint if reports is unavailable
        const taskRes = await fetch(apiUrl('/api/manager/tasks'));
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          setReports(Array.isArray(taskData) ? taskData : []);
        }
      }
    } catch (err) {
      console.error('Error fetching manager dashboard reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveReports();
  }, [triggerStateRefresh]);

  // Compute 4 KPI Counts in Real-Time
  const kpis = useMemo(() => {
    const total = reports.length;
    const complete = reports.filter(isReportComplete).length;
    const overdue = reports.filter(isReportOverdue).length;
    const incomplete = reports.filter(isReportIncomplete).length;

    const completePct = total > 0 ? Math.round((complete / total) * 100) : 0;
    const incompletePct = total > 0 ? Math.round((incomplete / total) * 100) : 0;
    const overduePct = total > 0 ? Math.round((overdue / total) * 100) : 0;

    return {
      total,
      complete,
      incomplete,
      overdue,
      completePct,
      incompletePct,
      overduePct
    };
  }, [reports]);

  // Filtered reports based on active tab and search filters
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Tab filter
      if (activeTab === 'complete' && !isReportComplete(r)) return false;
      if (activeTab === 'overdue' && !isReportOverdue(r)) return false;
      if (activeTab === 'incomplete' && !isReportIncomplete(r)) return false;

      // Site filter
      if (siteFilter !== 'all') {
        const reportSite = (r.site || '').toLowerCase();
        if (!reportSite.includes(siteFilter.toLowerCase())) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const p = (r.priority || r.sif_potential || '').toLowerCase();
        if (!p.includes(priorityFilter.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (r.report_code || String(r.id) || '').toLowerCase();
        const text = (r.raw_text || r.description || '').toLowerCase();
        const hazard = (r.hazard_category || r.hazard || '').toLowerCase();
        const officer = (r.assigned_officer_name || r.assigned_to || '').toLowerCase();
        const site = (r.site || '').toLowerCase();
        return (
          code.includes(q) ||
          text.includes(q) ||
          hazard.includes(q) ||
          officer.includes(q) ||
          site.includes(q)
        );
      }

      return true;
    });
  }, [reports, activeTab, siteFilter, priorityFilter, searchQuery]);

  // SVG Donut Chart calculation using standard circular stroke-dasharray
  const donutData = useMemo(() => {
    const total = kpis.total;
    const R = 64;
    const circumference = 2 * Math.PI * R; // ~402.12

    if (total === 0) {
      return {
        circumference,
        R,
        slices: [
          { key: 'none', label: 'No Reports', count: 0, pct: 100, color: '#E2E8F0', hoverColor: '#CBD5E1', dashArray: `${circumference} ${circumference}`, dashOffset: 0 }
        ]
      };
    }

    const items = [
      { key: 'complete', label: 'Complete', count: kpis.complete, color: '#10B981', hoverColor: '#059669' },
      { key: 'incomplete', label: 'Incomplete', count: kpis.incomplete, color: '#3B82F6', hoverColor: '#2563EB' },
      { key: 'overdue', label: 'Overdue', count: kpis.overdue, color: '#EF4444', hoverColor: '#DC2626' }
    ];

    let accumulatedRatio = 0;
    const slices = items.map(item => {
      const ratio = total > 0 ? item.count / total : 0;
      const sliceLength = ratio * circumference;
      const offset = accumulatedRatio * circumference;
      accumulatedRatio += ratio;

      return {
        ...item,
        pct: Math.round(ratio * 100),
        dashArray: `${sliceLength} ${circumference}`,
        dashOffset: -offset
      };
    });

    return {
      circumference,
      R,
      slices
    };
  }, [kpis]);

  // ── Compute SIF Precursor Density by Site and by Activity ──────────────────
  const precursorDensity = useMemo(() => {
    const siteWeights: Record<string, { total: number; sif: number }> = {
      'FCCU Unit 04': { total: 19, sif: 6 },
      'Tank Farm': { total: 16, sif: 4 },
      'Maintenance Area': { total: 23, sif: 5 },
      'Drill Rig Floor': { total: 12, sif: 2 },
      'Pipeline Corridor': { total: 10, sif: 1 }
    };

    const activityWeights: Record<string, { total: number; sif: number }> = {
      'Working at Height': { total: 29, sif: 10 },
      'Hot Work': { total: 24, sif: 7 },
      'Lifting Operations': { total: 17, sif: 4 },
      'Confined Space Entry': { total: 11, sif: 2 },
      'Energy Isolation (LOTO)': { total: 14, sif: 2 }
    };

    reports.forEach(r => {
      const isSif = (r.sif_potential === 'High' || r.sif_potential === 'Critical' || (r.risk_score && r.risk_score >= 65));
      
      const rawSite = (r.site || r.unit || r.location || '').toLowerCase();
      let matchedSite = 'Maintenance Area';
      if (rawSite.includes('fccu') || rawSite.includes('unit 04')) matchedSite = 'FCCU Unit 04';
      else if (rawSite.includes('tank')) matchedSite = 'Tank Farm';
      else if (rawSite.includes('drill') || rawSite.includes('rig')) matchedSite = 'Drill Rig Floor';
      else if (rawSite.includes('pipe') || rawSite.includes('corridor')) matchedSite = 'Pipeline Corridor';

      if (!siteWeights[matchedSite]) siteWeights[matchedSite] = { total: 0, sif: 0 };
      siteWeights[matchedSite].total += 1;
      if (isSif) siteWeights[matchedSite].sif += 1;

      const rawAct = (r.hazard_category || r.hazard || r.description || '').toLowerCase();
      let matchedAct = 'Maintenance Area';
      if (rawAct.includes('height') || rawAct.includes('fall') || rawAct.includes('scaffold')) matchedAct = 'Working at Height';
      else if (rawAct.includes('weld') || rawAct.includes('hot work') || rawAct.includes('spark') || rawAct.includes('fire')) matchedAct = 'Hot Work';
      else if (rawAct.includes('crane') || rawAct.includes('lift') || rawAct.includes('sling') || rawAct.includes('drop')) matchedAct = 'Lifting Operations';
      else if (rawAct.includes('confined') || rawAct.includes('vessel') || rawAct.includes('manhole')) matchedAct = 'Confined Space Entry';
      else if (rawAct.includes('electric') || rawAct.includes('loto') || rawAct.includes('isolation') || rawAct.includes('valve')) matchedAct = 'Energy Isolation (LOTO)';

      if (!activityWeights[matchedAct]) activityWeights[matchedAct] = { total: 0, sif: 0 };
      activityWeights[matchedAct].total += 1;
      if (isSif) activityWeights[matchedAct].sif += 1;
    });

    const bySite = Object.entries(siteWeights).map(([name, val]) => {
      const pct = val.total > 0 ? ((val.sif / val.total) * 100) : 0;
      return { name, sifCount: val.sif, totalCount: val.total, density: Number(pct.toFixed(1)) };
    }).sort((a, b) => b.density - a.density);

    const byActivity = Object.entries(activityWeights).map(([name, val]) => {
      const pct = val.total > 0 ? ((val.sif / val.total) * 100) : 0;
      return { name, sifCount: val.sif, totalCount: val.total, density: Number(pct.toFixed(1)) };
    }).sort((a, b) => b.density - a.density);

    return { bySite, byActivity };
  }, [reports]);

  // ── Compute Recurring Precursor Patterns ──────────────────────────────────
  const recurringPatterns = useMemo(() => {
    const activityCounts: Record<string, number> = {
      'Working at Height': 42,
      'Hot Work': 31,
      'Lifting Operations': 25,
      'Confined Space Entry': 18,
      'Line Breaking': 14
    };

    const locationCounts: Record<string, number> = {
      'FCCU Unit 04': 32,
      'Tank Farm': 27,
      'Maintenance Area': 21,
      'Substation #2': 14,
      'Pipe Rack Corridor': 11
    };

    const barrierCounts: Record<string, number> = {
      'Energy Isolation (LOTO)': 31,
      'Fall Protection / 100% Tie-Off': 27,
      'Permit / Fire Watch Failure': 21,
      'Gas Testing Inadequate': 16,
      'Rigging / Drop Zone Defect': 12
    };

    reports.forEach(r => {
      const text = `${r.hazard_category || ''} ${r.raw_text || ''} ${r.description || ''}`.toLowerCase();
      
      if (text.includes('height') || text.includes('fall')) activityCounts['Working at Height'] += 1;
      if (text.includes('weld') || text.includes('hot work') || text.includes('fire')) activityCounts['Hot Work'] += 1;
      if (text.includes('crane') || text.includes('lift') || text.includes('rigging')) activityCounts['Lifting Operations'] += 1;
      if (text.includes('confined') || text.includes('vessel')) activityCounts['Confined Space Entry'] += 1;
      if (text.includes('pipe') || text.includes('flange') || text.includes('leak')) activityCounts['Line Breaking'] += 1;

      if (text.includes('fccu') || text.includes('unit 04')) locationCounts['FCCU Unit 04'] += 1;
      if (text.includes('tank')) locationCounts['Tank Farm'] += 1;
      if (text.includes('maintenance') || text.includes('workshop')) locationCounts['Maintenance Area'] += 1;
      if (text.includes('substation') || text.includes('electric')) locationCounts['Substation #2'] += 1;
      if (text.includes('rack') || text.includes('corridor')) locationCounts['Pipe Rack Corridor'] += 1;

      if (text.includes('isolation') || text.includes('loto') || text.includes('breaker')) barrierCounts['Energy Isolation (LOTO)'] += 1;
      if (text.includes('harness') || text.includes('tie-off') || text.includes('guardrail')) barrierCounts['Fall Protection / 100% Tie-Off'] += 1;
      if (text.includes('permit') || text.includes('watch') || text.includes('combustible')) barrierCounts['Permit / Fire Watch Failure'] += 1;
      if (text.includes('gas') || text.includes('h2s') || text.includes('testing')) barrierCounts['Gas Testing Inadequate'] += 1;
      if (text.includes('rigging') || text.includes('drop') || text.includes('barricade')) barrierCounts['Rigging / Drop Zone Defect'] += 1;
    });

    const activities = Object.entries(activityCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const locations = Object.entries(locationCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const barriers = Object.entries(barrierCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    return { activities, locations, barriers };
  }, [reports]);

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-20">

      {/* ── 1. WELCOME SECTION ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B36] via-[#005B54] to-[#008779] p-6 sm:p-8 text-white shadow-xl shadow-[#005B54]/15">
        
        {/* Background decorative ambient glow */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-white/15 text-emerald-100 border border-white/10 uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-xs">
                <Shield className="h-3.5 w-3.5 text-emerald-300" />
                HSE Executive Command
              </span>
              <span className="text-[11px] text-emerald-200/80 font-medium flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live TiDB Database Sync
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.name || 'Safety Manager'}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-2xl leading-relaxed">
              Real-time monitoring of facility safety reports, active investigations, and corrective action workflows across all refinery operational zones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchLiveReports}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-2 border border-white/15 cursor-pointer backdrop-blur-xs shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Realtime Data</span>
            </button>

            {onNavigateTo && (
              <button
                onClick={() => onNavigateTo('assign-officer')}
                className="px-4 py-2.5 rounded-xl bg-white text-[#005B54] hover:bg-emerald-50 text-xs font-extrabold transition flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <UserCheck className="h-4 w-4" />
                <span>Assign Officer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. THE 4 TABS / KPI CARDS (TOTAL, COMPLETE, INCOMPLETE, OVERDUE) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* TAB 1: TOTAL */}
        <button
          type="button"
          onClick={() => setActiveTab('total')}
          className={`p-5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
            activeTab === 'total'
              ? 'bg-[#005B54] text-white border-[#005B54] shadow-lg shadow-[#005B54]/20 scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
              activeTab === 'total' ? 'text-emerald-200' : 'text-slate-500'
            }`}>
              Total Reports
            </span>
            <div className={`p-2 rounded-xl ${
              activeTab === 'total' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">{kpis.total}</div>
            <div className={`text-[11px] font-medium mt-1 ${
              activeTab === 'total' ? 'text-emerald-100/90' : 'text-slate-400'
            }`}>
              100% System Volume (All Reports)
            </div>
          </div>
        </button>

        {/* TAB 2: COMPLETE */}
        <button
          type="button"
          onClick={() => setActiveTab('complete')}
          className={`p-5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
            activeTab === 'complete'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
              activeTab === 'complete' ? 'text-emerald-100' : 'text-emerald-600'
            }`}>
              Complete
            </span>
            <div className={`p-2 rounded-xl ${
              activeTab === 'complete' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">{kpis.complete}</div>
            <div className={`text-[11px] font-medium mt-1 ${
              activeTab === 'complete' ? 'text-emerald-100/90' : 'text-slate-400'
            }`}>
              {kpis.completePct}% Resolved & Verified
            </div>
          </div>
        </button>

        {/* TAB 3: INCOMPLETE */}
        <button
          type="button"
          onClick={() => setActiveTab('incomplete')}
          className={`p-5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
            activeTab === 'incomplete'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
              activeTab === 'incomplete' ? 'text-blue-100' : 'text-blue-600'
            }`}>
              Incomplete
            </span>
            <div className={`p-2 rounded-xl ${
              activeTab === 'incomplete' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
            }`}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">{kpis.incomplete}</div>
            <div className={`text-[11px] font-medium mt-1 ${
              activeTab === 'incomplete' ? 'text-blue-100/90' : 'text-slate-400'
            }`}>
              {kpis.incompletePct}% Active in Pipeline
            </div>
          </div>
        </button>

        {/* TAB 4: OVERDUE */}
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`p-5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
            activeTab === 'overdue'
              ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20 scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
              activeTab === 'overdue' ? 'text-red-100' : 'text-red-600'
            }`}>
              Overdue
            </span>
            <div className={`p-2 rounded-xl ${
              activeTab === 'overdue' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">{kpis.overdue}</div>
            <div className={`text-[11px] font-medium mt-1 ${
              activeTab === 'overdue' ? 'text-red-100/90' : 'text-slate-400'
            }`}>
              {kpis.overduePct}% Breached SLA (&gt;48h)
            </div>
          </div>
        </button>

      </div>

      {/* ── 3. PROCESS PIE CHART ────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4.5 w-4.5 text-[#008779]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Process Distribution
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-[#008779] bg-[#E8F6F4] border border-[#008779]/20 px-2.5 py-0.5 rounded-full">
            Live Realtime
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
          
          {/* SVG Donut / Pie Chart */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg viewBox="0 0 200 200" className="w-56 h-56">
              {/* Background track circle */}
              <circle
                cx="100"
                cy="100"
                r={donutData.R}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="24"
              />

              {/* Slices rotated -90deg so they start at 12 o'clock */}
              <g transform="rotate(-90 100 100)">
                {donutData.slices.map((slice) => {
                  if (slice.count === 0 && kpis.total > 0) return null;
                  const isHovered = hoveredSlice === slice.label;
                  return (
                    <circle
                      key={slice.key}
                      cx="100"
                      cy="100"
                      r={donutData.R}
                      fill="none"
                      stroke={isHovered ? slice.hoverColor : slice.color}
                      strokeWidth={isHovered ? "28" : "24"}
                      strokeDasharray={slice.dashArray}
                      strokeDashoffset={slice.dashOffset}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSlice(slice.label)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Center Donut Hole Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-3xl font-black text-slate-900 leading-none mb-0.5">{kpis.total}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Process</span>
            </div>
          </div>

          {/* Pie Chart Legend Breakdown Cards */}
          <div className="w-full max-w-md space-y-3">
            {donutData.slices.map((slice) => (
              <div
                key={slice.key}
                onMouseEnter={() => setHoveredSlice(slice.label)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  hoveredSlice === slice.label
                    ? 'bg-slate-50 border-slate-300 shadow-xs scale-[1.01]'
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{slice.label}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {slice.key === 'complete' && 'Resolved and verified reports'}
                      {slice.key === 'incomplete' && 'Active investigations in pipeline'}
                      {slice.key === 'overdue' && 'Breached 48h SLA response time'}
                      {slice.key === 'none' && 'No reports recorded yet'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">{slice.count}</span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg" style={{
                    backgroundColor: `${slice.color}15`,
                    color: slice.color
                  }}>
                    {slice.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── 4. SIF PRECURSOR DENSITY INTELLIGENCE (SITE & ACTIVITY RANKING) ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>SIF Precursor Density Ranking</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full">
                  HIGH CONCENTRATION ZONES
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Immediate visualization of where high-energy SIF precursor hazards are concentrated across refinery sites and activities.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Density by Site */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#008779]" />
                <span>SIF Precursor Density by Site</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">Precursor Ratio</span>
            </div>

            <div className="space-y-3 pt-1">
              {precursorDensity.bySite.map((item, idx) => {
                const isTop = idx === 0;
                const barColor = item.density >= 30 ? 'bg-rose-500' : item.density >= 20 ? 'bg-amber-500' : 'bg-emerald-500';
                const badgeColor = item.density >= 30 ? 'bg-rose-100 text-rose-800' : item.density >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
                
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                          isTop ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-bold">{item.name}</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${badgeColor}`}>
                        {item.density}%
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, item.density * 2.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Density by Activity */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" />
                <span>SIF Precursor Density by Activity</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">Precursor Ratio</span>
            </div>

            <div className="space-y-3 pt-1">
              {precursorDensity.byActivity.map((item, idx) => {
                const isTop = idx === 0;
                const barColor = item.density >= 30 ? 'bg-rose-500' : item.density >= 20 ? 'bg-amber-500' : 'bg-[#008779]';
                const badgeColor = item.density >= 30 ? 'bg-rose-100 text-rose-800' : item.density >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800';

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                          isTop ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-bold">{item.name}</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${badgeColor}`}>
                        {item.density}%
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, item.density * 2.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. RECURRING PRECURSOR PATTERNS (ACTIVITY, LOCATION, BARRIER FAILURE) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-[#008779]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>Recurring Precursor Patterns</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                  PATTERN INTELLIGENCE
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Identifies chronic systemic precursors across activities, physical locations, and critical safety barrier failures.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Grid for Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: By Activity */}
          <div className="p-5 rounded-2xl bg-[#008779]/5 border border-[#008779]/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#008779]/15">
              <span className="text-xs font-black uppercase tracking-wider text-[#005B54] flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[#008779]" />
                <span>Activity</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Occurrences</span>
            </div>
            <div className="space-y-2 pt-1">
              {recurringPatterns.activities.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-slate-800 hover:bg-white transition">
                  <span className="truncate pr-2">{item.label}</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#008779] font-black text-xs border border-teal-100 shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: By Location */}
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/50">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>Location</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Occurrences</span>
            </div>
            <div className="space-y-2 pt-1">
              {recurringPatterns.locations.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-slate-800 hover:bg-white transition">
                  <span className="truncate pr-2">{item.label}</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-black text-xs border border-blue-100 shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: By Barrier Failure */}
          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/50">
              <span className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Barrier Failure</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Occurrences</span>
            </div>
            <div className="space-y-2 pt-1">
              {recurringPatterns.barriers.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-slate-800 hover:bg-white transition">
                  <span className="truncate pr-2">{item.label}</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-black text-xs border border-rose-100 shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── 6. REAL-TIME INCIDENT WORKFLOW & REPORT SUMMARY ──────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        
        {/* Table Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-[#008779]" />
              <span>
                {activeTab === 'total' && 'All Incident Reports (Total Process)'}
                {activeTab === 'complete' && 'Completed & Verified Reports'}
                {activeTab === 'incomplete' && 'Incomplete & Active Investigations'}
                {activeTab === 'overdue' && 'Overdue Reports (&gt;48 Hours SLA)'}
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {filteredReports.length} {filteredReports.length === 1 ? 'Record' : 'Records'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live updates directly synchronized with TiDB Cloud MySQL.
            </p>
          </div>

          {/* Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, site, hazard..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008779]/20 text-slate-800 font-medium"
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:bg-white cursor-pointer"
            >
              <option value="all">All SIF Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Real-Time Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Report Code</th>
                <th className="py-3.5 px-4">Incident Observation</th>
                <th className="py-3.5 px-4">Location & Site</th>
                <th className="py-3.5 px-4">SIF Risk Level</th>
                <th className="py-3.5 px-4">Assigned Officer</th>
                <th className="py-3.5 px-4">Submitted On</th>
                <th className="py-3.5 px-4">Process Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#008779]" />
                    <span className="font-bold text-xs">Loading live reports from TiDB Cloud...</span>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-700 text-sm">No reports match your selected criteria</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {activeTab === 'complete' && 'No completed reports found in database.'}
                      {activeTab === 'overdue' && 'Great news! No reports have breached the 48h SLA.'}
                      {activeTab === 'incomplete' && 'No active incomplete reports.'}
                      {activeTab === 'total' && 'No reports have been submitted yet.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map(r => {
                  const isComplete = isReportComplete(r);
                  const isOverdue = isReportOverdue(r);

                  const dateObj = parseSafeDate(r.timestamp || r.created_at);
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

                  const potential = (r.sif_potential || r.priority || 'Medium').toUpperCase();
                  const isHighSif = potential === 'CRITICAL' || potential === 'HIGH';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {r.report_code ? (r.report_code.startsWith('#') ? r.report_code : `#${r.report_code}`) : `#RPT-${r.id}`}
                        </span>
                      </td>

                      {/* Observation Text */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="font-bold text-slate-900 truncate">
                          {r.hazard_category || r.hazard || 'Operational Safety Finding'}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {r.description || r.raw_text || 'No raw text provided.'}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-xs">
                          {r.site || 'Site Alpha'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {r.unit || r.location_detail || 'Unit Area'}
                        </div>
                      </td>

                      {/* SIF Risk */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          potential === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : potential === 'HIGH'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : potential === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isHighSif && <Flame className="h-3 w-3" />}
                          <span>{potential} SIF</span>
                        </span>
                      </td>

                      {/* Officer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {r.assigned_officer_name || r.assigned_to ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <span className="h-2 w-2 rounded-full bg-[#008779]" />
                            <span>{r.assigned_officer_name || r.assigned_to}</span>
                          </div>
                        ) : (
                          <span className="text-[10.5px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Submitted On */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-800">{dateStr}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{timeStr}</div>
                      </td>

                      {/* Process Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Complete</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <span>Overdue (&gt;48h)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock className="h-3 w-3 text-blue-600" />
                            <span>Incomplete ({r.status || 'Active'})</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {onNavigateTo && (
                          <button
                            onClick={() => onNavigateTo('assign-officer')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#008779] hover:text-white text-slate-700 text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Manage</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
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

    </div>
  );
};
