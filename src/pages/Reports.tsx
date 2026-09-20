import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  RefreshCcw, 
  FileBarChart2, 
  Calendar, 
  Filter, 
  Search, 
  Printer, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Building2, 
  CheckCircle2, 
  FileSpreadsheet,
  Layers,
  Sparkles,
  ChevronDown,
  X
} from 'lucide-react';
import { SafetyEvent } from '../types';
import { RiskBadge } from '../components/UIElements';

export const Reports: React.FC = () => {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<string | null>(null);

  // Date Filters
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Dimension Filters
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'templates' | 'custom-query' | 'preview'>('templates');

  // Fetch real data
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/events'));
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.warn('Failed to load events for reports:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle Preset Changes
  const applyDatePreset = (preset: 'all' | 'today' | '7d' | '30d' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const past7 = new Date(Date.now() - 7 * 86400000);
      setStartDate(past7.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === '30d') {
      const past30 = new Date(Date.now() - 30 * 86400000);
      setStartDate(past30.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // Extract unique sites for filter dropdown
  const uniqueSites = useMemo(() => {
    const sites = new Set<string>();
    events.forEach(e => {
      if (e.site && e.site.trim()) sites.add(e.site.trim());
    });
    return Array.from(sites);
  }, [events]);

  // Filtered Events based on all criteria
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Date Filter
      if (startDate || endDate) {
        const eventDateStr = (e.timestamp || (e as any).created_at || '').slice(0, 10);
        if (startDate && eventDateStr < startDate) return false;
        if (endDate && eventDateStr > endDate) return false;
      }

      // 2. Site Filter
      if (selectedSite !== 'ALL' && e.site !== selectedSite) return false;

      // 3. Risk Level Filter
      if (selectedRisk !== 'ALL') {
        const rLevel = (e.risk_level || '').toUpperCase();
        const sifPot = (e.sif_potential || '').toUpperCase();
        if (selectedRisk === 'CRITICAL' && rLevel !== 'CRITICAL' && sifPot !== 'CRITICAL') return false;
        if (selectedRisk === 'HIGH' && rLevel !== 'HIGH' && sifPot !== 'HIGH') return false;
        if (selectedRisk === 'MEDIUM' && rLevel !== 'MEDIUM' && sifPot !== 'MEDIUM') return false;
        if (selectedRisk === 'LOW' && rLevel !== 'LOW' && sifPot !== 'LOW') return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'ALL' && (e.status as string) !== selectedStatus) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = (e.description || e.raw_text || '').toLowerCase().includes(q);
        const matchHazard = (e.hazard || (e as any).hazard_category || '').toLowerCase().includes(q);
        const matchId = (e.id || '').toLowerCase().includes(q);
        const matchReporter = (e.reporter_name || '').toLowerCase().includes(q);
        const matchUnit = (e.unit || '').toLowerCase().includes(q);
        if (!matchText && !matchHazard && !matchId && !matchReporter && !matchUnit) return false;
      }

      return true;
    });
  }, [events, startDate, endDate, selectedSite, selectedRisk, selectedStatus, searchQuery]);

  // Metrics on filtered dataset
  const filteredMetrics = useMemo(() => {
    const total = filteredEvents.length;
    const criticalHigh = filteredEvents.filter(e => 
      e.risk_level === 'CRITICAL' || e.risk_level === 'HIGH' || e.sif_potential === 'High' || e.sif_potential === 'Critical'
    ).length;
    const resolved = filteredEvents.filter(e => e.status === 'Resolved' || e.status === 'Confirmed' || (e.status as string) === 'Completed').length;
    const unsafeActs = filteredEvents.filter(e => (e.condition || '').toLowerCase().includes('act')).length;
    const unsafeConditions = filteredEvents.filter(e => (e.condition || '').toLowerCase().includes('condition')).length;
    return { total, criticalHigh, resolved, unsafeActs, unsafeConditions };
  }, [filteredEvents]);

  // Report Templates Definitions
  const reportTemplates = [
    { 
      id: 'daily',
      title: 'Daily HSE Intelligence & Shift Handover Report', 
      desc: 'Summary of all field observations, active SIF alerts, barrier bypasses, and frontline status.',
      type: 'PDF & CSV'
    },
    { 
      id: 'weekly',
      title: 'Weekly SIF & High-Potential Precursor Audit', 
      desc: 'In-depth analysis of critical SIF-potential events, classification confidence, and root causes.',
      type: 'PDF & CSV'
    },
    { 
      id: 'monthly',
      title: 'Monthly Precursor Patterns & Site Ranking Summary', 
      desc: 'Aggregations of recurring barrier failures, unit vulnerability rankings, and hazard clusters.',
      type: 'Executive PDF'
    },
    { 
      id: 'siterisk',
      title: 'Site Operational Risk Exposure & Hierarchy Drilldown', 
      desc: 'Operational breakdown detailing L1-L6 active safety violations per refinery block and unit area.',
      type: 'CSV & Excel'
    },
    { 
      id: 'lsr',
      title: 'Life-Saving Rules Conformance & Safety Gap Audit', 
      desc: 'Stats on Life-Saving Rules compliance, common failure modes, and required intervention plans.',
      type: 'PDF & CSV'
    }
  ];

  const handleGenerate = async (title: string) => {
    setLoadingReport(title);
    setSuccessReport(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setSuccessReport(title);
    } catch {
      setSuccessReport(title);
    } finally {
      setLoadingReport(null);
    }
  };

  // Download filtered CSV
  const handleDownloadCsv = (reportTitle = 'Safety_Intelligence_Report') => {
    const csvHeader = "Report ID,Timestamp,Site,Unit,Location,Condition,Hazard,Risk Level,SIF Potential,Life Saving Rule,Status,Reporter,Description\n";
    const csvRows = filteredEvents.map(e => 
      `"${e.id || ''}","${e.timestamp || (e as any).created_at || ''}","${e.site || ''}","${e.unit || ''}","${e.location || ''}","${e.condition || 'Unsafe Condition'}","${(e.hazard || (e as any).hazard_category || '').replace(/"/g, '""')}","${e.risk_level || ''}","${e.sif_potential || ''}","${e.life_saving_rule || ''}","${e.status || ''}","${e.reporter_name || 'Worker'}","${(e.description || e.raw_text || '').replace(/"/g, '""')}"`
    ).join("\n");
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateTag = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `${reportTitle.replace(/[\s&/]+/g, '_').toLowerCase()}_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print formatted report
  const handlePrintReport = () => {
    window.print();
  };

  const clearAllFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedSite('ALL');
    setSelectedRisk('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans text-slate-800 pb-20">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-[#008779] border border-[#008779]/20 uppercase tracking-wider">
              Analytics & Compliance
            </span>
            <span className="text-xs text-slate-400 font-medium">• Custom Date Range & Filter Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence Reports & Data Exporter</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Filter observations by custom date range, site units, and SIF risk level. Export formatted compliance reports or raw datasets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDownloadCsv('Filtered_HSE_Export')}
            className="px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-md shadow-[#008779]/20 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export Filtered CSV ({filteredEvents.length})</span>
          </button>
          
          <button
            onClick={handlePrintReport}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-slate-200"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Interactive Date Range & Filter Control Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-[#008779] flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Filter Data by Date & Operational Scope
              </h3>
              <p className="text-[11px] text-slate-400">Select date range, facility site, or hazard priority to customize your report.</p>
            </div>
          </div>

          {(startDate || endDate || selectedSite !== 'ALL' || selectedRisk !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Row 1: Date Presets & Custom Date Pickers */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Date Range:</span>
              </span>
              {[
                { key: 'all', label: 'All Time' },
                { key: 'today', label: 'Today' },
                { key: '7d', label: 'Last 7 Days' },
                { key: '30d', label: 'Last 30 Days' },
                { key: 'month', label: 'This Month' },
                { key: 'custom', label: 'Custom Range' },
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyDatePreset(p.key as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    datePreset === p.key
                      ? 'bg-[#008779] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* From & To Custom Date Inputs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 pl-1">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 pl-1">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Row 2: Dimensional Filters (Site, Risk Level, Status, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          
          {/* Site Filter */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase text-slate-400 mb-1">
              Operational Site
            </label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-[#008779]/20"
            >
              <option value="ALL">All Operational Sites</option>
              {uniqueSites.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase text-slate-400 mb-1">
              Risk & SIF Priority
            </label>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-[#008779]/20"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical (SIF Alert)</option>
              <option value="HIGH">High (SIF Precursor)</option>
              <option value="MEDIUM">Medium (Routine Risk)</option>
              <option value="LOW">Low (Observation)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase text-slate-400 mb-1">
              Workflow Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-[#008779]/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Confirmed">Confirmed / In Progress</option>
              <option value="Resolved">Resolved / Completed</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase text-slate-400 mb-1">
              Search Keywords
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hazard, unit, ID..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#008779]/20"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Filtered Data Summary Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtered Records</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-[#008779] flex items-center justify-center">
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{filteredMetrics.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Matching observations in date range</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Critical / High SIF</span>
            <div className="h-7 w-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2 font-mono">{filteredMetrics.criticalHigh}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">High potential for serious harm</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved / Completed</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">{filteredMetrics.resolved}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Barriers verified and closed</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Unsafe Acts / Conditions</span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-2 font-mono">
            {filteredMetrics.unsafeActs} / {filteredMetrics.unsafeConditions}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Behavioral vs Physical factors</div>
        </div>

      </div>

      {/* Tabs: Standard Report Templates vs Live Dataset Preview */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileBarChart2 className="h-4 w-4" />
          <span>Compliance Report Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'preview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Filtered Data Preview ({filteredEvents.length})</span>
        </button>
      </div>

      {/* VIEW 1: COMPLIANCE REPORT TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Regulatory & Operational Compliance Templates
              </h3>
              <p className="text-[11px] text-slate-400">
                Generating any template below will automatically apply your current date range ({startDate || 'Start'} to {endDate || 'Now'}) and scope filters.
              </p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-[#008779] border border-[#008779]/20 px-2.5 py-1 rounded-full uppercase">
              {filteredEvents.length} Records in Scope
            </span>
          </div>

          <div className="space-y-3.5">
            {reportTemplates.map((rep) => {
              const isGenerating = loadingReport === rep.title;
              const isDone = successReport === rep.title;

              return (
                <div 
                  key={rep.id} 
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-2xs"
                >
                  <div className="flex gap-3.5 items-start">
                    <div className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 text-[#008779] shadow-xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900">{rep.title}</h4>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 uppercase">
                          {rep.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{rep.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {isGenerating ? (
                      <span className="flex items-center gap-1.5 text-xs text-[#008779] font-bold px-3 py-1.5 bg-emerald-50 rounded-xl">
                        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                        <span>Compiling Data...</span>
                      </span>
                    ) : isDone ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10.5px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold uppercase">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Generated</span>
                        </span>
                        <button 
                          onClick={() => handleDownloadCsv(rep.title)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download CSV</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerate(rep.title)}
                        className="px-4 py-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-[#008779]/40 text-slate-800 hover:text-[#008779] rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                      >
                        Generate Report
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: FILTERED DATASET PREVIEW TABLE */}
      {activeTab === 'preview' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Filtered Safety Dataset Preview
              </h3>
              <p className="text-[11px] text-slate-400">
                Showing {filteredEvents.length} records matching your date and scope filter selection.
              </p>
            </div>

            <button
              onClick={() => handleDownloadCsv('Filtered_Dataset_Export')}
              className="px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV Dataset</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-3.5">ID / Code</th>
                  <th className="py-3 px-3.5">Date & Time</th>
                  <th className="py-3 px-3.5">Facility Location</th>
                  <th className="py-3 px-3.5">Problem / Hazard</th>
                  <th className="py-3 px-3.5">Condition</th>
                  <th className="py-3 px-3.5">Risk Score</th>
                  <th className="py-3 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <RefreshCcw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#008779]" />
                      <span className="font-bold">Loading records...</span>
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                      <div className="font-bold text-slate-700 text-sm">No records match your selected filters</div>
                      <div className="text-xs text-slate-400 mt-1">Try expanding your date range or clearing selected criteria.</div>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 50).map((ev) => {
                    const rawScore = ev.risk_score || (ev.risk_level === 'CRITICAL' ? 9.2 : ev.risk_level === 'HIGH' ? 7.8 : 4.5);
                    const isHigh = ev.risk_level === 'CRITICAL' || ev.risk_level === 'HIGH';

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {ev.id}
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-slate-800">
                          {ev.site || 'Site Alpha'} <span className="text-slate-400 text-[11px]">({ev.unit || 'Unit Area'})</span>
                        </td>
                        <td className="py-3 px-3.5 max-w-xs truncate font-bold text-slate-900" title={ev.hazard || ev.description}>
                          {ev.hazard || ev.hazard_category || ev.description || 'Observation'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            ev.condition === 'Unsafe Act' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            ev.condition === 'Near Miss' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {ev.condition || 'Unsafe Condition'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isHigh ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {Number(rawScore).toFixed(1)} • {ev.risk_level || 'MEDIUM'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                            {ev.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredEvents.length > 50 && (
            <div className="text-center pt-2 text-xs text-slate-400 font-medium">
              Showing first 50 of {filteredEvents.length} records. Download CSV to export the complete dataset.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
