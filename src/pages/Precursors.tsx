import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { PrecursorPattern } from '../types';
import { Network, RefreshCcw, ShieldAlert, Filter, X, ShieldCheck } from 'lucide-react';
import { TrendIndicator } from '../components/UIElements';

interface PrecursorsProps {
  triggerStateRefresh: boolean;
}

export const Precursors: React.FC<PrecursorsProps> = ({ triggerStateRefresh }) => {
  const [patterns, setPatterns] = useState<PrecursorPattern[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [riskFilter, setRiskFilter] = useState('All Risks');
  const [ruleFilter, setRuleFilter] = useState('All Rules');

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/precursors'));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPatterns(data);
    } catch (err) {
      console.warn('Precursors API error:', err);
      setPatterns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, [triggerStateRefresh]);

  const filteredPatterns = patterns.filter(pat => {
    if (riskFilter !== 'All Risks' && pat.risk_level !== riskFilter) return false;
    if (ruleFilter !== 'All Rules' && pat.life_saving_rule !== ruleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">Recurring Precursor Patterns</h1>
          <p className="text-xs text-slate-500 mt-1">Cross-site aggregations of identical barrier failures and activities.</p>
        </div>
        <span className="text-[10px] font-bold bg-indigo-50 text-industrial-purple px-2.5 py-1 border border-indigo-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <Network className="h-3.5 w-3.5" />
          <span>Semantic Linkage Engine</span>
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <Filter className="h-4.5 w-4.5" />
          <span>Filters</span>
        </div>

        <div className="flex gap-3 flex-1 min-w-[200px]">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="py-1 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
          >
            <option value="All Risks">All Risks</option>
            <option value="HIGH">High Risk Only</option>
            <option value="MEDIUM">Medium Risk Only</option>
            <option value="LOW">Low Risk Only</option>
          </select>

          <select
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            className="py-1 px-3 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800"
          >
            <option value="All Rules">All Rules</option>
            <option value="Energy Isolation">Energy Isolation</option>
            <option value="Line of Fire">Line of Fire</option>
            <option value="Confined Space">Confined Space</option>
            <option value="Working at Height">Working at Height</option>
            <option value="Lifting Operations">Lifting Operations</option>
            <option value="Electrical Safety">Electrical Safety</option>
          </select>
        </div>

        {(riskFilter !== 'All Risks' || ruleFilter !== 'All Rules') && (
          <button 
            onClick={() => { setRiskFilter('All Risks'); setRuleFilter('All Rules'); }}
            className="text-xs text-industrial-blue hover:underline font-semibold flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Pattern Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
          <span className="text-xs font-semibold">Aggregating recurrent safety trends...</span>
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Recurring Precursor Pattern Detected</h3>
          <p className="text-[10px] text-slate-400 mt-1">Adjust filters. No matched threshold events exist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPatterns.map((pat) => (
            <div key={pat.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition">
              <div>
                
                {/* Header */}
                <div className="flex justify-between items-start pb-2.5 border-b border-slate-100">
                  <div>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-wider">
                      {pat.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{pat.name}</h3>
                  </div>
                  <span className={`text-[8px] font-extrabold px-2 py-0.5 border rounded-full uppercase tracking-wider ${
                    pat.risk_level === 'HIGH' 
                      ? 'bg-red-50 text-industrial-red border-red-200' 
                      : 'bg-amber-50 text-industrial-orange border-amber-200'
                  }`}>
                    {pat.risk_level} RISK
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Mapped Rule:</span>
                    <span className="font-bold text-slate-800">{pat.life_saving_rule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Primary Activity:</span>
                    <span className="font-bold text-slate-800">{pat.activities}</span>
                  </div>
                  <div className="flex flex-col gap-1 py-1">
                    <span className="text-slate-400 font-medium">Common Barrier Failure Mode:</span>
                    <span className="font-semibold text-slate-800 bg-slate-50 p-2 border border-slate-200 rounded-lg flex items-start gap-1.5 mt-1 leading-normal">
                      <ShieldAlert className="h-4 w-4 text-industrial-orange shrink-0 mt-0.5" />
                      <span>{pat.barrier_failure}</span>
                    </span>
                  </div>
                </div>

              </div>

              {/* Bottom stats */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <div className="flex gap-4 text-slate-500 font-medium">
                  <span>Occurrences: <b className="text-slate-800">{pat.occurrences}</b></span>
                  <span>Active Sites: <b className="text-slate-800">{pat.sites}</b></span>
                </div>
                <TrendIndicator trend={pat.trend} />
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
