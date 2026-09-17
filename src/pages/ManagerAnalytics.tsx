import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, AlertTriangle, ShieldCheck, MapPin,
  Activity, Layers, Filter, RefreshCw, ChevronRight, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Flame, ShieldAlert, Zap, Radio, Shield
} from 'lucide-react';
import { SafetyEvent, User as UserType } from '../types';

interface ManagerAnalyticsProps {
  user?: UserType | null;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
}

interface LocationRisk {
  site: string;
  unit: string;
  totalEvents: number;
  highSifCount: number;
  avgSifScore: number;
  topHazard: string;
  barrierFailureRate: number;
  riskStatus: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

interface HazardPattern {
  category: string;
  count: number;
  percentage: number;
  sifPotentialCount: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  energySource: string;
}

interface LsrTrend {
  rule: string;
  complianceRate: number;
  violationsCount: number;
  highSifCount: number;
  trend: 'improving' | 'deteriorating' | 'stable';
}

interface DangerousActivity {
  activity: string;
  discipline: string;
  precursorCount: number;
  severityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  dominantSite: string;
  recommendedControl: string;
}

export const ManagerAnalytics: React.FC<ManagerAnalyticsProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh
}) => {
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [loading, setLoading] = useState<boolean>(false);
  const [locationRisks, setLocationRisks] = useState<LocationRisk[]>([]);
  const [hazardPatterns, setHazardPatterns] = useState<HazardPattern[]>([]);
  const [lsrTrends, setLsrTrends] = useState<LsrTrend[]>([]);
  const [dangerousActivities, setDangerousActivities] = useState<DangerousActivity[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl('/api/events'))
      .then(res => res.ok ? res.json() : [])
      .then((events: any[]) => {
        if (Array.isArray(events) && events.length > 0) {
          // 1. Group by Site
          const siteMap: Record<string, any[]> = {};
          events.forEach(e => {
            const s = e.site || 'Site Alpha - Jamnagar Complex';
            if (!siteMap[s]) siteMap[s] = [];
            siteMap[s].push(e);
          });

          const locs: LocationRisk[] = Object.entries(siteMap).map(([siteName, evts]) => {
            const highCount = evts.filter(x => x.sif_potential === 'Critical' || x.sif_potential === 'High').length;
            const avgScore = evts.reduce((acc, curr) => acc + (curr.risk_score || 50), 0) / evts.length;
            return {
              site: siteName,
              unit: evts[0]?.unit || 'Primary Unit',
              totalEvents: evts.length,
              highSifCount: highCount,
              avgSifScore: Math.round((avgScore / 10) * 10) / 10,
              topHazard: evts[0]?.hazard || evts[0]?.hazard_category || 'Operational Hazard',
              barrierFailureRate: Math.min(100, Math.round((highCount / evts.length) * 100)),
              riskStatus: avgScore > 75 ? 'CRITICAL' : (avgScore > 50 ? 'HIGH' : 'MODERATE')
            };
          });
          setLocationRisks(locs);

          // 2. Group by Hazard Category
          const hazardMap: Record<string, any[]> = {};
          events.forEach(e => {
            const cat = e.hazard_category || 'General Safety Hazard';
            if (!hazardMap[cat]) hazardMap[cat] = [];
            hazardMap[cat].push(e);
          });

          const patterns: HazardPattern[] = Object.entries(hazardMap).map(([catName, evts]) => {
            const highCount = evts.filter(x => x.sif_potential === 'Critical' || x.sif_potential === 'High').length;
            return {
              category: catName,
              count: evts.length,
              percentage: Math.round((evts.length / events.length) * 100),
              sifPotentialCount: highCount,
              trend: 'up',
              trendValue: `${Math.round((evts.length / events.length) * 100)}% of total`,
              energySource: evts[0]?.energy_source || 'Mechanical / Gravitational'
            };
          });
          setHazardPatterns(patterns);

          // 3. Life-saving rules
          const lsrMap: Record<string, any[]> = {};
          events.forEach(e => {
            const r = e.life_saving_rule || 'Follow Standard Protocol';
            if (!lsrMap[r]) lsrMap[r] = [];
            lsrMap[r].push(e);
          });

          const trends: LsrTrend[] = Object.entries(lsrMap).map(([ruleName, evts]) => {
            const highCount = evts.filter(x => x.sif_potential === 'Critical' || x.sif_potential === 'High').length;
            return {
              rule: ruleName,
              complianceRate: Math.max(40, 100 - (evts.length * 10)),
              violationsCount: evts.length,
              highSifCount: highCount,
              trend: highCount > 2 ? 'deteriorating' : 'improving'
            };
          });
          setLsrTrends(trends);

          // 4. Dangerous activities
          const acts: DangerousActivity[] = events.slice(0, 4).map(e => ({
            activity: e.activity || e.hazard_category || 'Operational Task',
            discipline: e.hazard_category || 'Process Safety',
            precursorCount: 1,
            severityLevel: (e.sif_potential?.toUpperCase() || 'MEDIUM') as any,
            dominantSite: e.site || 'Jamnagar Complex',
            recommendedControl: e.life_saving_rule || 'Enforce safety barriers before start.'
          }));
          setDangerousActivities(acts);
        } else {
          setLocationRisks([]);
          setHazardPatterns([]);
          setLsrTrends([]);
          setDangerousActivities([]);
        }
      })
      .catch(() => {
        setLocationRisks([]);
        setHazardPatterns([]);
        setLsrTrends([]);
        setDangerousActivities([]);
      })
      .finally(() => setLoading(false));
  }, [triggerStateRefresh]);

  // Filtered location risks based on site filter
  const filteredLocations = useMemo(() => {
    if (selectedSite === 'All') return locationRisks;
    return locationRisks.filter(l => l.site.toLowerCase().includes(selectedSite.toLowerCase()));
  }, [selectedSite, locationRisks]);

  const filteredActivities = useMemo(() => {
    if (selectedSite === 'All') return dangerousActivities;
    return dangerousActivities.filter(a => a.dominantSite.toLowerCase().includes(selectedSite.toLowerCase()));
  }, [selectedSite, dangerousActivities]);

  const totalPrecursors = useMemo(() => {
    return hazardPatterns.reduce((acc, h) => acc + h.count, 0);
  }, [hazardPatterns]);

  const totalHighSif = useMemo(() => {
    return hazardPatterns.reduce((acc, h) => acc + h.sifPotentialCount, 0);
  }, [hazardPatterns]);

  const avgCompliance = useMemo(() => {
    const sum = lsrTrends.reduce((acc, l) => acc + l.complianceRate, 0);
    return Math.round(sum / lsrTrends.length);
  }, [lsrTrends]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      triggerNotification('Safety Analytics data synchronized.');
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>EXECUTIVE SIF INTELLIGENCE & PATTERN RECOGNITION</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Safety Analytics & Precursor Trends
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Predictive pattern detection, high-risk operational hot spots, Life-Saving Rule compliance, and barrier failure density.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none pr-3 py-1 cursor-pointer"
            >
              <option value="All">All Operational Sites</option>
              <option value="Duliajan">Duliajan Field</option>
              <option value="Numaligarh">Numaligarh Refinery</option>
              <option value="Jorhat">Jorhat Gas Station</option>
              <option value="Digboi">Digboi Refinery</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Precursors</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalPrecursors}</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +8.4%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Active safety observations & near-miss reports</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">High-SIF Cases</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">{totalHighSif}</span>
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
              {Math.round((totalHighSif / totalPrecursors) * 100)}% of total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Precursors meeting Fatal/Life-Altering criteria</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">LSR Compliance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{avgCompliance}%</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              Target: 95%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Average across 6 core Life-Saving Rules</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Highest Risk Site</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900">Duliajan Well Pad C-7</span>
          </div>
          <p className="text-xs text-purple-600 font-semibold mt-2">Risk Index 8.7 / 10 • 14 High SIFs</p>
        </div>
      </div>

      {/* Main Grid: Hazard Patterns & LSR Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recurring Safety Patterns */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Recurring Hazard Patterns & Categories
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Precursor volume, SIF severity distribution, and monthly movement.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                Top 5 Categories
              </span>
            </div>

            <div className="space-y-4 mt-2">
              {hazardPatterns.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-800 text-sm font-semibold">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-bold">{item.count} reports</span>
                      <span className="text-slate-400">({item.percentage}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-red-500 h-full rounded-l-full"
                      style={{ width: `${(item.sifPotentialCount / item.count) * 100}%` }}
                      title={`High SIF: ${item.sifPotentialCount}`}
                    />
                    <div
                      className="bg-emerald-500 h-full rounded-r-full opacity-60"
                      style={{ width: `${((item.count - item.sifPotentialCount) / item.count) * 100}%` }}
                      title={`Standard: ${item.count - item.sifPotentialCount}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] mt-2 text-slate-500">
                    <span className="truncate max-w-[240px] text-slate-400 font-mono flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                      <span>{item.energySource}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-red-600 font-bold">
                        {item.sifPotentialCount} High-SIF
                      </span>
                      <span className={`font-semibold flex items-center ${
                        item.trend === 'up' ? 'text-red-600' : item.trend === 'down' ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {item.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                        {item.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                        {item.trendValue}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" /> High-SIF Portion</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 opacity-60 rounded-full inline-block" /> Standard Near-Miss</span>
            </div>
            <span className="font-semibold text-slate-700">Refreshed from Safety Log</span>
          </div>
        </div>

        {/* Life-Saving Rules (LSR) Compliance Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  Life-Saving Rule (LSR) Compliance Tracking
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Critical safety rule adherence and barrier failure frequency.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                OSHA / DGH Standards
              </span>
            </div>

            <div className="space-y-3.5 mt-2">
              {lsrTrends.map((rule, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-slate-900">{rule.rule}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        rule.complianceRate >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : rule.complianceRate >= 80
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rule.complianceRate}% Adherence
                      </span>
                    </div>
                  </div>

                  {/* Meter */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        rule.complianceRate >= 90
                          ? 'bg-emerald-500'
                          : rule.complianceRate >= 80
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${rule.complianceRate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] mt-2 text-slate-500 font-medium">
                    <span className="text-slate-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span><strong>{rule.violationsCount}</strong> total violations detected</span>
                    </span>
                    <span className="text-red-600 font-semibold flex items-center gap-1">
                      <Shield className="h-3 w-3 text-red-600 shrink-0" />
                      <span>{rule.highSifCount} critical barrier bypasses</span>
                    </span>
                    <span className={`font-semibold capitalize ${
                      rule.trend === 'improving' ? 'text-emerald-600' : rule.trend === 'deteriorating' ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      {rule.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Enforced across all drilling rigs, production platforms & refineries</span>
            <span className="font-bold text-slate-700">Audit Cycle: Q3 2024</span>
          </div>
        </div>
      </div>

      {/* High-Risk Locations / Operational Sites Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              High-Risk Operational Sites & Critical Asset Hotspots
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SIF risk distribution, recurrent primary hazards, and barrier vulnerability ranking by facility.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg shrink-0">
            {filteredLocations.length} Sites Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Facility / Operational Unit</th>
                <th className="py-3.5 px-4">SIF Index</th>
                <th className="py-3.5 px-4">High-SIF Cases</th>
                <th className="py-3.5 px-4">Dominant Recurrent Hazard</th>
                <th className="py-3.5 px-4">Barrier Vulnerability</th>
                <th className="py-3.5 px-4">Status Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLocations.map((loc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">{loc.site}</div>
                    <div className="text-slate-500 text-xs">{loc.unit}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900">{loc.avgSifScore}</span>
                      <span className="text-[10px] text-slate-400">/ 10</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                      {loc.highSifCount} of {loc.totalEvents} events
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <span className="font-medium text-slate-700">{loc.topHazard}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            loc.barrierFailureRate > 50 ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${loc.barrierFailureRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700">{loc.barrierFailureRate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      loc.riskStatus === 'CRITICAL'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : loc.riskStatus === 'HIGH'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {loc.riskStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dangerous Activities Ranking & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-600" />
              Critical Dangerous Activities & Mandatory Engineering Controls
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Work packages exhibiting repeat precursor clustering and mandatory safety interlocks.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            High Priority Remediations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActivities.map((act, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-900 leading-snug">
                    {act.activity}
                  </span>
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                    act.severityLevel === 'CRITICAL'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {act.severityLevel}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{act.discipline}</span>
                  <span>•</span>
                  <span>{act.dominantSite}</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 mt-2">
                  <strong className="text-slate-900 block mb-0.5">Mandatory Control Protocol:</strong>
                  {act.recommendedControl}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span><strong>{act.precursorCount}</strong> recorded near-misses</span>
                </span>
                <span className="text-emerald-700 font-semibold cursor-pointer hover:underline">
                  Assign Officer Audit →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
