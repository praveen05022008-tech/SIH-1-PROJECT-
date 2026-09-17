import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Shield,
  History,
  X,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
  Cloud
} from 'lucide-react';
import { apiUrl } from '../config/api';
import { User, SafetyEvent } from '../types';

interface MyReportProps {
  user: User;
  onNavigateTo?: (page: string) => void;
  triggerStateRefresh?: boolean;
}

export const MyReport: React.FC<MyReportProps> = ({ user, onNavigateTo, triggerStateRefresh }) => {
  const [reports, setReports] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState<SafetyEvent | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<SafetyEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    const code = formatReportCode(reportToDelete.report_code, reportToDelete.id);
    const targetId = reportToDelete.id;
    const targetCode = reportToDelete.report_code;
    const reportIdentifier = targetCode || targetId;

    // Optimistically remove from web state immediately
    setReports(prev => prev.filter(r => r.id !== targetId && r.report_code !== targetCode));
    setDeleteNotice(`Report #${code} deleted successfully.`);
    setTimeout(() => setDeleteNotice(null), 4500);
    if (selectedReport?.id === targetId) {
      setSelectedReport(null);
    }
    setReportToDelete(null);

    try {
      const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(reportIdentifier)}`), {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Delete error from server:', err);
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    } finally {
      setDeleting(false);
      // Re-fetch to ensure UI is in sync with DB
      fetchMyReports();
    }
  };


  const [editingReport, setEditingReport] = useState<SafetyEvent | null>(null);
  const [editForm, setEditForm] = useState({
    report_type: 'Unsafe Condition',
    hazard_category: 'General Safety',
    site: 'Drilling Site A',
    unit: 'Rig Floor 01',
    location_detail: '',
    description: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleOpenEdit = (report: SafetyEvent) => {
    setEditingReport(report);
    setEditForm({
      report_type: report.report_type || 'Unsafe Condition',
      hazard_category: report.hazard_category || report.life_saving_rule || 'General Safety',
      site: report.site || 'Drilling Site A',
      unit: report.unit || 'Rig Floor 01',
      location_detail: report.location_detail || report.location || '',
      description: report.description || ''
    });
    setMenuOpenId(null);
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
        if (selectedReport && (selectedReport.id === editingReport.id || selectedReport.report_code === editingReport.report_code)) {
          setSelectedReport(prev => prev ? {
            ...prev,
            report_type: editForm.report_type,
            hazard_category: editForm.hazard_category,
            hazard: editForm.hazard_category,
            site: editForm.site,
            unit: editForm.unit,
            location_detail: editForm.location_detail,
            location: editForm.location_detail,
            description: editForm.description
          } : null);
        }
        setActionNotice({
          type: 'success',
          message: `Report #${formatReportCode(editingReport.report_code, editingReport.id)} updated successfully.`
        });
        setTimeout(() => setActionNotice(null), 4500);
        setEditingReport(null);
        // Re-fetch to confirm server-side saved state
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

  // Counts for the 4 status cards
  const needsReviewCount = useMemo(() => {
    return reports.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s.includes('review') || s === 'pending';
    }).length;
  }, [reports]);

  const inProgressCount = useMemo(() => {
    return reports.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s.includes('progress') || s.includes('action') || s.includes('dispatch') || s.includes('investigat');
    }).length;
  }, [reports]);

  const confirmedCount = useMemo(() => {
    return reports.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s.includes('confirmed');
    }).length;
  }, [reports]);

  const resolvedCount = useMemo(() => {
    return reports.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s.includes('resolved') || s.includes('closed') || s.includes('completed');
    }).length;
  }, [reports]);

  // Filtered reports by search and status tab/dropdown
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const s = (r.status || '').toLowerCase();
        if (statusFilter === 'REVIEW' && !s.includes('review') && s !== 'pending') return false;
        if (statusFilter === 'PROGRESS' && !s.includes('progress') && !s.includes('action') && !s.includes('dispatch') && !s.includes('investigat')) return false;
        if (statusFilter === 'CONFIRMED' && !s.includes('confirmed')) return false;
        if (statusFilter === 'RESOLVED' && !s.includes('resolved') && !s.includes('closed') && !s.includes('completed')) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (r.report_code || '').toLowerCase().includes(q) || (r.id || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesCat = (r.hazard_category || r.life_saving_rule || r.report_type || '').toLowerCase().includes(q);
        const matchesLoc = `${r.site || ''} ${r.unit || ''} ${r.location || ''}`.toLowerCase().includes(q);
        return matchesCode || matchesDesc || matchesCat || matchesLoc;
      }

      return true;
    });
  }, [reports, searchQuery, statusFilter]);

  const formatReportCode = (code?: string, id?: string) => {
    if (code) return code.replace(/^#/, '');
    return id || 'SIF26165-001';
  };

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
            <span>Report Safety Issue</span>
          </button>
        )}
      </div>

      {/* 4 STATUS METRIC CARDS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Needs Review */}
        <div
          onClick={() => setStatusFilter(prev => (prev === 'REVIEW' ? 'ALL' : 'REVIEW'))}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'REVIEW'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {String(needsReviewCount).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Needs Review
              </div>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
        </div>

        {/* 2. In Progress */}
        <div
          onClick={() => setStatusFilter(prev => (prev === 'PROGRESS' ? 'ALL' : 'PROGRESS'))}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'PROGRESS'
              ? 'border-blue-400 ring-2 ring-blue-400/20 bg-blue-50/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {String(inProgressCount).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                In Progress
              </div>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        </div>

        {/* 3. Confirmed */}
        <div
          onClick={() => setStatusFilter(prev => (prev === 'CONFIRMED' ? 'ALL' : 'CONFIRMED'))}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'CONFIRMED'
              ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/60">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {String(confirmedCount).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Confirmed
              </div>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-purple-500" />
        </div>

        {/* 4. Resolved */}
        <div
          onClick={() => setStatusFilter(prev => (prev === 'RESOLVED' ? 'ALL' : 'RESOLVED'))}
          className={`p-4 rounded-2xl border transition cursor-pointer select-none bg-white shadow-2xs hover:shadow-xs flex items-center justify-between ${
            statusFilter === 'RESOLVED'
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
                {String(resolvedCount).padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Resolved
              </div>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
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
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto pl-3.5 pr-8 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] cursor-pointer appearance-none"
          >
            <option value="ALL">All Statuses ({reports.length})</option>
            <option value="REVIEW">Needs Review ({needsReviewCount})</option>
            <option value="PROGRESS">In Progress ({inProgressCount})</option>
            <option value="CONFIRMED">Confirmed ({confirmedCount})</option>
            <option value="RESOLVED">Resolved ({resolvedCount})</option>
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
            Reset Filters
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
                  const s = (report.status || '').toLowerCase();
                  const isClosed = s.includes('resolved') || s.includes('closed') || s.includes('completed');
                  const isAction = s.includes('action') || s.includes('dispatch') || s.includes('progress') || s.includes('investigat');
                  const isReview = s.includes('review') || s === 'pending';

                  const rawScore = report.sif_risk_score ?? (report.risk_score != null ? (report.risk_score > 10 ? report.risk_score / 10 : report.risk_score) : (report.severity_score ?? 2.5));
                  const score = Number(rawScore) || 2.5;
                  const potential = (report.sif_potential || (score >= 6.5 ? 'HIGH' : score >= 4.0 ? 'MEDIUM' : 'LOW')).toUpperCase();
                  const isHigh = potential === 'CRITICAL' || potential === 'HIGH' || score >= 6.5;

                  const dateObj = new Date(report.timestamp);
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

                      {/* STATUS */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isReview && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Needs Review
                          </span>
                        )}
                        {isAction && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Action Dispatched
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Resolved
                          </span>
                        )}
                        {!isReview && !isAction && !isClosed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {report.status}
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
                  <div className="font-bold text-slate-800">{selectedReport.status || 'Pending Review'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Location:</span>
                  <div className="font-bold text-slate-800">{selectedReport.site || 'Site Alpha'} • {selectedReport.unit || 'Unit 04'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">SIF Risk Score:</span>
                  {(() => {
                    const rawScore = selectedReport.sif_risk_score ?? (selectedReport.risk_score != null ? (selectedReport.risk_score > 10 ? selectedReport.risk_score / 10 : selectedReport.risk_score) : (selectedReport.severity_score ?? 2.5));
                    const score = Number(rawScore) || 2.5;
                    const potential = (selectedReport.sif_potential || (score >= 6.5 ? 'High' : score >= 4.0 ? 'Medium' : 'Low'));
                    const isHigh = potential.toLowerCase() === 'critical' || potential.toLowerCase() === 'high' || score >= 6.5;

                    return (
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isHigh 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : score >= 4.0 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {potential}
                        </span>
                        <span>{score.toFixed(1)} / 10.0</span>
                        {selectedReport.risk_score != null && (
                          <span className="text-slate-400 font-medium text-[10px]">({Number(selectedReport.risk_score).toFixed(1)}/100)</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {selectedReport.photo_url && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <Cloud className="h-3.5 w-3.5" />
                        <span>Cloudinary Evidence Photo</span>
                      </span>
                    </span>
                    <a
                      href={selectedReport.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#008779] hover:underline font-bold text-[11px]"
                    >
                      Open Full Size ↗
                    </a>
                  </div>
                  <img
                    src={selectedReport.photo_url}
                    alt="Evidence"
                    className="w-full max-h-56 object-cover rounded-xl mt-1 border border-slate-200 cursor-zoom-in"
                    onClick={() => setPreviewPhoto(selectedReport.photo_url || null)}
                  />
                </div>
              )}

              {/* Bottom Action Controls inside Detail Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const rep = selectedReport;
                    setSelectedReport(null);
                    setReportToDelete(rep);
                  }}
                  className="px-3.5 py-2 border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const rep = selectedReport;
                      setSelectedReport(null);
                      handleOpenEdit(rep);
                    }}
                    className="px-4 py-2 bg-[#005B54] hover:bg-[#004A44] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Observation</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* EDIT OBSERVATION MODAL */}
      {editingReport && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-default"
          onClick={() => setEditingReport(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  Edit Observation
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                  <span>{formatReportCode(editingReport.report_code, editingReport.id)}</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">({editingReport.id})</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingReport(null)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Observation Type
                  </label>
                  <select
                    value={editForm.report_type}
                    onChange={e => setEditForm({ ...editForm, report_type: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="Unsafe Condition">Unsafe Condition</option>
                    <option value="Unsafe Act">Unsafe Act</option>
                    <option value="Near Miss">Near Miss</option>
                    <option value="Incident">Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Hazard Category
                  </label>
                  <select
                    value={editForm.hazard_category}
                    onChange={e => setEditForm({ ...editForm, hazard_category: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="Working at Height">Working at Height</option>
                    <option value="Energy Isolation / LOTO">Energy Isolation / LOTO</option>
                    <option value="Confined Space">Confined Space</option>
                    <option value="Hot Work / Fire Safety">Hot Work / Fire Safety</option>
                    <option value="Line of Fire / Stored Energy">Line of Fire / Stored Energy</option>
                    <option value="Lifting Operations">Lifting Operations</option>
                    <option value="Chemical / Gas Release">Chemical / Gas Release</option>
                    <option value="Electrical Safety">Electrical Safety</option>
                    <option value="General Safety">General Safety</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Operational Site
                  </label>
                  <select
                    value={editForm.site}
                    onChange={e => setEditForm({ ...editForm, site: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="Refinery A">Refinery A</option>
                    <option value="Drilling Site A">Drilling Site A</option>
                    <option value="Drilling Site B">Drilling Site B</option>
                    <option value="Digboi Refinery D">Digboi Refinery D</option>
                    <option value="Offshore Rig 04">Offshore Rig 04</option>
                    <option value="Numaligarh Terminal">Numaligarh Terminal</option>
                    <option value="Barauni Unit E">Barauni Unit E</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit / Plant Area
                  </label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    placeholder="e.g. Rig Floor 01, CDU Area, FCCU"
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Specific Location Details
                </label>
                <input
                  type="text"
                  value={editForm.location_detail}
                  onChange={e => setEditForm({ ...editForm, location_detail: e.target.value })}
                  placeholder="e.g. Near Mud Pump Area, Substructure elevation +12m"
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observation Narrative / Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Detail the hazard observed, context, equipment, or unsafe actions..."
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-[#005B54] hover:bg-[#004A44] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-[#005B54]/20"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
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
          onClick={() => !deleting && setReportToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-red-50 text-red-600 border border-red-200/60 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Observation Report?</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  #{formatReportCode(reportToDelete.report_code, reportToDelete.id)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this observation? All linked precursor data, audits, and task records will be permanently removed. This action cannot be undone.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-0.5">{reportToDelete.hazard_category || reportToDelete.report_type}</span>
              <p className="text-slate-500 line-clamp-2 text-[11px]">{reportToDelete.description || 'No description'}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteReport}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-red-600/20"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl space-y-3 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Photo Evidence</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Cloudinary CDN
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhoto}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-xs font-bold text-[#008779] hover:bg-[#E8F6F4] rounded-lg border border-[#A2D9D2] transition flex items-center gap-1"
                >
                  <span>Open Original ↗</span>
                </a>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewPhoto}
                alt="Evidence Full"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
