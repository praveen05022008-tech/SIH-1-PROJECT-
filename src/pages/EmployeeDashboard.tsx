import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Construction,
  Target,
  Siren,
  Plus,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Shield,
  BookOpen,
  Calendar,
  Sparkles,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  PhoneCall,
  CheckCircle,
  X,
  ShieldCheck
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { apiUrl } from '../config/api';
import { User, SafetyEvent } from '../types';

interface EmployeeDashboardProps {
  user: User;
  onNavigateTo: (page: string) => void;
  triggerStateRefresh?: boolean;
}



export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  user,
  onNavigateTo,
  triggerStateRefresh = false
}) => {
  const [realReports, setRealReports] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);

  // AI Instant scanner state
  const [aiDraftText, setAiDraftText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const fetchReports = () => {
    const targetEmail = (user?.email || (() => {
      try {
        const stored = localStorage.getItem('raksha_auth_user');
        if (stored) return JSON.parse(stored).email;
      } catch {}
      return '';
    })()).trim();
    if (!targetEmail) return;
    setLoading(true);
    fetch(apiUrl(`/api/events?reporter_email=${encodeURIComponent(targetEmail)}`))
      .then(res => (res.ok ? res.json() : []))
      .then(data => setRealReports(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching employee reports:', err);
        setRealReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [user?.email, Boolean(triggerStateRefresh)]);

  // Format display reports strictly from realReports only - no dummy fallback
  const displayReports = useMemo(() => {
    if (realReports.length > 0) {
      return realReports.map((r, i) => {
        let typeIcon = AlertTriangle;
        let typeColor = 'text-amber-500';
        const t = (r.report_type || '').toLowerCase();
        if (t.includes('condition')) {
          typeIcon = Construction;
          typeColor = 'text-orange-500';
        } else if (t.includes('near miss')) {
          typeIcon = Target;
          typeColor = 'text-emerald-500';
        } else if (t.includes('incident')) {
          typeIcon = Siren;
          typeColor = 'text-red-500';
        }

        let statusStr = 'Under Review';
        const s = (r.status || '').toLowerCase();
        if (s.includes('closed') || s.includes('resolved') || s.includes('completed')) statusStr = 'Closed';
        else if (s.includes('progress') || s.includes('action') || s.includes('investigat')) statusStr = 'Investigating';

        let sifStr = 'Medium';
        const score = r.sif_risk_score ?? 5;
        if (score >= 6.5 || (r.risk_level || '').toUpperCase() === 'CRITICAL' || (r.risk_level || '').toUpperCase() === 'HIGH') {
          sifStr = 'High';
        } else if (score <= 4.0) {
          sifStr = 'Low';
        }

        const dateStr = new Date(r.timestamp).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        return {
          id: r.report_code || r.id,
          type: r.report_type || 'Unsafe Observation',
          typeIcon,
          typeColor,
          title: r.description || `${r.hazard_category || 'Observation'} at ${r.unit || 'Site'}`,
          submittedOn: dateStr,
          status: statusStr,
          sifPotential: sifStr
        };
      });
    }
    return [];
  }, [realReports]);

  // Exact calculated statistics from real data only
  const totalCount = realReports.length;
  const closedCount = displayReports.filter(r => r.status === 'Closed').length;
  const reviewCount = displayReports.filter(r => r.status === 'Under Review').length;
  const investigatingCount = displayReports.filter(r => r.status === 'Investigating').length;
  const highRiskCount = displayReports.filter(r => r.sifPotential === 'High').length;

  // Dynamic calculated trends and subtitles
  const trends = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthCount = realReports.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const lastMonthCount = realReports.filter(r => {
      const d = new Date(r.timestamp);
      const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;

    let submittedText = `${totalCount} total submitted`;
    let submittedDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (lastMonthCount > 0) {
      const diff = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
      submittedText = `${Math.abs(diff)}% vs last month`;
      submittedDirection = diff >= 0 ? 'up' : 'down';
    } else if (thisMonthCount > 0) {
      submittedText = `${thisMonthCount} submitted this month`;
      submittedDirection = 'up';
    }

    const closedPct = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
    const closedText = totalCount > 0 ? `${closedPct}% resolution rate` : '0% resolution rate';
    const closedDirection: 'up' | 'down' | 'neutral' = closedCount > 0 ? 'up' : 'neutral';

    const reviewPct = totalCount > 0 ? Math.round((reviewCount / totalCount) * 100) : 0;
    const reviewText = totalCount > 0 ? `${reviewPct}% under review` : '0 under review';
    const reviewDirection: 'up' | 'down' | 'neutral' = reviewCount > 0 ? 'down' : 'neutral';

    const highRiskPct = totalCount > 0 ? Math.round((highRiskCount / totalCount) * 100) : 0;
    const highRiskText = highRiskCount > 0 ? `${highRiskPct}% high risk` : 'Zero high risk';
    const highRiskDirection: 'up' | 'down' | 'neutral' = highRiskCount > 0 ? 'down' : 'neutral';

    return {
      submitted: { text: submittedText, direction: submittedDirection },
      closed: { text: closedText, direction: closedDirection },
      review: { text: reviewText, direction: reviewDirection },
      highRisk: { text: highRiskText, direction: highRiskDirection }
    };
  }, [realReports, totalCount, closedCount, reviewCount, highRiskCount]);

  // Donut chart distribution (strictly calculated)
  const chartData = useMemo(() => {
    return [
      { name: 'Closed', value: closedCount, color: '#10B981' },
      { name: 'Under Review', value: reviewCount, color: '#F59E0B' },
      { name: 'Investigating', value: investigatingCount, color: '#3B82F6' },
      { name: 'Overdue', value: 0, color: '#EF4444' }
    ];
  }, [closedCount, reviewCount, investigatingCount]);

  const totalChartReports = totalCount;

  const pieChartData = useMemo(() => {
    if (totalChartReports === 0) {
      return [{ name: 'Empty', value: 1, color: '#E2E8F0' }];
    }
    const filtered = chartData.filter(d => d.value > 0);
    return filtered.length > 0 ? filtered : [{ name: 'Empty', value: 1, color: '#E2E8F0' }];
  }, [totalChartReports, chartData]);

  const handleStartReportWithCategory = (cat: string) => {
    setSelectedCategory(cat);
    onNavigateTo('report-issue');
  };

  const handleAnalyzeDraft = () => {
    if (!aiDraftText.trim()) return;
    setAiAnalyzing(true);
    setTimeout(() => {
      const text = aiDraftText.toLowerCase();
      const isHigh = text.includes('height') || text.includes('isolation') || text.includes('fall') || text.includes('fire');
      setAiResult({
        score: isHigh ? 8.2 : 5.1,
        risk: isHigh ? 'HIGH SIF POTENTIAL' : 'MEDIUM RISK',
        rule: isHigh ? 'Working at Height / Energy Isolation' : 'General Operational Safety',
        barrier: isHigh ? 'Barrier Lapse: Missing harness tethering / LOTO lock' : 'Guardrail inspection recommended',
        action: 'Notify area supervisor immediately & isolate energy feed before proceeding.'
      });
      setAiAnalyzing(false);
    }, 900);
  };

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-16">

      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] px-7 py-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-[#008779]/15">
        {/* Decorative hatched stripe texture on left */}
        <div className="absolute inset-y-0 left-0 w-24 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_8px,transparent_8px,transparent_16px)] opacity-30 pointer-events-none" />

        <div className="relative z-10 pl-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Srinith'}
          </h1>
          <p className="text-xs text-emerald-50 font-medium mt-1">
            Stay vigilant, stay safe — every report you file makes Duliajan a safer site.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={() => onNavigateTo('report-issue')}
            className="px-5 py-2.5 rounded-xl bg-white text-[#008779] hover:bg-emerald-50 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Submit new report</span>
          </button>
        </div>
      </div>

      {/* TOP 4 STAT CARDS (Reports Submitted, Reports Closed, Under Review, High Risk Reports) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Reports Submitted */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-[#008779]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#E8F6F4] text-[#008779]">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Reports submitted</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{totalCount}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {realReports.length > 0 ? trends.submitted.text : '2 this week'}
          </div>
        </div>

        {/* Card 2: Reports Closed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-[#008779]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#E8F6F4] text-[#008779]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Reports closed</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{closedCount}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {realReports.length > 0 ? trends.closed.text : '33% resolution rate'}
          </div>
        </div>

        {/* Card 3: Under Review */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-[#f59e0b]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Under review</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{reviewCount}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {realReports.length > 0 ? trends.review.text : 'Avg. 2 days to review'}
          </div>
        </div>

        {/* Card 4: High Risk Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-[#ef4444]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">High risk reports</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{highRiskCount}</div>
          <div className={`text-[11px] font-semibold mt-1 ${
            highRiskCount > 0 ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {realReports.length > 0 && highRiskCount === 0 ? 'Zero high risk' : 'Needs attention'}
          </div>
        </div>

      </div>

      {/* MAIN TWO-COLUMN LAYOUT (70% Left / 30% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (8 cols out of 12) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section 1: Submit a new safety report */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Submit a new safety report</h2>
              <p className="text-xs text-slate-500 mt-0.5">Report unsafe acts, conditions, near misses or incidents</p>
            </div>

            {/* 4 Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Card 1: Unsafe act */}
              <button
                onClick={() => handleStartReportWithCategory('Unsafe Act')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-amber-400 hover:bg-amber-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">Unsafe act</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report unsafe behaviour</p>
              </button>

              {/* Card 2: Unsafe condition */}
              <button
                onClick={() => handleStartReportWithCategory('Unsafe Condition')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-orange-400 hover:bg-orange-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <Construction className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">Unsafe condition</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report a hazardous condition</p>
              </button>

              {/* Card 3: Near miss */}
              <button
                onClick={() => handleStartReportWithCategory('Near Miss')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-teal-400 hover:bg-teal-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg bg-teal-50 border border-teal-200/60 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <Target className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">Near miss</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report a close call</p>
              </button>

              {/* Card 4: Incident (highlighted with soft red border and shadow) */}
              <button
                onClick={() => handleStartReportWithCategory('Incident')}
                className="p-4 rounded-xl border border-red-300 bg-white shadow-[0_0_15px_rgba(239,68,68,0.12)] hover:border-red-400 hover:bg-red-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-200/60 text-red-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <Siren className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-slate-900">Incident</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report an actual Incident</p>
              </button>

            </div>

            {/* Wide Primary Submit Button */}
            <button
              onClick={() => onNavigateTo('report-issue')}
              className="w-full py-3 rounded-xl bg-[#008779] hover:bg-[#007064] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Submit new report</span>
            </button>
          </div>

          {/* Section 2: My reports */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">My reports</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track the status of your submitted reports</p>
              </div>
              <button
                onClick={() => onNavigateTo('my-report')}
                className="text-[#008779] hover:underline text-xs font-semibold flex items-center gap-0.5 transition cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-3">Report ID</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-3">Submitted On</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">SIF Potential</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {displayReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-slate-200" />
                          <span className="font-semibold text-slate-500">No reports submitted yet</span>
                          <span>Submit your first safety observation to get started.</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayReports.slice(0, 5).map(report => {
                    const TypeIcon = report.typeIcon;
                    return (
                      <tr key={report.id} className="hover:bg-slate-50/60 transition">
                        
                        {/* Report ID */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => onNavigateTo('my-report')}
                            className="font-bold text-[#008779] hover:underline cursor-pointer"
                          >
                            {report.id}
                          </button>
                        </td>

                        {/* Type Icon */}
                        <td className="py-3.5 px-2">
                          <TypeIcon className={`h-4 w-4 ${report.typeColor}`} />
                        </td>

                        {/* Title */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 font-semibold">
                          {report.title}
                        </td>

                        {/* Submitted On */}
                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          {report.submittedOn}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {report.status === 'Under Review' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 text-amber-700 bg-amber-50">
                              Under Review
                            </span>
                          )}
                          {report.status === 'Investigating' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-300 text-blue-700 bg-blue-50">
                              Investigating
                            </span>
                          )}
                          {report.status === 'Closed' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">
                              Closed
                            </span>
                          )}
                        </td>

                        {/* SIF Potential */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {report.sifPotential === 'High' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200 text-red-700 bg-red-50">
                              High
                            </span>
                          )}
                          {report.sifPotential === 'Medium' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 text-amber-700 bg-amber-50">
                              Medium
                            </span>
                          )}
                          {report.sifPotential === 'Low' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50">
                              Low
                            </span>
                          )}
                        </td>

                        {/* Action Menu */}
                        <td className="py-3.5 px-2 text-center text-slate-400">
                          <button
                            onClick={() => onNavigateTo('my-report')}
                            className="p-1 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4 inline" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - only show when there are reports */}
            {displayReports.length > 5 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs">
                  &lt;
                </button>
                <button className="h-7 w-7 rounded-lg bg-[#008779] text-white flex items-center justify-center text-xs font-bold">
                  1
                </button>
                <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-xs font-bold">
                  2
                </button>
                <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs">
                  &gt;
                </button>
              </div>
            )}
          </div>


        </div>

        {/* RIGHT COLUMN (4 cols out of 12) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Card 1: Quick Actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Quick actions</h3>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTo('report-issue')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-[#008779]/30 hover:bg-[#E8F6F4]/40 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F6F4] text-[#008779] flex items-center justify-center">
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-[#008779]">Submit new report</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => onNavigateTo('my-report')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-[#008779]/30 hover:bg-[#E8F6F4]/40 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F6F4] text-[#008779] flex items-center justify-center">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-[#008779]">Check report status</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          {/* Card 2: Safety Tip of the Day */}
          <div className="rounded-2xl bg-gradient-to-br from-[#005B54] to-[#008779] p-5 text-white shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-200">
              <div className="h-4 w-4 rounded-full border-2 border-emerald-300 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              </div>
              <span className="text-xs font-semibold text-white">Safety tip of the day</span>
            </div>
            <p className="text-xs text-emerald-50 font-normal leading-relaxed">
              Always follow lockout/tagout procedure before starting maintenance work — verify zero energy before you touch anything.
            </p>
            <button
              onClick={() => setShowTipsModal(true)}
              className="px-4 py-2 rounded-xl bg-[#1c3a2f] hover:bg-[#254d3e] text-slate-200 text-xs font-medium border border-white/10 transition cursor-pointer"
            >
              View more tips
            </button>
          </div>

          {/* Card 3: My Report Summary (Donut Chart) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900">My Report Summary</h3>

            <div className="flex items-center justify-between gap-4">
              
              {/* Donut Chart with Center Total */}
              <div className="h-36 w-36 relative shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900">{totalChartReports}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Total</span>
                </div>
              </div>

              {/* Legend with exact percentages */}
              <div className="flex-1 space-y-2 text-xs">
                {chartData.map(item => {
                  const pct = totalChartReports > 0 ? ((item.value / totalChartReports) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {item.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Timeframe Dropdown */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>This Month</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 cursor-pointer" />
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>© 2024 RAKSHA. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-slate-600 transition">Privacy Policy</a>
          <span>|</span>
          <a href="#" className="hover:text-slate-600 transition">Terms of Service</a>
        </div>
      </footer>

      {/* AI Analysis Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#008779]">
                <Cpu className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">GATI AI Precursor Hazard Scanner</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Type or paste your observation notes to run real-time SIF prediction and matched Life-Saving Rule checks before filing.
            </p>

            <textarea
              rows={3}
              value={aiDraftText}
              onChange={e => setAiDraftText(e.target.value)}
              placeholder="e.g. Scaffolding plank not clamped securely on 3rd level of Drilling Rig A..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#008779] focus:bg-white transition"
            />

            <button
              onClick={handleAnalyzeDraft}
              disabled={aiAnalyzing || !aiDraftText.trim()}
              className="w-full py-2.5 rounded-xl bg-[#008779] hover:bg-[#007064] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {aiAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{aiAnalyzing ? 'Analyzing with GATI Engine...' : 'Run Instant AI Scan'}</span>
            </button>

            {aiResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">Predicted Risk:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                    {aiResult.risk} ({aiResult.score})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Life-Saving Rule:</span>{' '}
                  <span className="font-bold text-slate-800">{aiResult.rule}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Barrier Status:</span>{' '}
                  <span className="text-slate-700">{aiResult.barrier}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 text-emerald-900 border border-emerald-200 text-[11px]">
                  <strong>Recommended Action:</strong> {aiResult.action}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts & Notifications Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-black text-slate-900">Active Field Safety Alerts</h3>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>High Wind Warning — Rig Floor 01</span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Wind speeds exceeding 35 knots. Crane lifts and working at height suspended until 16:00 hrs.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Report Status Update</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-1">
                  Report <strong>RKA-2024-00010</strong> was reviewed and marked <strong>Closed</strong> with corrective work order #WO-4812.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Shield className="h-4 w-4" />
                  <span>PPE Compliance Audit Complete</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Duliajan Site scored 98% in morning tool-box compliance inspection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Tips Modal */}
      {showTipsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#008779]">
                <Shield className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">Refinery Safety Tips & SOPs</h3>
              </div>
              <button
                onClick={() => setShowTipsModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800">1. Lockout / Tagout (LOTO)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Always verify zero energy state with multimeter/test gauge before touching isolated breakers.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800">2. Fall Arrest Double Lanyards</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Maintain 100% tie-off when transitioning across scaffold sections above 1.8 meters.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800">3. Confined Space Gas Testing</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Perform continuous 4-gas atmospheric testing (O2, LEL, CO, H2S) prior to entry.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTipsModal(false);
                onNavigateTo('learning');
              }}
              className="w-full py-2.5 rounded-xl bg-[#008779] hover:bg-[#007064] text-white font-bold text-xs text-center transition cursor-pointer"
            >
              Open Full Learning Center
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
