import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  CartesianGrid, 
  ResponsiveContainer 
} from 'recharts';
import { ShieldAlert, HelpCircle, Sparkles, RefreshCcw, TrendingUp } from 'lucide-react';
import { TrendIndicator } from '../components/UIElements';

interface SifIntelProps {
  triggerStateRefresh: boolean;
}

export const SifIntelligence: React.FC<SifIntelProps> = ({ triggerStateRefresh }) => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSifIntel = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/sif'));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.warn('SIF Intel API failed, using synthetic fallback metrics.');
      setStats({
        sif_reports_count: 276,
        high_confidence_count: 198,
        needs_review_count: 42,
        emerging_patterns_count: 17,
        scatter_plot: [
          { activity: 'Maintenance / Valve Work', count: 37, density: 92.5 },
          { activity: 'Working at Height', count: 28, density: 87.2 },
          { activity: 'Vessel Inspection / Entry', count: 22, density: 89.0 },
          { activity: 'Lifting Operations', count: 18, density: 78.4 },
          { activity: 'Hot Work / Welding', count: 15, density: 63.8 },
          { activity: 'Excavation Work', count: 8, density: 55.0 },
          { activity: 'Routine Maintenance', count: 48, density: 14.5 }
        ],
        top_precursors: [
          { id: 'PAT-01', name: 'Incomplete Energy Isolation Verification', occurrences: 37, activities: 'Maintenance / Valve Work', trend: '↑ 18%', risk_level: 'HIGH', life_saving_rule: 'Energy Isolation' },
          { id: 'PAT-02', name: 'Personnel entering Line-of-Fire Zone', occurrences: 24, activities: 'Lifting / Maintenance', trend: 'Stable', risk_level: 'HIGH', life_saving_rule: 'Line of Fire' },
          { id: 'PAT-03', name: 'Confined Space Gas Testing Bypass', occurrences: 22, activities: 'Vessel Entry', trend: '↑ 12%', risk_level: 'HIGH', life_saving_rule: 'Confined Space' },
          { id: 'PAT-04', name: 'Fall Protection Anchorage Omission', occurrences: 19, activities: 'Working at Height', trend: 'Stable', risk_level: 'MEDIUM', life_saving_rule: 'Working at Height' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSifIntel();
  }, [triggerStateRefresh]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading SIF metrics & density charts...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Custom tool-tip for the bubble scatter chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const info = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-lg text-xs leading-normal">
          <div className="font-bold text-slate-900 mb-1">{info.activity}</div>
          <div className="text-slate-600">Total Safety Reports: <b className="text-slate-900">{info.count}</b></div>
          <div className="text-slate-600">Avg SIF Potential: <b className="text-industrial-red">{info.density}%</b></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">SIF Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">Focus refinery attention and capital expenditure where fatal potential is highest.</p>
        </div>
        <span className="text-[10px] font-bold bg-red-50 text-industrial-red px-2.5 py-1 border border-red-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>HSE Priority View</span>
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SIF Potential Reports</span>
          <span className="text-2xl font-extrabold text-industrial-red mt-1.5 block">{stats.sif_reports_count}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">High Confidence Cases</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1.5 block">{stats.high_confidence_count}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reviews Pending</span>
          <span className="text-2xl font-extrabold text-industrial-orange mt-1.5 block">{stats.needs_review_count}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emerging Patterns</span>
          <span className="text-2xl font-extrabold text-industrial-purple mt-1.5 block">{stats.emerging_patterns_count}</span>
        </div>

      </div>

      {/* Scatter Heatmap Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scatter Bubble Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SIF Precursor Density Mapping</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Plotting Activity Volume vs. average SIF potential density</p>
          </div>

          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis 
                  dataKey="count" 
                  name="Reports Count" 
                  unit=" reports" 
                  type="number"
                  stroke="#94A3B8"
                  fontSize={10}
                  fontWeight={600}
                />
                <YAxis 
                  dataKey="density" 
                  name="Avg SIF Potential" 
                  unit="%" 
                  type="number"
                  stroke="#94A3B8"
                  fontSize={10}
                  fontWeight={600}
                  domain={[0, 100]}
                />
                <ZAxis dataKey="count" range={[60, 400]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  name="Refinery Activities" 
                  data={stats.scatter_plot} 
                  fill="#1F5EAA" 
                  shape="circle" 
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Precursor activities list */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top SIF Precursors</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Frequent hazard couplings in operations</p>
              </div>
              <TrendingUp className="h-4 w-4 text-industrial-red" />
            </div>

            <div className="space-y-4">
              {stats.top_precursors.map((pattern: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-industrial-navy uppercase bg-slate-200 px-1.5 py-0.5 rounded">
                      {pattern.id}
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${
                      pattern.risk_level === 'HIGH' 
                        ? 'bg-red-50 text-industrial-red border-red-100'
                        : 'bg-amber-50 text-industrial-orange border-amber-100'
                    }`}>
                      {pattern.risk_level} RISK
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1">{pattern.name}</h4>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200/60">
                    <span>Occurrences: <b className="text-slate-700">{pattern.occurrences}</b></span>
                    <TrendIndicator trend={pattern.trend} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
