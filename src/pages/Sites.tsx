import { apiUrl } from '../config/api';
import React, { useEffect, useState } from 'react';
import { RefreshCcw, MapPin, ShieldAlert, ArrowDown, ChevronRight, ChevronDown, Activity, ShieldCheck } from 'lucide-react';

interface SitesProps {
  triggerStateRefresh: boolean;
}

export const Sites: React.FC<SitesProps> = ({ triggerStateRefresh }) => {
  const [selectedSite, setSelectedSite] = useState('Refinery A');
  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Collapsed state map for the drill down
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({
    'L1_0': true, // Keep first level open by default
  });

  const toggleNode = (nodeId: string) => {
    setOpenNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const fetchSiteDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/sites/${selectedSite}`));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      console.warn('Site Details API error:', err);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteDetails();
  }, [selectedSite, triggerStateRefresh]);

  const sites = ['Refinery A', 'Refinery B', 'Refinery C', 'Refinery D', 'Refinery E'];

  return (
    <div className="space-y-6">
      
      {/* Site Selector Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-navy">Sites & Operational Context</h1>
          <p className="text-xs text-slate-500 mt-1">Select physical site location to review local SIF risk density and structural mappings.</p>
        </div>

        <div className="flex gap-2">
          {sites.map((s) => (
            <button
              key={s}
              onClick={() => { setSelectedSite(s); setOpenNodes({ 'L1_0': true }); }}
              className={`px-4 py-2 text-xs font-bold border rounded-xl transition ${
                selectedSite === s
                  ? 'bg-industrial-navy text-white border-industrial-navy shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCcw className="h-8 w-8 animate-spin text-industrial-blue mb-3" />
          <span className="text-xs font-semibold">Querying physical site structures...</span>
        </div>
      ) : details ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Site stats panel */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs h-fit space-y-4">
            <div className="pb-2 border-b border-slate-100 flex items-center gap-1.5 text-slate-800">
              <MapPin className="h-4.5 w-4.5 text-industrial-blue" />
              <h3 className="text-xs font-bold uppercase tracking-wider">{details.site_name} Parameters</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Precursor Risk Density:</span>
                <span className={`font-bold uppercase ${
                  details.precursor_density === 'High' ? 'text-industrial-red' : 'text-industrial-orange'
                }`}>{details.precursor_density}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Total Safety Reports:</span>
                <span className="font-bold text-slate-800">{details.total_reports}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">SIF Potential Count:</span>
                <span className="font-bold text-industrial-red">{details.sif_potential}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-2">Top Life-Saving Rules violated:</span>
                <div className="flex flex-wrap gap-1.5">
                  {details.top_rules.map((rule: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-700 rounded uppercase">
                      {rule}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Drill-down Hierarchy (L1-L6) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Refinery Operational Hierarchy (L1 $\rightarrow$ L6)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Interactive drilldown showing Turnarounds, Units, Disciplines, Work Packages, Activities, and Jobs</p>
            </div>

            {/* Tree root */}
            <div className="space-y-2.5 pl-1.5 text-xs text-slate-800">
              {Object.keys(details.hierarchy).map((l1Name, l1Idx) => {
                const l1Key = `L1_${l1Idx}`;
                const isL1Open = !!openNodes[l1Key];
                const l2s = details.hierarchy[l1Name];

                return (
                  <div key={l1Key} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {/* Level 1 Header */}
                    <button
                      onClick={() => toggleNode(l1Key)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50 border-b border-slate-200 text-left font-extrabold text-industrial-navy hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 font-bold uppercase shrink-0">L1 Milestone</span>
                        <span>{l1Name}</span>
                      </div>
                      {isL1Open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {isL1Open && (
                      <div className="p-4 space-y-4 bg-white/50">
                        {Object.keys(l2s).map((l2Name, l2Idx) => {
                          const l2Key = `${l1Key}_L2_${l2Idx}`;
                          const isL2Open = !!openNodes[l2Key];
                          const l3s = l2s[l2Name];

                          return (
                            <div key={l2Key} className="pl-3 border-l-2 border-sky-100 space-y-2">
                              {/* Level 2 Header */}
                              <button
                                onClick={() => toggleNode(l2Key)}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 text-left"
                              >
                                {isL2Open ? <ChevronDown className="h-4 w-4 text-sky-500" /> : <ChevronRight className="h-4 w-4 text-sky-500" />}
                                <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">L2 Unit</span>
                                <span>{l2Name}</span>
                              </button>

                              {isL2Open && (
                                <div className="pl-6 space-y-3.5">
                                  {Object.keys(l3s).map((l3Name, l3Idx) => {
                                    const l3Key = `${l2Key}_L3_${l3Idx}`;
                                    const isL3Open = !!openNodes[l3Key];
                                    const l4s = l3s[l3Name];

                                    return (
                                      <div key={l3Key} className="pl-3 border-l-2 border-emerald-100 space-y-2">
                                        {/* Level 3 Header */}
                                        <button
                                          onClick={() => toggleNode(l3Key)}
                                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 text-left"
                                        >
                                          {isL3Open ? <ChevronDown className="h-3.5 w-3.5 text-emerald-500" /> : <ChevronRight className="h-3.5 w-3.5 text-emerald-500" />}
                                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">L3 Discipline</span>
                                          <span>{l3Name}</span>
                                        </button>

                                        {isL3Open && (
                                          <div className="pl-6 space-y-3">
                                            {Object.keys(l4s).map((l4Name, l4Idx) => {
                                              const l4Key = `${l3Key}_L4_${l4Idx}`;
                                              const isL4Open = !!openNodes[l4Key];
                                              const l5s = l4s[l4Name];

                                              return (
                                                <div key={l4Key} className="pl-3 border-l-2 border-amber-100 space-y-1.5">
                                                  {/* Level 4 Header */}
                                                  <button
                                                    onClick={() => toggleNode(l4Key)}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 text-left"
                                                  >
                                                    {isL4Open ? <ChevronDown className="h-3.5 w-3.5 text-amber-500" /> : <ChevronRight className="h-3.5 w-3.5 text-amber-500" />}
                                                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">L4 Package</span>
                                                    <span>{l4Name}</span>
                                                  </button>

                                                  {isL4Open && (
                                                    <div className="pl-6 space-y-2.5">
                                                      {Object.keys(l5s).map((l5Name, l5Idx) => {
                                                        const l5Key = `${l4Key}_L5_${l5Idx}`;
                                                        const isL5Open = !!openNodes[l5Key];
                                                        const eventsList = l5s[l5Name];

                                                        return (
                                                          <div key={l5Key} className="pl-3 border-l-2 border-purple-100 space-y-1.5">
                                                            {/* Level 5 Header */}
                                                            <button
                                                              onClick={() => toggleNode(l5Key)}
                                                              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 text-left"
                                                            >
                                                              {isL5Open ? <ChevronDown className="h-3 w-3 text-purple-500" /> : <ChevronRight className="h-3 w-3 text-purple-500" />}
                                                              <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">L5 Activity</span>
                                                              <span>{l5Name}</span>
                                                            </button>

                                                            {isL5Open && (
                                                              <div className="pl-5 space-y-1.5 pt-1">
                                                                {eventsList.map((evt: any) => (
                                                                  <div key={evt.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between hover:border-slate-300 transition">
                                                                    <div>
                                                                      <div className="font-semibold text-slate-700 leading-snug flex items-center gap-2">
                                                                        <span className="text-[9px] font-extrabold bg-slate-200 px-1 py-0.5 rounded text-slate-600 uppercase shrink-0">L6 Job</span>
                                                                        <span>{evt.job}</span>
                                                                      </div>
                                                                      <div className="flex gap-3 text-[9px] text-slate-400 mt-1 font-medium">
                                                                        <span>Event ID: <b className="text-slate-600">{evt.id}</b></span>
                                                                        <span>Rule: <b className="text-slate-600">{evt.rule}</b></span>
                                                                      </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2">
                                                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                        evt.sif_probability >= 50.0 
                                                                          ? 'bg-red-50 text-industrial-red border-red-200' 
                                                                          : 'bg-emerald-50 text-industrial-green border-emerald-200'
                                                                      }`}>
                                                                        {evt.sif_probability >= 50.0 ? `SIF Pot (${evt.sif_probability}%)` : `Non-SIF (${evt.sif_probability}%)`}
                                                                      </span>
                                                                    </div>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          No hierarchy details loaded.
        </div>
      )}

    </div>
  );
};
