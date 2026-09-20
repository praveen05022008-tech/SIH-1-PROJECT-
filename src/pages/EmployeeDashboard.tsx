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
  ChevronRight,
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

  // Format display reports strictly normalized to 'Pending' vs 'Completed'
  const displayReports = useMemo(() => {
    if (realReports.length > 0) {
      return realReports.map((r) => {
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

        // Strictly normalize to 'Pending' vs 'Completed'
        const s = (r.status || '').toLowerCase();
        const isCompleted = s.includes('closed') || s.includes('resolved') || s.includes('completed') || s.includes('finished');
        const statusStr = isCompleted ? 'Completed' : 'Pending';

        let sifStr = 'Medium';
        const score = r.sif_risk_score ?? 5;
        if (score >= 6.5 || (r.risk_level || '').toUpperCase() === 'CRITICAL' || (r.risk_level || '').toUpperCase() === 'HIGH' || (r.sif_potential || '').toUpperCase() === 'HIGH' || (r.sif_potential || '').toUpperCase() === 'CRITICAL') {
          sifStr = 'High';
        } else if (score <= 4.0 || (r.sif_potential || '').toUpperCase() === 'LOW') {
          sifStr = 'Low';
        }

        const parseSafeDate = (ts?: string | null): Date => {
          if (!ts) return new Date();
          const s = String(ts).trim();
          if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
            return new Date(s + 'Z');
          }
          return new Date(s);
        };

        const dateStr = r.timestamp ? parseSafeDate(r.timestamp).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) : 'Recent';

        return {
          id: r.report_code || r.id,
          type: r.report_type || 'Unsafe Observation',
          typeIcon,
          typeColor,
          title: r.description || r.raw_text || `${r.hazard_category || 'Observation'} at ${r.unit || 'Site'}`,
          location: r.location || `${r.site || 'Site'} - ${r.unit || 'Unit'}`,
          submittedOn: dateStr,
          status: statusStr,
          sifPotential: sifStr
        };
      });
    }
    return [];
  }, [realReports]);

  // Exact calculated statistics from real data
  const totalCount = realReports.length;
  const completedCount = displayReports.filter(r => r.status === 'Completed').length;
  const pendingCount = displayReports.filter(r => r.status === 'Pending').length;
  const highRiskCount = displayReports.filter(r => r.sifPotential === 'High').length;

  // Donut chart distribution (Completed vs Pending)
  const chartData = useMemo(() => {
    return [
      { name: 'Completed', value: completedCount, color: '#10B981' },
      { name: 'Pending', value: pendingCount, color: '#F59E0B' }
    ];
  }, [completedCount, pendingCount]);

  const pieChartData = useMemo(() => {
    if (totalCount === 0) {
      return [{ name: 'No Data', value: 1, color: '#E2E8F0' }];
    }
    const filtered = chartData.filter(d => d.value > 0);
    return filtered.length > 0 ? filtered : [{ name: 'No Data', value: 1, color: '#E2E8F0' }];
  }, [totalCount, chartData]);

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-16">

      {/* 1. Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] px-7 py-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-[#008779]/15">
        <div className="absolute inset-y-0 left-0 w-24 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_8px,transparent_8px,transparent_16px)] opacity-30 pointer-events-none" />

        <div className="relative z-10 pl-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 uppercase tracking-wider">
              Worker Safety Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Employee'}
          </h1>
          <p className="text-xs text-emerald-50 font-medium mt-1">
            Stay vigilant, stay safe — report hazards instantly to protect yourself and your teammates.
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

      {/* 2. Top 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Reports Submitted */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-[#008779]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#E8F6F4] text-[#008779]">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Total Submitted</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{totalCount}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {totalCount > 0 ? `${totalCount} observations logged` : 'No reports filed yet'}
          </div>
        </div>

        {/* Card 2: Reports Completed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Completed</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{completedCount}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}% resolved` : '0 resolved'}
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Pending Review</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{pendingCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {pendingCount > 0 ? `${pendingCount} in HSE workflow` : 'All reports resolved'}
          </div>
        </div>

        {/* Card 4: High SIF Risk */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition border-l-4 border-l-red-500">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">SIF High Risk</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{highRiskCount}</div>
          <div className={`text-[11px] font-semibold mt-1 ${highRiskCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {highRiskCount > 0 ? 'Urgent SIF Precursors' : 'Zero High Risk'}
          </div>
        </div>

      </div>

      {/* 3. Main Content: My Report Summary & Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Main Column: My Report Summary Table (8 of 12 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#008779]" />
                  <span>My Report Summary</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time status of all safety observations submitted by you</p>
              </div>
              <button
                onClick={() => onNavigateTo('my-report')}
                className="text-[#008779] hover:underline text-xs font-bold flex items-center gap-0.5 transition cursor-pointer"
              >
                <span>View All Reports</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                    <th className="py-3 px-3">Report ID</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-4">Observation</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">SIF Potential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#008779] border-t-transparent rounded-full animate-spin" />
                          <span>Loading your reports...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                          <div className="p-3 rounded-2xl bg-emerald-50 text-[#008779]">
                            <ShieldCheck className="h-7 w-7" />
                          </div>
                          <span className="font-bold text-slate-800 text-sm">No safety reports submitted yet</span>
                          <p className="text-slate-500 text-[11px]">Notice an unsafe act or condition? Submit an observation to keep your workplace safe.</p>
                          <button
                            onClick={() => onNavigateTo('report-issue')}
                            className="mt-2 px-4 py-2 rounded-xl bg-[#008779] text-white font-bold text-xs hover:bg-[#007064] transition cursor-pointer"
                          >
                            Submit Observation
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayReports.slice(0, 6).map((report) => {
                      const TypeIcon = report.typeIcon;
                      return (
                        <tr key={report.id} className="hover:bg-slate-50/70 transition">
                          {/* Report ID */}
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => onNavigateTo('my-report')}
                              className="font-bold text-[#008779] hover:underline cursor-pointer"
                            >
                              {report.id}
                            </button>
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-2">
                            <TypeIcon className={`h-4 w-4 ${report.typeColor}`} />
                          </td>

                          {/* Title */}
                          <td className="py-3.5 px-4 max-w-[220px] truncate text-slate-700 font-semibold">
                            {report.title}
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                            {report.location}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                            {report.submittedOn}
                          </td>

                          {/* Status: Strictly Pending vs Completed */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {report.status === 'Completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 text-emerald-800 bg-emerald-50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 text-amber-800 bg-amber-50">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Pending
                              </span>
                            )}
                          </td>

                          {/* SIF Potential */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {report.sifPotential === 'High' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200 text-red-700 bg-red-50">
                                High SIF
                              </span>
                            )}
                            {report.sifPotential === 'Medium' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 text-amber-700 bg-amber-50">
                                Medium SIF
                              </span>
                            )}
                            {report.sifPotential === 'Low' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50">
                                Low
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
        </div>

        {/* Right Column: Status Breakdown Chart (4 of 12 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Resolution Status</h3>
            <p className="text-xs text-slate-500">Summary of resolved vs pending safety reports</p>

            <div className="h-48 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900">{totalCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">Total</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Completed</div>
                  <div className="text-sm font-bold text-slate-800">{completedCount}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Pending</div>
                  <div className="text-sm font-bold text-slate-800">{pendingCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
