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
      return 'srinith@gmail.com';
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

      {/* TOP HEADER (Clean white layout matching Picture 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            My Safety Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            All safety observations and incident reports submitted by you.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Total Reports Stat Badge */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center shadow-2xs">
            <div className="text-xl font-black text-slate-900 leading-tight">
              {reports.length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Total Reports
            </div>
          </div>

          {/* + Report Safety Issue Button */}
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo('report-issue')}
              className="px-4 py-2.5 rounded-xl bg-[#005B54] hover:bg-[#004A44] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Report Safety Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 STATUS METRIC CARDS STRIP (Matching Picture 1 with 2-digit counts & bottom underline bars) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* 1. Needs Review */}
          <div
            onClick={() => setStatusFilter(prev => (prev === 'REVIEW' ? 'ALL' : 'REVIEW'))}
            className={`pt-2 lg:pt-0 lg:px-4 cursor-pointer select-none transition group ${
              statusFilter === 'REVIEW' ? 'opacity-100' : 'hover:opacity-90'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#FFFBEB] text-amber-500 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">
                  {String(needsReviewCount).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  Needs Review
                </div>
              </div>
            </div>
            <div className={`h-1 rounded-full mt-3.5 transition-all ${
              statusFilter === 'REVIEW' ? 'w-16 bg-amber-500' : 'w-12 bg-amber-500/80 group-hover:w-16'
            }`} />
          </div>

          {/* 2. In Progress */}
          <div
            onClick={() => setStatusFilter(prev => (prev === 'PROGRESS' ? 'ALL' : 'PROGRESS'))}
            className={`pt-3 lg:pt-0 lg:px-4 cursor-pointer select-none transition group ${
              statusFilter === 'PROGRESS' ? 'opacity-100' : 'hover:opacity-90'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#EFF6FF] text-blue-500 flex items-center justify-center shrink-0">
                <History className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">
                  {String(inProgressCount).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  In Progress
                </div>
              </div>
            </div>
            <div className={`h-1 rounded-full mt-3.5 transition-all ${
              statusFilter === 'PROGRESS' ? 'w-16 bg-blue-500' : 'w-12 bg-blue-500/80 group-hover:w-16'
            }`} />
          </div>

          {/* 3. Confirmed */}
          <div
            onClick={() => setStatusFilter(prev => (prev === 'CONFIRMED' ? 'ALL' : 'CONFIRMED'))}
            className={`pt-3 lg:pt-0 lg:px-4 cursor-pointer select-none transition group ${
              statusFilter === 'CONFIRMED' ? 'opacity-100' : 'hover:opacity-90'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#FAF5FF] text-purple-500 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">
                  {String(confirmedCount).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  Confirmed
                </div>
              </div>
            </div>
            <div className={`h-1 rounded-full mt-3.5 transition-all ${
              statusFilter === 'CONFIRMED' ? 'w-16 bg-purple-500' : 'w-12 bg-purple-500/80 group-hover:w-16'
            }`} />
          </div>

          {/* 4. Resolved */}
          <div
            onClick={() => setStatusFilter(prev => (prev === 'RESOLVED' ? 'ALL' : 'RESOLVED'))}
            className={`pt-3 lg:pt-0 lg:px-4 cursor-pointer select-none transition group ${
              statusFilter === 'RESOLVED' ? 'opacity-100' : 'hover:opacity-90'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#ECFDF5] text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 leading-tight">
                  {String(resolvedCount).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  Resolved
                </div>
              </div>
            </div>
            <div className={`h-1 rounded-full mt-3.5 transition-all ${
              statusFilter === 'RESOLVED' ? 'w-16 bg-emerald-500' : 'w-12 bg-emerald-500/80 group-hover:w-16'
            }`} />
          </div>

        </div>
      </div>

      {/* SEARCH, STATUS DROPDOWN, FILTERS, REFRESH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by report code, keyword, category, location..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005B54] focus:border-[#005B54] shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
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
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#005B54] cursor-pointer appearance-none pr-9"
          >
            <option value="ALL">Status: All Statuses</option>
            <option value="REVIEW">Status: Needs Review ({needsReviewCount})</option>
            <option value="PROGRESS">Status: In Progress ({inProgressCount})</option>
            <option value="CONFIRMED">Status: Confirmed ({confirmedCount})</option>
            <option value="RESOLVED">Status: Resolved ({resolvedCount})</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
            ▼
          </div>
        </div>

        {/* Filters Button */}
        <button
          onClick={() => {
            if (statusFilter !== 'ALL' || searchQuery) {
              setStatusFilter('ALL');
              setSearchQuery('');
            }
          }}
          className={`px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${
            statusFilter !== 'ALL' || searchQuery ? 'text-[#005B54] border-[#005B54]' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {(statusFilter !== 'ALL' || searchQuery) && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#005B54]"></span>
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={fetchMyReports}
          disabled={loading}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TABLE CARD CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden space-y-1">
        
        {/* Card Header inside Table */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="h-6 w-6 rounded-lg bg-[#ECFDF5] text-[#005B54] flex items-center justify-center">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider">
              Personal Observation History
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Showing {filteredReports.length} of {reports.length} reports submitted by {user.email}
          </p>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-6">REPORT CODE</th>
                <th className="py-3 px-4">SUBMITTED ON</th>
                <th className="py-3 px-4">CATEGORY / HAZARD</th>
                <th className="py-3 px-4">LOCATION</th>
                <th className="py-3 px-4">SIF SCORE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-center">EVIDENCE</th>
                <th className="py-3 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#005B54]" />
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

                  const score = report.sif_risk_score ?? 2.3;
                  const isHigh = score >= 6.5 || (report.risk_level || '').toUpperCase() === 'CRITICAL' || (report.risk_level || '').toUpperCase() === 'HIGH';

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
                    <tr key={report.id} className="hover:bg-slate-50/60 transition">
                      
                      {/* REPORT CODE */}
                      <td className="py-3.5 px-6">
                        <div className="font-extrabold text-slate-900 font-mono text-xs">
                          {formatReportCode(report.report_code, report.id)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {report.id}
                        </div>
                      </td>

                      {/* SUBMITTED ON */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{dateFormatted}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-medium">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>

                      {/* CATEGORY / HAZARD */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {report.hazard_category || report.life_saving_rule || report.report_type || 'Unsafe Condition'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {report.report_type || 'General'}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{report.site || 'Drilling Site A'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5 pl-4 truncate max-w-xs">
                          {report.unit || 'Rig Floor 01'} {report.location_detail ? `• ${report.location_detail}` : ''}
                        </div>
                      </td>

                      {/* SIF SCORE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${
                          isHigh
                            ? 'bg-[#FEF2F2] text-rose-700'
                            : 'bg-[#ECFDF5] text-emerald-700'
                        }`}>
                          {isHigh ? 'HIGH' : 'LOW'} • {score.toFixed(1)}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isReview && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#FFFBEB] text-amber-800 border border-amber-200/70">
                            Needs Review
                          </span>
                        )}
                        {isAction && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#EFF6FF] text-blue-700 border border-blue-200/70">
                            Action Dispatched
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#ECFDF5] text-emerald-800 border border-emerald-200/70">
                            Resolved
                          </span>
                        )}
                        {!isReview && !isAction && !isClosed && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700">
                            {report.status}
                          </span>
                        )}
                      </td>

                      {/* EVIDENCE */}
                      <td className="py-3.5 px-4 text-center">
                        {report.photo_url ? (
                          <button
                            onClick={() => setPreviewPhoto(report.photo_url || null)}
                            className="inline-flex items-center justify-center p-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:scale-105 transition cursor-pointer"
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

                      {/* ACTION (Eye, Pencil, Trash2, and More button) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 relative">
                          <button
                            onClick={() => setSelectedReport(report)}
                            title="View Details"
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(report)}
                            title="Edit Observation"
                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setReportToDelete(report)}
                            title="Delete Report"
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-600 hover:text-red-800 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Popover Dropdown Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpenId(menuOpenId === report.id ? null : report.id)}
                              title="More Actions"
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {menuOpenId === report.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-20" 
                                  onClick={() => setMenuOpenId(null)} 
                                />
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95">
                                  <button
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleOpenEdit(report);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Edit Observation</span>
                                  </button>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    onClick={() => {
                                      setReportToDelete(report);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    <span>Delete Permanently</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Showing 1 to {filteredReports.length} of {reports.length} reports
          </span>

          <div className="flex items-center gap-1">
            <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="h-7 w-7 rounded-lg bg-[#005B54] text-white flex items-center justify-center text-xs font-bold">
              1
            </button>
            <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs">
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
                <p className="text-slate-800 font-semibold mt-0.5">{selectedReport.description || 'No detailed description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium">Category:</span>
                  <div className="font-bold text-slate-800">{selectedReport.hazard_category || selectedReport.report_type}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div className="font-bold text-slate-800">{selectedReport.status}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Location:</span>
                  <div className="font-bold text-slate-800">{selectedReport.site} • {selectedReport.unit}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">SIF Risk Score:</span>
                  <div className="font-bold text-slate-800">{(selectedReport.sif_risk_score ?? 0).toFixed(1)}</div>
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
