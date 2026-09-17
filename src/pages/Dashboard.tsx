import { apiUrl } from '../config/api';
import React, { useEffect, useState, useMemo } from 'react';
import { SafetyEvent, SafetyDirective } from '../types';

import {
  ShieldAlert,
  Clock,
  Eye,
  RefreshCcw,
  ChevronRight,
  Zap,
  Activity,
  Award,
  Layers,
  Wrench,
  Flame,
  HardHat,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  CalendarDays,
  Search,
  FileText,
  ShieldCheck,
  MapPin,
  Tag,
  X,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  Sparkles,
  Info,
  Radio,
  Send,
  BarChart3,
  Check,
  ClipboardCheck,
  BrainCircuit,
  Camera,
  Globe,
  Users
} from 'lucide-react';

interface DashboardProps {
  onViewEvent: (event: SafetyEvent) => void;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onNavigateTo?: (page: string) => void;
  userRole?: string;
  userName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onViewEvent,
  triggerNotification,
  triggerStateRefresh,
  onNavigateTo,
  userRole = 'Safety Officer',
  userName = 'Safety Officer Lead'
}) => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [directives, setDirectives] = useState<SafetyDirective[]>([]);
  const [acknowledgedDirIds, setAcknowledgedDirIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Selected issue for the View Popup Modal
  const [popupEvent, setPopupEvent] = useState<SafetyEvent | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [evtRes, dirRes] = await Promise.all([
        fetch(apiUrl('/api/events')),
        fetch(apiUrl('/api/manager/directives'))
      ]);

      if (evtRes.ok) {
        const data = await evtRes.json();
        setEvents(Array.isArray(data) ? data : []);
      } else {
        setEvents([]);
      }

      if (dirRes.ok) {
        const dirData = await dirRes.json();
        setDirectives(Array.isArray(dirData) ? dirData : []);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
      setEvents([]);
      setDirectives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeDirective = async (dir: SafetyDirective) => {
    try {
      const res = await fetch(apiUrl(`/api/manager/directives/${dir.directive_id}/acknowledge`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: 'user@refinery.safe',
          user_name: userName || 'Authorized Officer',
          site: 'All Operational Sites',
          role: userRole || 'Safety Officer'
        })
      });
      if (res.ok) {
        setAcknowledgedDirIds(prev => new Set(prev).add(dir.directive_id));
        triggerNotification(`✓ Acknowledged Directive ${dir.directive_id} as ${userRole}`);
        fetchDashboardData();
      }
    } catch (err) {
      console.warn('Failed to acknowledge directive from dashboard:', err);
      setAcknowledgedDirIds(prev => new Set(prev).add(dir.directive_id));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [triggerStateRefresh]);

  // Helper to determine status category for an issue
  const isCompleted = (evt: SafetyEvent) => {
    return evt.status === 'Resolved' ||
      evt.status === 'Confirmed' ||
      evt.action_status === 'Completed' ||
      evt.action_status === 'Verified';
  };

  const isOverdue = (evt: SafetyEvent) => {
    if (evt.action_status === 'Overdue') return true;
    const ageHours = (Date.now() - new Date(evt.timestamp).getTime()) / 3600000;
    return (evt.status === 'Needs Review' || evt.action_status === 'Pending') && ageHours > 24;
  };

  const isIncompleted = (evt: SafetyEvent) => {
    return !isCompleted(evt);
  };

  // 4 Main Metric Box Calculations
  const metrics = useMemo(() => {
    const total = events.length;
    const completed = events.filter(isCompleted).length;
    const overdue = events.filter(isOverdue).length;
    const incompleted = events.filter(isIncompleted).length;

    const completedRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const incompletedRate = total > 0 ? Math.round((incompleted / total) * 100) : 0;
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;

    return {
      total,
      completed,
      incompleted,
      overdue,
      completedRate,
      incompletedRate,
      overdueRate
    };
  }, [events]);

  // Filtered and Sorted Date-wise Issues
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Status filter
      if (filterStatus === 'COMPLETED' && !isCompleted(evt)) return false;
      if (filterStatus === 'INCOMPLETED' && !isIncompleted(evt)) return false;
      if (filterStatus === 'OVERDUE' && !isOverdue(evt)) return false;
      if (filterStatus === 'NEEDS_REVIEW' && evt.status !== 'Needs Review') return false;

      // Site filter
      if (selectedSiteFilter !== 'ALL' && evt.site !== selectedSiteFilter) return false;

      // Search Query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesHazard = evt.hazard?.toLowerCase().includes(query);
        const matchesDesc = evt.description?.toLowerCase().includes(query);
        const matchesSite = evt.site?.toLowerCase().includes(query);
        const matchesUnit = evt.unit?.toLowerCase().includes(query);
        const matchesRule = evt.life_saving_rule?.toLowerCase().includes(query);
        const matchesId = evt.id?.toLowerCase().includes(query);
        const matchesCode = evt.report_code?.toLowerCase().includes(query);

        if (!matchesHazard && !matchesDesc && !matchesSite && !matchesUnit && !matchesRule && !matchesId && !matchesCode) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [events, filterStatus, searchQuery, sortOrder, selectedSiteFilter]);

  // Unique sites for filter dropdown
  const uniqueSites = useMemo(() => {
    const siteSet = new Set<string>();
    events.forEach(e => {
      if (e.site) siteSet.add(e.site);
    });
    return Array.from(siteSet);
  }, [events]);

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { formattedDate: dateStr || 'N/A', formattedTime: '', relative: '' };

      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      return {
        formattedDate: `${day} ${month} ${year}`,
        formattedTime: time,
        relative: getRelativeTime(d)
      };
    } catch {
      return { formattedDate: dateStr || 'N/A', formattedTime: '', relative: '' };
    }
  };

  const getRelativeTime = (d: Date) => {
    const diffMs = Date.now() - d.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Status Badge Component
  const getStatusBadge = (evt: SafetyEvent) => {
    if (isOverdue(evt)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap">
          <AlertOctagon className="h-3 w-3 text-rose-600" />
          Overdue
        </span>
      );
    }
    if (isCompleted(evt)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Completed
        </span>
      );
    }
    if (evt.status === 'Needs Review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs whitespace-nowrap">
          <Clock className="h-3 w-3 text-amber-600" />
          Needs Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs whitespace-nowrap">
        <Activity className="h-3 w-3 text-blue-600" />
        In Progress
      </span>
    );
  };

  const getRiskBadge = (riskLevel?: string, score?: number) => {
    const level = riskLevel || 'HIGH';
    const displayScore = score !== undefined ? score.toFixed(1) : '7.0';

    if (level === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse"></span>
          CRITICAL {displayScore}
        </span>
      );
    }
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
          HIGH {displayScore}
        </span>
      );
    }
    if (level === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap">
          MED {displayScore}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
        LOW {displayScore}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-[#008779] mb-3" />
        <p className="text-sm font-semibold">Compiling Safety Officer Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* 2-Column Main Layout: Left Main Area + Right Progress & Tasks Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3 width) - Contains Welcome Box -> 4 Boxes -> Date-wise Issue Table */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. HERO WELCOME BOX */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] text-white p-7 shadow-lg shadow-[#008779]/15">

            {/* Watermark Trophy / Shield Icon in Background */}
            <div className="absolute right-6 -bottom-6 opacity-15 pointer-events-none">
              <Award className="h-48 w-48 text-white stroke-1" />
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-bold text-emerald-100 mb-2 border border-white/20">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
                <span>
                  {userRole === 'Admin'
                    ? 'System Administrator & Governance Hub'
                    : userRole === 'Safety Manager'
                      ? 'HSE Executive Fleet Command Hub'
                      : 'Safety Officer Active Console • IN FIELD'}
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white">
                {userRole === 'Admin'
                  ? `Welcome Back, ${userName || 'System Administrator'}`
                  : userRole === 'Safety Manager'
                    ? `Welcome Back, ${userName || 'Safety Manager'}`
                    : `Welcome Back, ${userName || 'Safety Officer'}!`}
              </h1>
              <p className="text-sm text-emerald-50/90 italic mt-1 font-medium leading-relaxed">
                {userRole === 'Admin'
                  ? 'Enterprise Portal Operations, System Health, and AI Precursor Governance'
                  : userRole === 'Safety Manager'
                    ? `Macro Safety Governance: ${events.length} Total Field Observations Logged • Real-time AI SIF Analysis`
                    : 'Active Shift: Precursor Hazard Review Queue & Barrier Audit Operations.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {userRole === 'Admin' ? (
                  <>
                    <button
                      onClick={() => onNavigateTo?.('admin-console')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#008779] text-xs font-extrabold rounded-full shadow-md hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[#008779]" />
                      <span>Configure AI Thresholds & Security</span>
                    </button>
                    <button
                      onClick={() => onNavigateTo?.('manager')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition-all duration-200 cursor-pointer backdrop-blur-xs"
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-emerald-100" />
                      <span>Open Manager Suite</span>
                    </button>
                  </>
                ) : userRole === 'Safety Manager' ? (
                  <>
                    <button
                      onClick={() => onNavigateTo?.('manager')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF7A1A] hover:bg-[#E56A12] text-white text-xs font-extrabold rounded-full shadow-md transition-all duration-200 transform hover:translate-x-0.5 cursor-pointer"
                    >
                      <span>Open Command Center</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => onNavigateTo?.('sif')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition-all duration-200 cursor-pointer backdrop-blur-xs"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-emerald-100" />
                      <span>Strategic SIF Intelligence</span>
                    </button>

                    <button
                      onClick={() => onNavigateTo?.('sites')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition-all duration-200 cursor-pointer backdrop-blur-xs"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-100" />
                      <span>Sites Overview</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigateTo?.('assigned-reports')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#008779] hover:bg-emerald-50 text-xs font-extrabold rounded-full shadow-md transition-all duration-200 transform hover:translate-x-0.5 cursor-pointer"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5 text-[#008779]" />
                      <span>Assigned Reports</span>
                    </button>

                    <button
                      onClick={() => onNavigateTo?.('investigate')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF7A1A] hover:bg-[#E56A12] text-white text-xs font-extrabold rounded-full shadow-md transition-all duration-200 transform hover:translate-x-0.5 cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Investigate Issue</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => onNavigateTo?.('sif')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition-all duration-200 cursor-pointer backdrop-blur-xs"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-emerald-100" />
                      <span>SIF Risk</span>
                    </button>

                    <button
                      onClick={() => onNavigateTo?.('ai-analysis')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition-all duration-200 cursor-pointer backdrop-blur-xs"
                    >
                      <BrainCircuit className="h-3.5 w-3.5 text-emerald-100" />
                      <span>AI Analysis</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 1B. ADMIN ENTERPRISE PORTALS GRID (VISIBLE ON DASHBOARD FOR ADMIN ROLE) */}
          {userRole === 'Admin' && (
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-[#008779]" />
                    <span>RAKSHA Enterprise Portal Operations & Control</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Launch operational portals, monitor live throughput, and oversee active user sessions.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTo?.('admin-console')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E8F6F4] text-[#008779] text-xs font-extrabold hover:bg-[#d4f0eb] transition border border-[#008779]/20 cursor-pointer"
                >
                  Manage Portals →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Persona 1: Field Worker Portal */}
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4.5 flex flex-col justify-between space-y-3 hover:shadow-sm transition">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <HardHat className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-800 block">Persona 1 — Field Ops</span>
                          <h4 className="text-sm font-extrabold text-slate-900">Field Worker Portal</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ● Online
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-2.5 border-t border-emerald-200/60 text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900">24</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Active Users</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">8</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Reports Today</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">2.3 min</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Submit</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTo?.('worker-portal')}
                    className="w-full py-2 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Open Field Portal</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Persona 2: AI Engine & Precursor Analysis */}
                <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-4.5 flex flex-col justify-between space-y-3 hover:shadow-sm transition">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          <BrainCircuit className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-purple-800 block">Persona 2 — AI Engine</span>
                          <h4 className="text-sm font-extrabold text-slate-900">AI Triage & Analysis</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                        ● Online
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-2.5 border-t border-purple-200/60 text-xs">
                      <div>
                        <div className="font-extrabold text-purple-900">GATI v1.3</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Engine Model</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-purple-900">94.8%</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Accuracy</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-purple-900">1.4 sec</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Latency</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTo?.('analysis')}
                    className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Open AI Diagnostics</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Persona 3: Safety Officer Center */}
                <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4.5 flex flex-col justify-between space-y-3 hover:shadow-sm transition">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-blue-800 block">Persona 3 — Safety Lead</span>
                          <h4 className="text-sm font-extrabold text-slate-900">Safety Officer Center</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                        ● Online
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-2.5 border-t border-blue-200/60 text-xs">
                      <div>
                        <div className="font-extrabold text-blue-900">{metrics.incompleted}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Pending Review</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-blue-900">6</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Active SWA</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-blue-900">4.2 hrs</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Avg Turnaround</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTo?.('inbox')}
                    className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Open Review Center</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Persona 4: Safety Manager Suite */}
                <div className="border border-teal-200 bg-teal-50/40 rounded-2xl p-4.5 flex flex-col justify-between space-y-3 hover:shadow-sm transition">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-teal-100 text-[#008779] flex items-center justify-center font-bold">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#008779] block">Persona 4 — HSE Manager</span>
                          <h4 className="text-sm font-extrabold text-slate-900">HSE Manager Command</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-100 text-[#008779] border border-teal-300">
                        ● Online
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-2.5 border-t border-teal-200/60 text-xs">
                      <div>
                        <div className="font-extrabold text-[#008779]">5</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Monitored Sites</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-[#008779]">10</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">LSR Active</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-[#008779]">94.2%</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">SIF Prevention</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTo?.('manager')}
                    className="w-full py-2 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Open Manager Suite</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 1C. ACTIVE SAFETY DIRECTIVES RIBBON (COMPANY-WIDE / TARGETED) */}
          {directives.length > 0 && (
            <div className="space-y-3">
              {directives.slice(0, 2).map((dir, idx) => {
                const isAcknowledged = acknowledgedDirIds.has(dir.directive_id) || dir.acknowledge_count > 0;
                const isUrgent = dir.priority === 'URGENT';
                const targetScope = dir.target_scope || 'ALL';
                const targetName = dir.target_name || dir.target_sites;

                return (
                  <div
                    key={dir.directive_id || dir.id || `dir-ribbon-${idx}`}
                    className={`border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition ${isUrgent
                        ? 'bg-red-50 border-red-200 ring-1 ring-red-500/20'
                        : 'bg-amber-50/80 border-amber-200'
                      }`}
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white shadow-2xs">
                          <Radio className="h-3 w-3 animate-pulse" />
                          <span>{dir.priority} Directive</span>
                        </span>
                        <span className="font-mono text-xs font-black text-slate-800 bg-white/90 px-2 py-0.5 rounded border border-slate-300">
                          {dir.directive_id}
                        </span>
                        <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                          Target: <b className="text-slate-900 inline-flex items-center gap-1">{targetScope === 'ALL' ? (<><Globe className="h-3 w-3 text-slate-600 inline" /> All Operational Teams</>) : (<><Users className="h-3 w-3 text-slate-600 inline" /> {targetName}</>)}</b>
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-xs">{dir.title}</h4>
                      <p className="text-[11.5px] text-slate-700 leading-snug font-medium line-clamp-2">
                        {dir.message}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-end">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-250">
                        {dir.acknowledge_count} Acknowledged
                      </span>
                      {isAcknowledged ? (
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Signed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledgeDirective(dir)}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Sign Acknowledgment</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. FOUR STAT BOXES DIRECTLY UNDER THE WELCOME BOX */}
          {/* Total Issues | Completed Issues | Incompleted Issues | Overdue Issues */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">

            {/* Box 1: Total Issues */}
            <div
              onClick={() => setFilterStatus('ALL')}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${filterStatus === 'ALL' ? 'border-[#008779] ring-2 ring-[#008779]/20' : 'border-[#E6ECEB] hover:border-[#008779]/40'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Total Issue
                </span>
                <div className="h-8 w-8 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-slate-900 font-mono-numbers">
                  {metrics.total}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                  <span>Total logged issues</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#008779]">
                <span>All Sites</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            {/* Box 2: Completed Issues */}
            <div
              onClick={() => setFilterStatus('COMPLETED')}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${filterStatus === 'COMPLETED' ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-[#E6ECEB] hover:border-emerald-500/40'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Completed
                </span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-emerald-600 font-mono-numbers">
                  {metrics.completed}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                  <span className="text-emerald-600 font-bold">{metrics.completedRate}%</span>
                  <span>resolved</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-emerald-600">
                <span>Verified</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            {/* Box 3: Incompleted Issues */}
            <div
              onClick={() => setFilterStatus('INCOMPLETED')}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${filterStatus === 'INCOMPLETED' ? 'border-[#FF7A1A] ring-2 ring-[#FF7A1A]/20' : 'border-[#E6ECEB] hover:border-[#FF7A1A]/40'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Incompleted
                </span>
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-[#FF7A1A] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-[#FF7A1A] font-mono-numbers">
                  {metrics.incompleted}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                  <span className="text-[#FF7A1A] font-bold">{metrics.incompletedRate}%</span>
                  <span>pending/active</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-[#FF7A1A]">
                <span>Requires Action</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            {/* Box 4: Overdue Issues */}
            <div
              onClick={() => setFilterStatus('OVERDUE')}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${filterStatus === 'OVERDUE' ? 'border-rose-600 ring-2 ring-rose-500/20' : 'border-[#E6ECEB] hover:border-rose-500/40'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Overdue
                </span>
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertOctagon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-rose-600 font-mono-numbers">
                  {metrics.overdue}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                  <span className="text-rose-600 font-bold">Past SLA</span>
                  <span>resolution date</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-rose-600">
                <span>Critical Attention</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

          </div>

          {/* 3. DATE-WISE ISSUE REGISTER / TABLE WITH ACTION COLUMN & VIEW POPUP */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm space-y-5">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#E8F6F4] text-[#008779] flex items-center justify-center">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Date-wise Safety Issues Register
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5 pl-9">
                  Chronological records of safety observations, unsafe conditions, and precursor alerts
                </p>
              </div>

              {/* View Mode Toggle & Status Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pl-9 sm:pl-0">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg mr-1 border border-slate-200">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md text-xs font-bold transition cursor-pointer ${viewMode === 'table' ? 'bg-white text-[#008779] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    title="Table View"
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-md text-xs font-bold transition cursor-pointer ${viewMode === 'cards' ? 'bg-white text-[#008779] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    title="Card View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${filterStatus === 'ALL'
                      ? 'bg-[#008779] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  All ({metrics.total})
                </button>
                <button
                  onClick={() => setFilterStatus('INCOMPLETED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${filterStatus === 'INCOMPLETED'
                      ? 'bg-[#FF7A1A] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Incompleted ({metrics.incompleted})
                </button>
                <button
                  onClick={() => setFilterStatus('COMPLETED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${filterStatus === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Completed ({metrics.completed})
                </button>
                <button
                  onClick={() => setFilterStatus('OVERDUE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${filterStatus === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Overdue ({metrics.overdue})
                </button>
              </div>
            </div>

            {/* Search & Site Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by hazard, ID (#SIF...), site, rule, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#008779] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {uniqueSites.length > 0 && (
                  <select
                    value={selectedSiteFilter}
                    onChange={(e) => setSelectedSiteFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-[#008779] cursor-pointer"
                  >
                    <option value="ALL">All Sites ({uniqueSites.length})</option>
                    {uniqueSites.map((s, idx) => (
                      <option key={`${s}-${idx}`} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer shrink-0"
                  title="Toggle Sort Order"
                >
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>{sortOrder === 'desc' ? 'Newest Date' : 'Oldest Date'}</span>
                </button>
              </div>
            </div>

            {/* TABLE VIEW (Default: Full Table with 'Action' Column and 'View' Button) */}
            {viewMode === 'table' ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-3">Issue ID</th>
                      <th className="py-3 px-4 min-w-[200px]">Hazard & Description</th>
                      <th className="py-3 px-3">Site / Unit</th>
                      <th className="py-3 px-3">Life-Saving Rule</th>
                      <th className="py-3 px-3">SIF Risk</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-center font-black text-[#008779]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                          No matching safety issues found.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((evt, idx) => {
                        const dateInfo = formatDate(evt.timestamp);
                        return (
                          <tr
                            key={evt.report_code || evt.id || `table-evt-${idx}`}
                            className="hover:bg-[#E8F6F4]/30 transition-colors duration-150 group"
                          >
                            {/* 1. Date & Time */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0">
                                  <Calendar className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-800 text-[11px]">
                                    {dateInfo.formattedDate}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                    <span>{dateInfo.formattedTime}</span>
                                    <span className="text-[#008779] font-bold">({dateInfo.relative})</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Issue ID / Code */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono font-black text-[11px] text-[#008779] bg-[#E8F6F4] px-2 py-1 rounded-md border border-teal-100">
                                {evt.report_code || evt.id}
                              </span>
                            </td>

                            {/* 3. Hazard & Description */}
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-bold text-slate-900 group-hover:text-[#008779] transition leading-snug line-clamp-1">
                                {evt.hazard || evt.activity}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {evt.description}
                              </p>
                            </td>

                            {/* 4. Site / Unit */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{evt.site}</span>
                              </div>
                              {evt.unit && (
                                <div className="text-[10px] text-slate-400 pl-4 truncate max-w-[120px]">
                                  {evt.unit}
                                </div>
                              )}
                            </td>

                            {/* 5. Life-Saving Rule */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {evt.life_saving_rule ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#008779] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                  <Tag className="h-3 w-3" />
                                  {evt.life_saving_rule}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">—</span>
                              )}
                            </td>

                            {/* 6. SIF Risk */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getRiskBadge(evt.risk_level, evt.sif_risk_score)}
                            </td>

                            {/* 7. Status */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getStatusBadge(evt)}
                            </td>

                            {/* 8. Action Column with View Button */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => setPopupEvent(evt)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition-all duration-150 shadow-2xs hover:shadow-xs cursor-pointer"
                                title="View detailed issue popup"
                              >
                                <Eye className="h-3.5 w-3.5" />
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
            ) : (
              /* CARD VIEW (Alternative Grid) */
              <div className="space-y-3">
                {filteredEvents.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No matching safety issues found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Try adjusting your status filter or search query.
                    </p>
                  </div>
                ) : (
                  filteredEvents.map((evt, idx) => {
                    const dateInfo = formatDate(evt.timestamp);
                    return (
                      <div
                        key={evt.report_code || evt.id || `card-evt-${idx}`}
                        className="p-4 bg-white border border-[#E6ECEB] hover:border-[#008779]/40 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="shrink-0 flex flex-col items-center justify-center p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center min-w-[76px] group-hover:bg-[#E8F6F4] group-hover:border-[#008779]/30 transition">
                            <Calendar className="h-3.5 w-3.5 text-[#008779] mb-1" />
                            <span className="text-[11px] font-black text-slate-800 leading-tight">
                              {dateInfo.formattedDate.split(' ').slice(0, 2).join(' ')}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {dateInfo.formattedDate.split(' ')[2] || ''}
                            </span>
                            <span className="text-[8px] font-extrabold text-[#008779] bg-white px-1.5 py-0.5 rounded-sm mt-1 border border-slate-100 shadow-2xs">
                              {dateInfo.relative}
                            </span>
                          </div>

                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-mono font-black text-[#008779] bg-[#E8F6F4] px-2 py-0.5 rounded-md">
                                {evt.report_code || evt.id}
                              </span>
                              {getRiskBadge(evt.risk_level, evt.sif_risk_score)}
                              {getStatusBadge(evt)}
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {dateInfo.formattedTime}
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#008779] transition leading-snug line-clamp-1">
                              {evt.hazard || evt.activity}
                            </h4>

                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                              {evt.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {evt.site} {evt.unit ? `• ${evt.unit}` : ''}
                              </span>

                              {evt.life_saving_rule && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#008779] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                  <Tag className="h-3 w-3" />
                                  {evt.life_saving_rule}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action View Button */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-between md:justify-end">
                          <button
                            onClick={() => setPopupEvent(evt)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Issue</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Bottom Summary Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
              <span>Showing {filteredEvents.length} of {events.length} total recorded issues</span>
              <button
                onClick={() => onNavigateTo?.('inbox')}
                className="text-[#008779] hover:text-[#007064] font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Open Full Safety Inbox</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Right Column (1/3 width) - Safety Progress & Precursor Tasks Panel */}
        <div className="space-y-6">

          {/* Card 1: Safety & Telemetry Progress Circular Donut */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Safety Progress
              </h3>
              <button
                onClick={() => onNavigateTo?.('sif')}
                className="px-3 py-1 bg-[#008779] text-white text-[10px] font-bold rounded-full hover:bg-[#007064] transition cursor-pointer shadow-2xs"
              >
                View All
              </button>
            </div>

            {/* Circular Progress Gauge */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative h-40 w-40 flex items-center justify-center">
                {/* SVG Concentric Donut Rings */}
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-slate-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Outer Purple Accent Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-[#8B5CF6]"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="180"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Outer Primary Teal Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-[#008779]"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * (metrics.completedRate || 75)) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>

                {/* Center Number */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 font-mono-numbers">
                    {metrics.completedRate > 0 ? `${metrics.completedRate}%` : '75%'}
                  </span>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Barrier Health</span>
                </div>
              </div>
            </div>

            {/* 3 Metric Columns */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
              <div className="border-r border-slate-100 pr-1">
                <div className="text-xs font-black text-slate-900 font-mono-numbers">
                  {metrics.completed}/{metrics.total || 100}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Resolved</div>
              </div>
              <div className="border-r border-slate-100 pr-1">
                <div className="text-xs font-black text-slate-900 font-mono-numbers">
                  {metrics.incompleted}/{metrics.total || 100}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Incomplete</div>
              </div>
              <div>
                <div className="text-xs font-black text-rose-600 font-mono-numbers">
                  {metrics.overdue}
                </div>
                <div className="text-[8px] font-bold text-rose-500 uppercase mt-0.5">Overdue</div>
              </div>
            </div>

            <div className="text-center text-[10px] font-bold text-slate-500 pt-1">
              Total Precursor Shield <span className="text-[#008779] font-extrabold">{metrics.completedRate || 75}% Active</span>
            </div>
          </div>

          {/* Card 3: Active Precursor Tasks & Reminders */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Precursor Tasks
              </h3>
              <button
                onClick={() => onNavigateTo?.('track-actions')}
                className="text-[10px] text-[#008779] font-bold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => onNavigateTo?.('track-actions')}
                className="p-3 bg-white border border-[#E6ECEB] rounded-2xl flex items-center justify-between hover:border-[#008779]/40 hover:shadow-xs transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0">
                    <Zap className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800 group-hover:text-[#008779] transition">
                      Valve Isolation Check
                    </h5>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                      4 Days 2 hours remaining
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#008779] group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. ISSUE DETAILS POPUP MODAL (Opens when 'View' button is clicked) */}
      {/* ========================================================================= */}
      {popupEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">

          {/* Modal Card */}
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 transform transition-all">

            {/* Modal Header Banner */}
            <div className="bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] text-white p-6 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-white/20 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                      {popupEvent.report_code || popupEvent.id}
                    </span>
                    <span className="bg-white/20 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                      {popupEvent.report_type || 'Safety Observation'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-2 leading-tight">
                    {popupEvent.hazard || popupEvent.activity}
                  </h3>
                </div>

                <button
                  onClick={() => setPopupEvent(null)}
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-4"
                  title="Close popup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status and Risk Quick Badges in Header */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/20 text-xs">
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-[11px] font-bold text-white">
                  <Calendar className="h-3.5 w-3.5 text-emerald-200" />
                  <span>{formatDate(popupEvent.timestamp).formattedDate} at {formatDate(popupEvent.timestamp).formattedTime}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-[11px] font-bold text-white">
                  <MapPin className="h-3.5 w-3.5 text-emerald-200" />
                  <span>{popupEvent.site} • {popupEvent.unit}</span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[calc(85vh-200px)] overflow-y-auto">

              {/* Status & SIF Risk Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Current Status</span>
                  <div className="mt-1.5">{getStatusBadge(popupEvent)}</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">SIF Risk Level</span>
                  <div className="mt-1.5">{getRiskBadge(popupEvent.risk_level, popupEvent.sif_risk_score)}</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">SIF Potential Probability</span>
                  <div className="mt-1.5 text-base font-black text-slate-800 font-mono-numbers">
                    {Math.round(popupEvent.sif_probability ?? 70)}% <span className="text-[11px] font-semibold text-slate-400">({popupEvent.confidence ?? 85}% confidence)</span>
                  </div>
                </div>
              </div>

              {/* Attached Photo Evidence */}
              {popupEvent.photo_url && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-[#008779]" />
                    <span>Uploaded Photo Evidence (Cloudinary)</span>
                  </h4>
                  <a href={popupEvent.photo_url} target="_blank" rel="noreferrer" className="inline-block group">
                    <img
                      src={popupEvent.photo_url}
                      alt="Hazard snapshot"
                      className="h-36 max-w-full rounded-xl object-cover border border-slate-300 shadow-2xs group-hover:opacity-90 transition"
                    />
                    <span className="text-[10px] text-[#008779] font-bold mt-1 block group-hover:underline">View Full Resolution ↗</span>
                  </a>
                </div>
              )}

              {/* 1. Observation Narrative */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#008779]" />
                  <span>Field Observation Statement</span>
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed font-normal">
                  {popupEvent.description}
                </div>
              </div>

              {/* 2. Precursor & Barrier Analysis Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-[#FF7A1A]" />
                  <span>Precursor & Barrier Analysis</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hazard Description</span>
                    <p className="text-xs font-bold text-slate-800">{popupEvent.hazard || 'Not specified'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Energy Source</span>
                    <p className="text-xs font-bold text-slate-800">{popupEvent.energy_source || 'Mechanical / Gravitational'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Safety Barrier (Safeguard)</span>
                    <p className="text-xs font-bold text-emerald-700">{popupEvent.barrier || 'Standard Barrier'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Barrier Failure Mode</span>
                    <p className="text-xs font-bold text-rose-700">{popupEvent.barrier_failure || 'Bypass / Ineffective'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Personnel Exposure</span>
                    <p className="text-xs font-semibold text-slate-700">{popupEvent.exposure || 'Personnel in hazardous boundary'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Potential Consequence</span>
                    <p className="text-xs font-semibold text-slate-700">{popupEvent.consequence || 'Major injury or asset loss'}</p>
                  </div>
                </div>
              </div>

              {/* 3. Operational Hierarchy & Life-Saving Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Life-Saving Rule Mapping</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Tag className="h-4 w-4 text-[#008779]" />
                    <span className="text-xs font-black text-[#008779]">{popupEvent.life_saving_rule || 'General Safety'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Action ID & Team</span>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {popupEvent.action_id ? `${popupEvent.action_id} • ${popupEvent.assigned_team || 'Safety Team'}` : 'No Action Dispatched Yet'}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setPopupEvent(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPopupEvent(null);
                    if (userRole === 'Officer' || userRole === 'Safety Officer') {
                      onNavigateTo?.('investigate');
                    } else {
                      onNavigateTo?.('take-action');
                    }
                  }}
                  className="px-4 py-2 bg-[#FF7A1A] hover:bg-[#E56A12] text-white text-xs font-extrabold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {userRole === 'Officer' || userRole === 'Safety Officer' ? (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      <span>Investigate Issue</span>
                    </>
                  ) : (
                    <>
                      <Activity className="h-3.5 w-3.5" />
                      <span>Dispatch Corrective Action</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const evt = popupEvent;
                    setPopupEvent(null);
                    if (userRole === 'Officer' || userRole === 'Safety Officer') {
                      onNavigateTo?.('ai-analysis');
                    } else {
                      onViewEvent(evt);
                    }
                  }}
                  className="px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-extrabold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {userRole === 'Officer' || userRole === 'Safety Officer' ? (
                    <>
                      <BrainCircuit className="h-3.5 w-3.5" />
                      <span>Open AI Analysis</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Open Full Triage & Review</span>
                    </>
                  )}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
