import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { LifeSavingRuleStat } from '../types';
import { 
  FileCheck2, 
  RefreshCcw, 
  TrendingUp, 
  MapPin, 
  Wrench, 
  ShieldAlert, 
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { TrendIndicator } from '../components/UIElements';

interface LSRProps {
  triggerStateRefresh: boolean;
}

export const LifeSavingRules: React.FC<LSRProps> = ({ triggerStateRefresh }) => {
  const [rules, setRules] = useState<LifeSavingRuleStat[]>([]);
  const [selectedRule, setSelectedRule] = useState<LifeSavingRuleStat | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLSRS = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/life-saving-rules'));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRules(data);
      if (data.length > 0) setSelectedRule(data[0]);
    } catch (err) {
      console.warn('LSR API error:', err);
      setRules([]);
      setSelectedRule(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLSRS();
  }, [triggerStateRefresh]);

  const getLsrDescription = (ruleName: string) => {
    switch (ruleName) {
      case 'Energy Isolation':
        return 'Verify isolation and zero energy state before work begins. Double-check lockouts, tagging, and depressurization.';
      case 'Line of Fire':
        return 'Keep yourself and others out of the path of potential energy release, suspended loads, moving vehicles, and flying projectiles.';
      case 'Hot Work':
        return 'Control ignition sources and verify flammable gas concentrations. Fire watch must be assigned and fire blankets deployed.';
      case 'Confined Space':
        return 'Obtain authorization, test the atmosphere, verify rescue coordination, and establish safety watch before entry.';
      case 'Working at Height':
        return 'Use fall protection equipment when working above 1.8 meters. Verify scaffold stability tags and clip harness 100% of the time.';
      case 'Lifting Operations':
        return 'Define lift plan, inspect rigging items, do not walk under suspended loads, and secure physical exclusion barriers.';
      case 'Vehicle Safety':
        return 'Follow speed limits, wear seatbelts, maintain pedestrian clearance, and do not drive under the influence or while distracted.';
      case 'Electrical Safety':
        return 'Verify dead state, use insulated tools, check ground tags, and restrict panel access to qualified, authorized personnel.';
      default:
        return 'Observe standard safety guidelines and reporting procedures.';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
        <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
        <p className="text-sm font-semibold">Loading IOGP Life-Saving Rules statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">IOGP Life-Saving Rules</h1>
          <p className="text-xs text-slate-500 mt-1">Cross-referencing safety observations against global oil & gas industry standards.</p>
        </div>
        <span className="text-[10px] font-bold bg-indigo-50 text-industrial-purple px-2.5 py-1 border border-indigo-100 rounded-full flex items-center gap-1 uppercase tracking-wider">
          <BookOpen className="h-3.5 w-3.5" />
          <span>IOGP Framework</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rules Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const isSelected = selectedRule?.name === rule.name;
            const isHigh = rule.precursor_density === 'High';
            const isMedium = rule.precursor_density === 'Medium';
            let densityStyle = 'bg-slate-100 text-slate-600 border-slate-200';
            if (isHigh) densityStyle = 'bg-red-50 text-industrial-red border-red-100';
            else if (isMedium) densityStyle = 'bg-amber-50 text-industrial-orange border-amber-100';

            return (
              <button
                key={rule.name}
                onClick={() => setSelectedRule(rule)}
                className={`p-4 bg-white border rounded-xl text-left transition shadow-2xs hover:shadow-xs flex flex-col justify-between h-36 ${
                  isSelected 
                    ? 'border-industrial-blue ring-1 ring-industrial-blue/30 bg-blue-50/10' 
                    : 'border-slate-200'
                }`}
              >
                <div className="w-full">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-900 leading-snug">{rule.name}</span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${densityStyle}`}>
                      {rule.precursor_density}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-normal">
                    {getLsrDescription(rule.name)}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100/60 w-full flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Reports: <b className="text-slate-700">{rule.reports_count}</b></span>
                  <span>SIF Potential: <b className="text-industrial-red">{rule.sif_count}</b></span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Rule Detail Panel */}
        {selectedRule && (
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">selected standard rule</span>
                <h3 className="text-sm font-extrabold text-slate-950 mt-1">{selectedRule.name}</h3>
              </div>

              {/* Standard Description */}
              <div className="text-xs text-slate-600 leading-normal p-3.5 bg-slate-50 border border-slate-200 rounded-xl italic">
                {getLsrDescription(selectedRule.name)}
              </div>

              {/* Details Stats */}
              <div className="space-y-3.5 mt-5 text-xs">
                
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Precursor Risk Category:</span>
                  <span className={`font-bold uppercase ${
                    selectedRule.precursor_density === 'High' 
                      ? 'text-industrial-red' 
                      : selectedRule.precursor_density === 'Medium' 
                        ? 'text-industrial-orange' 
                        : 'text-industrial-green'
                  }`}>{selectedRule.precursor_density}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Total Logged Reports:</span>
                  <span className="font-bold text-slate-800">{selectedRule.reports_count}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">SIF Potential Count:</span>
                  <span className="font-bold text-industrial-red">{selectedRule.sif_count}</span>
                </div>

                <div className="py-2.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium block">Common Barrier Failure Mode:</span>
                  <span className="font-bold text-slate-800 block mt-1 leading-snug flex items-start gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-industrial-orange shrink-0 mt-0.5" />
                    <span>{selectedRule.common_barrier_failure}</span>
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Top Affected Location:</span>
                  </span>
                  <span className="font-bold text-slate-800">{selectedRule.top_site || 'Refinery A'}</span>
                </div>

              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-400 leading-normal">
              Mapping is calibrated in real-time by the GATI governance layer using reviewer confirmations.
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
