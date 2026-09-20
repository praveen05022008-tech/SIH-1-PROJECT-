import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Pencil,
  Check
} from 'lucide-react';
import { apiUrl } from '../config/api';
import { User, SafetyEvent } from '../types';

interface MyReportProps {
  user: User;
  onNavigateTo?: (page: string) => void;
  triggerStateRefresh?: boolean;
}

export const normalizeEmployeeStatus = (status?: string): 'Pending' | 'Completed' => {
  const s = (status || '').toLowerCase();
  if (s.includes('closed') || s.includes('resolved') || s.includes('completed') || s.includes('finished')) {
    return 'Completed';
  }
  return 'Pending';
};

export const MyReport: React.FC<MyReportProps> = ({ user, onNavigateTo, triggerStateRefresh }) => {
  const [reports, setReports] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedReport, setSelectedReport] = useState<SafetyEvent | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<SafetyEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const [editingReport, setEditingReport] = useState<SafetyEvent | null>(null);
  const [editForm, setEditForm] = useState({
    report_type: 'Unsafe Condition',
    hazard_category: 'General Safety',
    site: 'Site Alpha - Jamnagar Complex',
    unit: 'Unit 04 - FCCU',
    location_detail: '',
    description: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const formatReportCode = (code?: string, id?: string) => {
    if (code) return code.replace(/^#/, '');
    return id || 'RPT-JAM-001';
  };

  const fetchMyReports = () => {
    const targetEmail = user?.email || (() => {
      try {
        const stored = localStorage.getItem('raksha_auth_user');
        if (stored) return JSON.parse(stored).email;
      } catch {}
      return '';
    })();
    if (!targetEmail) return;
    setLoading(true);
    fetch(apiUrl(`/api/events?reporter_email=${encodeURIComponent(targetEmail)}`))
      .then(res => (res.ok ? res.json() : []))
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching my reports:', err);
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyReports();
  }, [user?.email, triggerStateRefresh]);

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    const code = formatReportCode(reportToDelete.report_code, reportToDelete.id);
    const targetId = reportToDelete.id;
    const targetCode = reportToDelete.report_code;
    const reportIdentifier = targetCode || targetId;

    setReports(prev => prev.filter(r => r.id !== targetId && r.report_code !== targetCode));
    setDeleteNotice(`Report #${code} deleted successfully.`);
    setTimeout(() => setDeleteNotice(null), 4500);
    if (selectedReport?.id === targetId) {
      setSelectedReport(null);
    }
    setReportToDelete(null);

    try {
      await fetch(apiUrl(`/api/events/${encodeURIComponent(reportIdentifier)}`), {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting report:', err);
    } finally {
      setDeleting(false);
      fetchMyReports();
    }
  };

  const handleOpenEdit = (report: SafetyEvent) => {
    setEditingReport(report);
    setEditForm({
      report_type: report.report_type || 'Unsafe Condition',
      hazard_category: report.hazard_category || report.life_saving_rule || 'General Safety',
      site: report.site || 'Site Alpha - Jamnagar Complex',
      unit: report.unit || 'Unit 04 - FCCU',
      location_detail: report.location_detail || report.location || '',
      description: report.description || report.raw_text || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setSavingEdit(true);
    try {
      const reportIdentifier = editingReport.report_code || editingReport.id;
      const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(reportIdentifier)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setReports(prev => prev.map(r => {
          if (r.id === editingReport.id || (r.report_code && r.report_code === editingReport.report_code)) {
            return {
              ...r,
              report_type: editForm.report_type,
              hazard_category: editForm.hazard_category,
              hazard: editForm.hazard_category,
              site: editForm.site,
              unit: editForm.unit,
              location_detail: editForm.location_detail,
              location: editForm.location_detail,
              description: editForm.description
            };
          }
          return r;
        }));
        setActionNotice({
          type: 'success',
          message: `Report #${formatReportCode(editingReport.report_code, editingReport.id)} updated successfully.`
        });
        setTimeout(() => setActionNotice(null), 4500);
        setEditingReport(null);
        fetchMyReports();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to update report.');
      }
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Network error while updating report.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Counts strictly normalized to Pending vs Completed
  const completedCount = useMemo(() => {
    return reports.filter(r => normalizeEmployeeStatus(r.status) === 'Completed').length;
  }, [reports]);

  const pendingCount = useMemo(() => {
    return reports.filter(r => normalizeEmployeeStatus(r.status) === 'Pending').length;
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const normStatus = normalizeEmployeeStatus(r.status);
      if (statusFilter === 'PENDING' && normStatus !== 'Pending') return false;
      if (statusFilter === 'COMPLETED' && normStatus !== 'Completed') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (r.report_code || '').toLowerCase().includes(q) || (r.id || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || r.raw_text || '').toLowerCase().includes(q);
        const matchesCat = (r.hazard_category || r.life_saving_rule || r.report_type || '').toLowerCase().includes(q);
        const matchesLoc = `${r.site || ''} ${r.unit || ''} ${r.location || ''}`.toLowerCase().includes(q);
        return matchesCode || matchesDesc || matchesCat || matchesLoc;
      }

      return true;
    });
  }, [reports, searchQuery, statusFilter]);

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-16">

      {/* Action / Delete Feedback Notifications */}
      {deleteNotice && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Trash2 className="h-4 w-4 text-red-600 shrink-0" />
            <span>{deleteNotice}</span>
          </div>
          <button onClick={() => setDeleteNotice(null)} className="text-red-400 hover:text-red-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionNotice && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              My Safety Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F6F4] text-[#007A6C] border border-[#A2D9D2]">
              {reports.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Review and track all safety observations and incident reports submitted by your account.
          </p>
        </div>

        {onNavigateTo && (
          <button
            onClick={() => onNavigateTo('report-issue')}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#00695C] hover:bg-[#00574B] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Submit new report</span>
          </button>
        )}
      </div>

      {/* 3 STATUS METRIC CARDS (Total, Pending, Completed) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* 1. Total Reports */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'ALL'
              ? 'border-[#008779] ring-2 ring-[#008779]/20 bg-[#E8F6F4]/30'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center shrink-0 border border-[#008779]/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {String(reports.length).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                All Reports
              </div>
            </div>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-[#008779]" />
        </div>

        {/* 2. Pending */}
        <div
          onClick={() => setStatusFilter(prev => (prev === 'PENDING' ? 'ALL' : 'PENDING'))}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'PENDING'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {String(pendingCount).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Pending
              </div>
            </div>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        </div>

        {/* 3. Completed */}
        <div
          onClick={() => setStatusFilter(prev => (prev === 'COMPLETED' ? 'ALL' : 'COMPLETED'))}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'COMPLETED'
              ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {String(completedCount).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Completed
              </div>
            </div>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>

      </div>

      {/* SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by report code, category, location, or observation..."
            className="w-full bg-white border border-slate-200/90 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto pl-3.5 pr-8 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] cursor-pointer appearance-none"
          >
            <option value="ALL">All Statuses ({reports.length})</option>
            <option value="PENDING">Pending ({pendingCount})</option>
            <option value="COMPLETED">Completed ({completedCount})</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Filter className="h-3 w-3" />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(statusFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
          >
            Reset
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={fetchMyReports}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TABLE CARD CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* Card Header inside Table */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#008779]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Observation History
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredReports.length} of {reports.length} reports
          </span>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-5 whitespace-nowrap">REPORT CODE</th>
                <th className="py-3 px-4 whitespace-nowrap">SUBMITTED ON</th>
                <th className="py-3 px-4">HAZARD / CATEGORY</th>
                <th className="py-3 px-4">LOCATION</th>
                <th className="py-3 px-4 whitespace-nowrap">SIF SCORE</th>
                <th className="py-3 px-4 whitespace-nowrap">STATUS</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">PHOTO</th>
                <th className="py-3 px-5 text-right whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#008779]" />
                    <span>Loading reports...</span>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                    <div className="font-bold text-slate-700 text-sm">
                      {reports.length === 0 ? 'No reports submitted yet' : 'No matching reports found'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {reports.length === 0
                        ? 'Submit your first observation using the button above.'
                        : 'Try adjusting your search query or status filter.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => {
                  const normStatus = normalizeEmployeeStatus(report.status);

                  const rawScore = report.sif_risk_score ?? (report.risk_score != null ? (report.risk_score > 10 ? report.risk_score / 10 : report.risk_score) : (report.severity_score ?? 2.5));
                  const score = Number(rawScore) || 2.5;
                  const potential = (report.sif_potential || (score >= 6.5 ? 'HIGH' : score >= 4.0 ? 'MEDIUM' : 'LOW')).toUpperCase();
                  const isHigh = potential === 'CRITICAL' || potential === 'HIGH' || score >= 6.5;

                  const parseSafeDate = (ts?: string | null): Date => {
                    if (!ts) return new Date();
                    const s = String(ts).trim();
                    if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
                      return new Date(s + 'Z');
                    }
                    return new Date(s);
                  };

                  const dateObj = parseSafeDate(report.timestamp);
                  const dateFormatted = dateObj.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const timeFormatted = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* REPORT CODE */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 text-xs tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                          {formatReportCode(report.report_code, report.id)}
                        </span>
                      </td>

                      {/* SUBMITTED ON */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-bold text-xs">{dateFormatted}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{timeFormatted}</div>
                      </td>

                      {/* CATEGORY / HAZARD */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {report.hazard_category || report.hazard || report.report_type || 'Unsafe Condition'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {report.description || report.raw_text || 'Field observation'}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold text-xs">
                          <MapPin className="h-3 w-3 text-[#007A6C] shrink-0" />
                          <span>{report.site || 'Site Alpha - Jamnagar'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-xs pl-4">
                          {report.unit || 'Unit 04 - FCCU'}
                        </div>
                      </td>

                      {/* SIF SCORE */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                          isHigh
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : score >= 4.0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {potential} • {score.toFixed(1)}
                        </span>
                      </td>

                      {/* STATUS: STRICTLY PENDING VS COMPLETED */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {normStatus === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* EVIDENCE */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {report.photo_url ? (
                          <button
                            onClick={() => setPreviewPhoto(report.photo_url || null)}
                            className="inline-flex items-center justify-center p-0.5 rounded-lg border border-slate-200 hover:border-[#008779] transition cursor-pointer"
                            title="View Photo Evidence"
                          >
                            <img
                              src={report.photo_url}
                              alt="Evidence"
                              className="h-6 w-6 rounded object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-semibold text-xs">—</span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSelectedReport(report)}
                            title="View Details"
                            className="p-1.5 rounded-lg hover:bg-[#E8F6F4] text-slate-600 hover:text-[#007A6C] transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(report)}
                            title="Edit Observation"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setReportToDelete(report)}
                            title="Delete Report"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER & PAGINATION */}
        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Showing 1 to {filteredReports.length} of {reports.length} reports
          </span>

          <div className="flex items-center gap-1">
            <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white text-xs cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="h-7 w-7 rounded-lg bg-[#00695C] text-white flex items-center justify-center text-xs font-bold">
              1
            </button>
            <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white text-xs cursor-pointer">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* DETAIL MODAL */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-default"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-[#005B54] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full">
                  Report Detail
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {formatReportCode(selectedReport.report_code, selectedReport.id)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Description:</span>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedReport.description || selectedReport.raw_text || 'No detailed description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium">Category:</span>
                  <div className="font-bold text-slate-800">{selectedReport.hazard_category || selectedReport.hazard || selectedReport.report_type || 'Operational Hazard'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div>
                    {normalizeEmployeeStatus(selectedReport.status) === 'Completed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Location:</span>
                  <div className="font-bold text-slate-800">{selectedReport.site || 'Site Alpha'} - {selectedReport.unit || 'Unit 04'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">SIF Potential:</span>
                  <div className="font-bold text-slate-800">{selectedReport.sif_potential || 'Medium'}</div>
                </div>
              </div>

              {selectedReport.photo_url && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium">Photo Evidence:</span>
                  <div className="mt-1.5 rounded-2xl overflow-hidden border border-slate-200">
                    <img
                      src={selectedReport.photo_url}
                      alt="Evidence"
                      className="w-full max-h-48 object-cover cursor-pointer hover:scale-105 transition duration-300"
                      onClick={() => setPreviewPhoto(selectedReport.photo_url || null)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingReport && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-default"
          onClick={() => setEditingReport(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Edit Safety Observation #{formatReportCode(editingReport.report_code, editingReport.id)}
              </h3>
              <button
                onClick={() => setEditingReport(null)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Hazard Category</label>
                <input
                  type="text"
                  value={editForm.hazard_category}
                  onChange={e => setEditForm(prev => ({ ...prev, hazard_category: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Site</label>
                  <input
                    type="text"
                    value={editForm.site}
                    onChange={e => setEditForm(prev => ({ ...prev, site: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={e => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Observation Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-[#008779] hover:bg-[#007064] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingEdit ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {reportToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-default"
          onClick={() => setReportToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Delete Observation Report?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete report <span className="font-bold text-slate-800">#{formatReportCode(reportToDelete.report_code, reportToDelete.id)}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReportToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReport}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1"
              >
                {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={previewPhoto} alt="Evidence Full Preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

    </div>
  );
};
