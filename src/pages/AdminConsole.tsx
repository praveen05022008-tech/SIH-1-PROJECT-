import { apiUrl } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardHat,
  BarChart3,
  Search,
  Check,
  X,
  Clock,
  Briefcase,
  Shield,
  Layers,
  Activity,
  Calendar,
  Filter,
  Eye,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Flame,
  Radio,
  UserCheck,
  UserX,
  History,
  Lock,
  Unlock,
  Building2,
  MapPin,
  FileCheck2,
  Info,
  Trash2,
  Phone,
  Camera,
  LogIn,
  LogOut,
  CheckSquare
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import { AdminUser, AdminDashboardData, AdminReport, AuditLogEntry } from '../types';

interface AdminConsoleProps {
  onResetDb?: () => void;
  triggerNotification?: (msg: string) => void;
  onNavigateTo?: (page: string) => void;
  initialTab?: 'dashboard' | 'requests' | 'users' | 'roles' | 'reports' | 'audit';
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  onResetDb,
  triggerNotification,
  onNavigateTo,
  initialTab = 'dashboard'
}) => {
  // Top-level 6 Admin Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'users' | 'roles' | 'reports' | 'audit'>(initialTab);

  // ==========================================
  // 1. DASHBOARD STATE
  // ==========================================
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // ==========================================
  // 2. USER MANAGEMENT STATE
  // ==========================================
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('All');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('All');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUser | null>(null);
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);

  // ==========================================
  // 3. ROLE MANAGEMENT STATE
  // ==========================================
  const [roleChangeUserId, setRoleChangeUserId] = useState<number | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<string>('Employee');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // ==========================================
  // 4. ALL REPORTS STATE
  // ==========================================
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState<string>('All');
  const [reportManagerFilter, setReportManagerFilter] = useState<string>('All');
  const [reportOfficerFilter, setReportOfficerFilter] = useState<string>('All');
  const [reportIssueTypeFilter, setReportIssueTypeFilter] = useState<string>('All');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('All');
  const [reportDateFilter, setReportDateFilter] = useState<string>('All');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [selectedReportDetail, setSelectedReportDetail] = useState<AdminReport | null>(null);
  const [selectedReportCodes, setSelectedReportCodes] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // ==========================================
  // 5. AUDIT LOG STATE
  // ==========================================
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('All');
  const [auditIssueIdFilter, setAuditIssueIdFilter] = useState<string>('');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditLogEntry | null>(null);

  // ── Fetch Dashboard Data ───────────────────────────────────────────────────
  const fetchDashboardData = (showSpinner = false) => {
    if (showSpinner || !dashboardData) setLoadingDashboard(true);
    fetch(apiUrl('/api/admin/dashboard'))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setDashboardData(data);
      })
      .catch(err => console.error('Error fetching admin dashboard:', err))
      .finally(() => setLoadingDashboard(false));
  };

  // ── Fetch Users List ───────────────────────────────────────────────────────
  const fetchUsers = (showSpinner = false) => {
    if (showSpinner || users.length === 0) setLoadingUsers(true);
    fetch(apiUrl('/api/admin/users'))
      .then(res => res.ok ? res.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching users:', err))
      .finally(() => setLoadingUsers(false));
  };

  // ── Fetch All Reports ──────────────────────────────────────────────────────
  const fetchReports = (showSpinner = false) => {
    if (showSpinner || reports.length === 0) setLoadingReports(true);
    fetch(apiUrl('/api/admin/reports?limit=200'))
      .then(res => res.ok ? res.json() : [])
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching reports:', err))
      .finally(() => setLoadingReports(false));
  };

  // ── Fetch Audit Logs ───────────────────────────────────────────────────────
  const fetchAuditLogs = (showSpinner = false) => {
    if (showSpinner || auditLogs.length === 0) setLoadingAudits(true);
    fetch(apiUrl('/api/admin/audit-logs?limit=300'))
      .then(res => res.ok ? res.json() : [])
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching audit logs:', err))
      .finally(() => setLoadingAudits(false));
  };

  // Load initial data on mount (no rapid 6s loop that blinks the screen)
  useEffect(() => {
    fetchDashboardData(true);
    fetchUsers(true);
    fetchReports(true);
    fetchAuditLogs(true);
  }, []);

  // Sync activeTab when initialTab prop changes from sidebar navigation
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Reload tab-specific data smoothly when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData(false);
    if (activeTab === 'users' || activeTab === 'roles' || activeTab === 'requests') fetchUsers(false);
    if (activeTab === 'reports') fetchReports(false);
    if (activeTab === 'audit') fetchAuditLogs(false);
  }, [activeTab]);

  // ── User Actions: Approve, Reject, Toggle Active, Change Role ──────────────
  const handleApproveUser = async (userId: number, userName: string) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/approve`), {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(`User "${userName}" has been approved. They can now log in.`);
        triggerNotification?.(`User Approved: ${userName}`);
        fetchUsers();
        fetchDashboardData();
        fetchAuditLogs();
        setTimeout(() => setUserActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectUser = async (userId: number, userName: string) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/reject`), {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(`User "${userName}" registration rejected.`);
        triggerNotification?.(`User Rejected: ${userName}`);
        fetchUsers();
        fetchDashboardData();
        fetchAuditLogs();
        setTimeout(() => setUserActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActiveUser = async (userId: number, userName: string) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/toggle-active`), {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        const action = data.is_active ? 'Activated' : 'Deactivated';
        setUserActionMessage(`User "${userName}" account is now ${action}.`);
        triggerNotification?.(`User ${action}: ${userName}`);
        fetchUsers();
        fetchDashboardData();
        fetchAuditLogs();
        setTimeout(() => setUserActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    setRoleUpdating(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/change-role`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUserActionMessage(`Role successfully updated to ${newRole}.`);
        triggerNotification?.(`Role Updated: Changed to ${newRole}`);
        setRoleChangeUserId(null);
        fetchUsers();
        fetchDashboardData();
        fetchAuditLogs();
        setTimeout(() => setUserActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRoleUpdating(false);
    }
  };

  // ── Pending Users Queue ──────────────────────────────────────────────────
  const pendingUsers = useMemo(() => {
    return users.filter(u => u.approval_status === 'Pending');
  }, [users]);

  // ── Delete Report ────────────────────────────────────────────────────────
  const handleDeleteReport = async (reportId: string, reportCode: string) => {
    // Optimistically remove from web state immediately
    setReports(prev => prev.filter(r =>
      r.id !== reportId &&
      r.id.toString() !== reportId &&
      r.report_code !== reportCode &&
      r.report_code !== `#${reportCode}` &&
      r.report_code !== reportCode.replace('#', '') &&
      r.id !== reportCode
    ));
    setUserActionMessage(`Report "${reportCode}" has been permanently deleted.`);
    triggerNotification?.(`Report Deleted: ${reportCode}`);
    setTimeout(() => setUserActionMessage(null), 4000);

    try {
      const targetIdentifier = reportId || reportCode;
      const res = await fetch(apiUrl(`/api/admin/reports/${encodeURIComponent(targetIdentifier)}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchReports();
        fetchDashboardData();
        fetchAuditLogs();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Delete report error:', data);
        fetchReports();
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      fetchReports();
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    // Optimistically remove from web state immediately
    setUsers(prev => prev.filter(u => u.id !== userId));
    setUserActionMessage(`User "${userName}" has been permanently deleted.`);
    triggerNotification?.(`User Deleted: ${userName}`);
    setTimeout(() => setUserActionMessage(null), 4000);

    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
        fetchDashboardData();
        fetchAuditLogs();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Delete user error:', data);
        fetchUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      fetchUsers();
    }
  };

  // ── Filtered Users ─────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (userRoleFilter !== 'All' && u.role?.toLowerCase() !== userRoleFilter.toLowerCase()) {
        return false;
      }
      // Status filter
      if (userStatusFilter === 'Pending' && u.approval_status !== 'Pending') return false;
      if (userStatusFilter === 'Approved' && u.approval_status !== 'Approved') return false;
      if (userStatusFilter === 'Rejected' && u.approval_status !== 'Rejected') return false;
      if (userStatusFilter === 'Active' && !u.is_active) return false;
      if (userStatusFilter === 'Deactivated' && u.is_active) return false;

      // Search query
      if (userSearchQuery) {
        const q = userSearchQuery.toLowerCase();
        const matchesName = u.name?.toLowerCase().includes(q) ?? false;
        const matchesEmail = u.email?.toLowerCase().includes(q) ?? false;
        const matchesId = u.id_number?.toLowerCase().includes(q) ?? false;
        const matchesPhone = u.phone?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesEmail && !matchesId && !matchesPhone) return false;
      }
      return true;
    });
  }, [users, userRoleFilter, userStatusFilter, userSearchQuery]);

  // ── Filtered Reports ───────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Employee filter
      if (reportEmployeeFilter !== 'All' && !r.reporter_email.toLowerCase().includes(reportEmployeeFilter.toLowerCase())) {
        return false;
      }
      // Officer filter
      if (reportOfficerFilter !== 'All' && !r.reviewer.toLowerCase().includes(reportOfficerFilter.toLowerCase())) {
        return false;
      }
      // Issue Type filter
      if (reportIssueTypeFilter !== 'All') {
        const matchesType = r.report_type.toLowerCase() === reportIssueTypeFilter.toLowerCase();
        const matchesRule = r.life_saving_rule.toLowerCase().includes(reportIssueTypeFilter.toLowerCase());
        if (!matchesType && !matchesRule) return false;
      }
      // Status filter
      if (reportStatusFilter !== 'All') {
        const matchesStatus = r.status.toLowerCase().includes(reportStatusFilter.toLowerCase());
        const matchesActionStatus = r.action_status.toLowerCase().includes(reportStatusFilter.toLowerCase());
        if (!matchesStatus && !matchesActionStatus) return false;
      }
      // Date filter
      if (reportDateFilter !== 'All') {
        const eventDate = new Date(r.timestamp);
        const now = new Date();
        if (reportDateFilter === '24h') {
          const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 3600);
          if (diffHours > 24) return false;
        } else if (reportDateFilter === '7d') {
          const diffDays = (now.getTime() - eventDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (reportDateFilter === '30d') {
          const diffDays = (now.getTime() - eventDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }
      // Search
      if (reportSearchQuery) {
        const q = reportSearchQuery.toLowerCase();
        const matchesCode = r.report_code.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesSite = r.site.toLowerCase().includes(q);
        const matchesHazard = r.hazard.toLowerCase().includes(q);
        if (!matchesCode && !matchesDesc && !matchesSite && !matchesHazard) return false;
      }
      return true;
    });
  }, [reports, reportEmployeeFilter, reportOfficerFilter, reportIssueTypeFilter, reportStatusFilter, reportDateFilter, reportSearchQuery]);

  // Unique lists for report filters
  const uniqueReporters = useMemo(() => {
    return Array.from(new Set(reports.map(r => r.reporter_email))).filter(Boolean);
  }, [reports]);

  const uniqueOfficers = useMemo(() => {
    return Array.from(new Set(reports.map(r => r.reviewer))).filter(r => r && r !== 'Unassigned');
  }, [reports]);

  // ── Multi-Select & Batch Delete Reports ────────────────────────────────────
  const isAllVisibleSelected = filteredReports.length > 0 && filteredReports.every(r => selectedReportCodes.has(r.report_code || r.id.toString()));

  const handleToggleSelectReport = (code: string) => {
    setSelectedReportCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedReportCodes(prev => {
        const next = new Set(prev);
        filteredReports.forEach(r => next.delete(r.report_code || r.id.toString()));
        return next;
      });
    } else {
      setSelectedReportCodes(prev => {
        const next = new Set(prev);
        filteredReports.forEach(r => next.add(r.report_code || r.id.toString()));
        return next;
      });
    }
  };

  const handleDeselectAll = () => {
    setSelectedReportCodes(new Set());
  };

  const handleBatchDeleteReports = async () => {
    if (selectedReportCodes.size === 0) return;
    const count = selectedReportCodes.size;
    const codesToDelete = Array.from(selectedReportCodes);

    // Optimistically remove from web state immediately
    const toDeleteSet = new Set(codesToDelete);
    setReports(prev => prev.filter(r =>
      !toDeleteSet.has(r.report_code) &&
      !toDeleteSet.has(r.id.toString()) &&
      !toDeleteSet.has(r.report_code?.replace('#', '')) &&
      !toDeleteSet.has(`#${r.report_code}`)
    ));

    setSelectedReportCodes(new Set());
    setUserActionMessage(`Successfully deleted ${count} selected reports permanently.`);
    triggerNotification?.(`Batch Deleted: ${count} Reports`);
    setTimeout(() => setUserActionMessage(null), 4500);

    setBatchDeleting(true);
    try {
      const res = await fetch(apiUrl('/api/admin/reports/batch-delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: codesToDelete })
      });
      if (res.ok) {
        fetchReports();
        fetchDashboardData();
        fetchAuditLogs();
      } else {
        // Fallback: delete one by one
        await Promise.all(
          codesToDelete.map(code =>
            fetch(apiUrl(`/api/admin/reports/${encodeURIComponent(code)}`), { method: 'DELETE' }).catch(() => { })
          )
        );
        fetchReports();
        fetchDashboardData();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Batch delete error:', err);
      fetchReports();
    } finally {
      setBatchDeleting(false);
    }
  };

  // ── Filtered Audit Logs ────────────────────────────────────────────────────
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(a => {
      // Action filter
      if (auditActionFilter !== 'All' && !a.action.toLowerCase().includes(auditActionFilter.toLowerCase())) {
        return false;
      }
      // Specific issue / event history filter
      if (auditIssueIdFilter && !a.event_id.toLowerCase().includes(auditIssueIdFilter.toLowerCase())) {
        return false;
      }
      // Search query
      if (auditSearchQuery) {
        const q = auditSearchQuery.toLowerCase();
        const matchesEvent = a.event_id.toLowerCase().includes(q);
        const matchesActor = a.actor_name.toLowerCase().includes(q);
        const matchesDetails = a.details.toLowerCase().includes(q);
        const matchesAction = a.action.toLowerCase().includes(q);
        if (!matchesEvent && !matchesActor && !matchesDetails && !matchesAction) return false;
      }
      return true;
    });
  }, [auditLogs, auditActionFilter, auditIssueIdFilter, auditSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans antialiased">

      {/* Global Notification Banner */}
      {userActionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-extrabold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{userActionMessage}</span>
          </div>
          <button
            onClick={() => setUserActionMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}



      {/* ===================================================================== */}
      {/* ── TAB 1: ADMIN DASHBOARD ─────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* 1. WELCOME BOX */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] text-white p-7 shadow-lg shadow-[#008779]/15">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-bold border border-white/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Master Operations & Safety Command</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Welcome, System Administrator
              </h2>
              <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed font-normal">
                You have master authority over the SIF-SHIELD AI platform. Oversee registered users, verify onboarding applications, govern the four operational roles, examine fleet-wide reports, and track real-time audit event logs.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-4 py-2 bg-white text-[#008779] hover:bg-emerald-50 text-xs font-extrabold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Review Pending Users ({dashboardData?.kpis.pending_approvals ?? 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="px-4 py-2 bg-[#FF7A1A] hover:bg-[#E56A12] text-white text-xs font-extrabold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Inspect All Reports</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. STATS BOXES (TOTAL EMPLOYEE, TOTAL OFFICER, TOTAL MANAGER, PENDING) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Box 1: Total Employee */}
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  Total Employees
                </span>
                <div className="h-9 w-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <HardHat className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {dashboardData?.kpis.total_employee ?? 0}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Field Workers & Frontline Techs</span>
                </div>
              </div>
            </div>

            {/* Box 2: Total Officer */}
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  Total Officers
                </span>
                <div className="h-9 w-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {dashboardData?.kpis.total_officer ?? 0}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Safety Leads & Field Auditors</span>
                </div>
              </div>
            </div>

            {/* Box 3: Total Manager */}
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  Total Managers
                </span>
                <div className="h-9 w-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {dashboardData?.kpis.total_manager ?? 0}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>HSE Leads & Incident Commanders</span>
                </div>
              </div>
            </div>

            {/* Box 4: Pending Onboarding Approvals */}
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm hover:shadow-md transition relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  Pending Approvals
                </span>
                <div className="h-9 w-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-amber-600 tracking-tight flex items-center gap-2">
                  <span>{dashboardData?.kpis.pending_approvals ?? 0}</span>
                  {(dashboardData?.kpis.pending_approvals ?? 0) > 0 && (
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                      Action Needed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-medium">
                  <span>Awaiting Admin verification</span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Review: Pending Access Requests Queue */}
          <div className={`border rounded-3xl p-5 shadow-sm transition ${pendingUsers.length > 0
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-[#E6ECEB]'
            }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center font-bold ${pendingUsers.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">
                      User Registration & Access Requests
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${pendingUsers.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                      {pendingUsers.length} Pending
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {pendingUsers.length > 0
                      ? 'New users who registered on the login page awaiting administrator review and access approval.'
                      : 'All user onboarding registrations are currently approved. New registrations will appear here automatically in real time.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchUsers(); fetchDashboardData(); }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Sync Requests</span>
                </button>
                {pendingUsers.length > 0 && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="px-3 py-1.5 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Open Requests Queue ({pendingUsers.length})</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-2xl bg-white/80 border border-slate-200/60">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-slate-700">No Pending Requests</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  When an employee, officer, or manager registers on the login page, their request will appear here instantly with 1-click Approve and Reject buttons.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingUsers.map(u => (
                  <div
                    key={u.id}
                    className="bg-white border border-amber-200 rounded-2xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-xs">{u.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                            Requested: {u.role}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">({u.id_number})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
                          <span>{u.email}</span>
                          {u.phone && u.phone !== '—' && (
                            <span className="font-sans text-slate-400 flex items-center gap-1">
                              <Phone className="h-3 w-3 inline text-slate-400" />
                              {u.phone}
                            </span>
                          )}
                          {u.address && u.address !== '—' && (
                            <span className="font-sans text-slate-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3 inline text-slate-400" />
                              {u.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => handleApproveUser(u.id, u.name)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRejectUser(u.id, u.name)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. GRAPHS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Graph 1: User Distribution by Role */}
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">User Distribution by Role</h3>
                  <p className="text-xs text-slate-400">Total authorized accounts across 4 platform roles</p>
                </div>
                <span className="text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                  {dashboardData?.kpis.total_users ?? 0} Total
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.charts.role_distribution ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="role" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" fill="#008779" radius={[8, 8, 0, 0]}>
                      {(dashboardData?.charts.role_distribution ?? []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#008779'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graph 2: Reports by Severity / Risk */}
            <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Fleet Safety Reports by Risk Level</h3>
                  <p className="text-xs text-slate-400">Multi-factor composite 0–10 risk categorization</p>
                </div>
                <span className="text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                  {dashboardData?.kpis.total_reports ?? 0} Reports
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.charts.severity_distribution ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="severity" type="category" stroke="#64748b" fontSize={11} width={70} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {(dashboardData?.charts.severity_distribution ?? []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#008779'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ── TAB: ADMIN ACCESS REQUESTS (PENDING APPROVALS) ─────────────────── */}
      {/* ===================================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-6">

          {/* Header & Controls */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Approval Queue
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {pendingUsers.length} pending request{pendingUsers.length === 1 ? '' : 's'}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-amber-600" />
                  <span>Admin Access Requests & Onboarding Approvals</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  When new field employees, officers, or managers register on the login page, their accounts arrive here with status <strong>Pending</strong>. Review and approve their access to enable system login.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchUsers(true); fetchDashboardData(true); }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? 'animate-spin text-[#008779]' : ''}`} />
                  <span>Sync Requests</span>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>All Users Directory</span>
                </button>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl overflow-hidden shadow-sm">
            {pendingUsers.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="h-14 w-14 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">No Pending Requests In Queue</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  All user registration requests have been reviewed and approved. When a new user registers on the portal login screen, their application will appear here instantly.
                </p>
                <button
                  onClick={() => setActiveTab('users')}
                  className="mt-5 px-4 py-2 bg-[#008779] text-white hover:bg-[#007064] text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Browse Authorized Users
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-amber-50/70 border-b border-amber-200/80 text-[10.5px] font-black uppercase tracking-wider text-amber-900">
                    <tr>
                      <th className="py-3.5 px-4">Applicant & Contact</th>
                      <th className="py-3.5 px-4">Employee / ID No.</th>
                      <th className="py-3.5 px-4">Requested Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Registration Date</th>
                      <th className="py-3.5 px-4 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingUsers.map(user => (
                      <tr key={user.id} className="hover:bg-amber-50/30 transition">
                        {/* Name & Contact */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm">{user.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                              {(user.phone || user.address) && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                  {user.phone && user.phone !== '—' && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-2.5 w-2.5 inline text-slate-400" />
                                      {user.phone}
                                    </span>
                                  )}
                                  {user.address && user.address !== '—' && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-2.5 w-2.5 inline text-slate-400" />
                                      {user.address}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ID No. */}
                        <td className="py-4 px-4 font-mono font-bold text-slate-700">
                          {user.id_number || '—'}
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${user.role === 'Employee'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : user.role === 'Officer'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : user.role === 'Manager'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            <Clock className="h-3 w-3 text-amber-700" />
                            <span>Awaiting Approval</span>
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                          {user.created_at ? new Date(user.created_at).toLocaleString() : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveUser(user.id, user.name)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve Access</span>
                            </button>
                            <button
                              onClick={() => handleRejectUser(user.id, user.name)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ── TAB 2: USER MANAGEMENT ─────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">

          {/* User Management Toolbar & Filters */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-[#008779]" />
                  <span>User Onboarding & Account Management</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Review new registered users (shown as Pending), approve or reject requests, and manage active statuses.
                </p>
              </div>

              <button
                onClick={() => fetchUsers(true)}
                disabled={loadingUsers}
                className="self-start md:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? 'animate-spin text-[#008779]' : ''}`} />
                <span>Refresh Users</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">

              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by name, email, ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#008779] text-slate-800"
                />
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Roles (Employee, Officer, Manager, Admin)</option>
                  <option value="Employee">Employee</option>
                  <option value="Officer">Officer</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Statuses (Pending, Approved, Rejected)</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Active">● Active Accounts</option>
                  <option value="Deactivated">○ Deactivated Accounts</option>
                </select>
              </div>

            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">User & Contact</th>
                    <th className="py-3.5 px-4">ID No.</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Approval Status</th>
                    <th className="py-3.5 px-4">Active State</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingUsers && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#008779]" />
                        <span>Loading users from database...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                        <div className="font-bold text-slate-700">No users found</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters or search query.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const isPending = user.approval_status === 'Pending';
                      const isRejected = user.approval_status === 'Rejected';
                      const isApproved = user.approval_status === 'Approved';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition">
                          {/* Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                              <span>{user.name}</span>
                              {user.role === 'Admin' && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                          </td>

                          {/* ID No. */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {user.id_number || '—'}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.role === 'Employee'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : user.role === 'Officer'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : user.role === 'Manager'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                              }`}>
                              {user.role}
                            </span>
                          </td>

                          {/* Approval Status */}
                          <td className="py-3.5 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-rose-50 text-rose-800 border border-rose-300">
                                <X className="h-3 w-3 text-rose-600" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </td>

                          {/* Active Toggle State */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${user.is_active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                              }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              <span>{user.is_active ? 'Active' : 'Deactivated'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">

                              {/* If Pending: Approve & Reject buttons */}
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleApproveUser(user.id, user.name)}
                                    title="Approve User Registration"
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectUser(user.id, user.name)}
                                    title="Reject User Registration"
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                              {/* Activate / Deactivate Toggle (for non-admin or approved users) */}
                              {user.role !== 'Admin' && isApproved && (
                                <button
                                  onClick={() => handleToggleActiveUser(user.id, user.name)}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${user.is_active
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                >
                                  {user.is_active ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                  <span>{user.is_active ? 'Deactivate' : 'Activate'}</span>
                                </button>
                              )}

                              {/* View Details Button */}
                              <button
                                onClick={() => setSelectedUserDetail(user)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Details</span>
                              </button>

                              {/* Delete User Button (not for Master Admin) */}
                              {user.email !== 'admin@refinery.safe' && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  title="Delete User Account"
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs transition cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}

                            </div>
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
      )}

      {/* ===================================================================== */}
      {/* ── TAB 3: ROLE MANAGEMENT ─────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">

          {/* Role Cards for the 4 Roles */}
          <div>
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-[#008779]" />
                <span>The Four Platform Roles & Access Control</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Each role accesses its own authorized portal. The System Administrator can assign or change roles for any user.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Role 1: Employee */}
              <div className="bg-white border-2 border-emerald-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                    Frontline
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">1. Employee</h3>
                  <div className="text-[11px] font-bold text-emerald-700 mt-0.5">Worker Safety Portal</div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Reports unsafe acts, conditions, and near-misses with voice notes, photo evidence, and location context. Acknowledges safety directives.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 space-y-1">
                  <div>• Submit observations & voice memos</div>
                  <div>• View personal reports & feedback</div>
                  <div>• Confirm safety directive compliance</div>
                </div>
              </div>

              {/* Role 2: Officer */}
              <div className="bg-white border-2 border-blue-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                    Tactical Lead
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">2. Officer</h3>
                  <div className="text-[11px] font-bold text-blue-700 mt-0.5">Tactical Safety Dashboard</div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  SIF precursor review, field audits, barrier verification, stop-work order issuance, and corrective action assignment to field teams.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 space-y-1">
                  <div>• SIF Precursor review & calibration</div>
                  <div>• Issue Stop-Work authority</div>
                  <div>• Dispatch and track corrective actions</div>
                </div>
              </div>

              {/* Role 3: Manager */}
              <div className="bg-white border-2 border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                    Executive
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">3. Manager</h3>
                  <div className="text-[11px] font-bold text-amber-700 mt-0.5">HSE Command Center</div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Fleet-wide oversight, allotting inspection tasks to safety officers, broadcasting mandatory safety directives, and refinery risk KPIs.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 space-y-1">
                  <div>• Allot inspection tasks to officers</div>
                  <div>• Broadcast urgent safety directives</div>
                  <div>• Strategic SIF precursor intelligence</div>
                </div>
              </div>

              {/* Role 4: Admin */}
              <div className="bg-white border-2 border-purple-200/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                    <SettingsIcon className="h-5 w-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-800">
                    Master Controller
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">4. Admin</h3>
                  <div className="text-[11px] font-bold text-purple-700 mt-0.5">System Admin Console</div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Full master access over all modules, user approval, role assignment, account activation, all reports inspection, and complete audit tracking.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 space-y-1">
                  <div>• Approve / Reject new users</div>
                  <div>• Change user roles dynamically</div>
                  <div>• View complete issue audit histories</div>
                </div>
              </div>

            </div>
          </div>

          {/* User Role Assignment Table */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Assign or Change User Roles</h3>
                <p className="text-xs text-slate-500">
                  Select a user to modify their role. Role changes take effect immediately and are recorded in the audit log.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Work Email</th>
                    <th className="py-3 px-4">ID No.</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4 text-right">Assign New Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-extrabold text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{u.id_number}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${u.role === 'Employee' ? 'bg-emerald-100 text-emerald-800'
                            : u.role === 'Officer' ? 'bg-blue-100 text-blue-800'
                              : u.role === 'Manager' ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role === 'Admin' && u.email === 'admin@refinery.safe' ? (
                          <span className="text-[10px] text-slate-400 italic">Master Seed Admin</span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <select
                              defaultValue={u.role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-[#008779] cursor-pointer"
                            >
                              <option value="Employee">Set to Employee</option>
                              <option value="Officer">Set to Officer</option>
                              <option value="Manager">Set to Manager</option>
                              <option value="Admin">Set to Admin</option>
                            </select>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              title="Delete User"
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ── TAB 4: ALL REPORTS ─────────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">

          {/* Filter Bar for Reports */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-[#008779]" />
                  <span>All Safety Reports & Incident Submissions</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  View and filter all reports submitted by employees. Multi-dimensional filtering by reporter, officer, type, status, and date.
                </p>
              </div>

              <div className="text-xs font-bold text-slate-500">
                Showing <span className="text-slate-900 font-black">{filteredReports.length}</span> of {reports.length} reports
              </div>
            </div>

            {/* 6 Filter Dropdowns + Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">

              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Search code, site, hazard..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800"
                />
              </div>

              {/* Employee Filter */}
              <div>
                <select
                  value={reportEmployeeFilter}
                  onChange={(e) => setReportEmployeeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Employees</option>
                  {uniqueReporters.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Officer Filter */}
              <div>
                <select
                  value={reportOfficerFilter}
                  onChange={(e) => setReportOfficerFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Officers</option>
                  {uniqueOfficers.map(off => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

              {/* Issue Type Filter */}
              <div>
                <select
                  value={reportIssueTypeFilter}
                  onChange={(e) => setReportIssueTypeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Issue Types</option>
                  <option value="Unsafe Condition">Unsafe Condition</option>
                  <option value="Unsafe Act">Unsafe Act</option>
                  <option value="Near Miss">Near Miss</option>
                  <option value="Energy Isolation">Energy Isolation</option>
                  <option value="Working at Height">Working at Height</option>
                  <option value="Confined Space">Confined Space</option>
                  <option value="Line of Fire">Line of Fire</option>
                  <option value="Hot Work">Hot Work</option>
                  <option value="Lifting Operations">Lifting Operations</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Action Dispatched">Action Dispatched</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

            </div>
          </div>

          {/* Batch Selection Action Bar */}
          {selectedReportCodes.size > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
              <div className="flex items-center gap-3 text-xs font-bold text-rose-900">
                <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <CheckSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-sm font-black text-rose-950">{selectedReportCodes.size}</span>
                  <span className="text-rose-800 ml-1">report{selectedReportCodes.size > 1 ? 's' : ''} selected</span>
                </div>
                <span className="text-rose-300">|</span>
                <button
                  onClick={handleToggleSelectAll}
                  className="text-rose-700 hover:text-rose-950 font-bold underline underline-offset-2 cursor-pointer transition text-xs"
                >
                  {isAllVisibleSelected ? 'Deselect All Visible' : `Select All Visible (${filteredReports.length})`}
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg cursor-pointer transition text-xs font-semibold"
                >
                  Clear Selection
                </button>
              </div>

              <button
                onClick={handleBatchDeleteReports}
                disabled={batchDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
                title="Permanently delete all selected reports"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedReportCodes.size})</span>
              </button>
            </div>
          )}

          {/* Reports Table */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    {/* Select All Checkbox Column */}
                    <th className="py-3 pl-4 pr-1 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={handleToggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-[#008779] focus:ring-[#008779] cursor-pointer"
                        title={isAllVisibleSelected ? "Deselect All" : "Select All"}
                      />
                    </th>
                    <th className="py-3 px-4">Report Code & Date</th>
                    <th className="py-3 px-4">Reporter (Employee)</th>
                    <th className="py-3 px-4">Assigned Officer</th>
                    <th className="py-3 px-4">Site & Unit</th>
                    <th className="py-3 px-4">Issue Type / LSR</th>
                    <th className="py-3 px-4">SIF Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingReports ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#008779]" />
                        <span>Loading fleet reports...</span>
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                        <div className="font-bold text-slate-700">No reports matched your filters</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Try resetting filter criteria.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map(report => {
                      const repKey = report.report_code || report.id.toString();
                      const isSelected = selectedReportCodes.has(repKey);
                      return (
                        <tr key={report.id} className={`transition ${isSelected ? 'bg-rose-50/50 hover:bg-rose-50/70' : 'hover:bg-slate-50/70'}`}>

                          {/* Row Selection Checkbox */}
                          <td className="py-3 pl-4 pr-1 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectReport(repKey)}
                              className="h-4 w-4 rounded border-slate-300 text-[#008779] focus:ring-[#008779] cursor-pointer"
                            />
                          </td>

                          {/* Report Code & Date */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 font-mono">{report.report_code}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>

                          {/* Employee (Reporter) */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-800 text-xs">
                              {report.reporter_email.split('@')[0]}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                              {report.reporter_email}
                            </div>
                          </td>

                          {/* Officer */}
                          <td className="py-3 px-4">
                            <span className={`text-xs font-bold ${report.reviewer !== 'Unassigned' ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                              {report.reviewer}
                            </span>
                          </td>

                          {/* Site & Unit */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{report.site}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{report.unit}</div>
                          </td>

                          {/* Issue Type & LSR */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-800">{report.life_saving_rule}</div>
                            <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                              {report.report_type}
                            </span>
                          </td>

                          {/* SIF Score */}
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${report.sif_risk_score >= 8.0 ? 'bg-rose-100 text-rose-800'
                                : report.sif_risk_score >= 6.5 ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                              {report.sif_risk_score}/10 ({report.risk_level})
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {report.status}
                            </span>
                          </td>

                          {/* Actions: View + Delete */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => setSelectedReportDetail(report)}
                                className="px-2.5 py-1.5 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report.id.toString(), report.report_code)}
                                title="Permanently delete report"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
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
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ── TAB 5: AUDIT LOG ───────────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6">

          {/* Audit Toolbar & Issue History Explorer */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-[#008779]" />
                  <span>Comprehensive System Activity & Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Traceable log showing who created the report, who assigned the issue, who accepted it, who updated progress, and who completed or rejected it.
                </p>
              </div>

              <button
                onClick={() => fetchAuditLogs(true)}
                disabled={loadingAudits}
                className="self-start md:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAudits ? 'animate-spin text-[#008779]' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* Filter and Issue Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">

              {/* Search by Issue / Event ID for complete issue history */}
              <div className="relative">
                <Filter className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={auditIssueIdFilter}
                  onChange={(e) => setAuditIssueIdFilter(e.target.value)}
                  placeholder="Filter by Issue / Event ID (e.g. EVT-10101)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              {/* Action Filter */}
              <div>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Audit Activities</option>
                  <option value="Report Created">Report Created (Employee)</option>
                  <option value="Issue Assigned">Issue Assigned (Manager / Officer)</option>
                  <option value="Issue Accepted">Issue Accepted & Verified (Officer)</option>
                  <option value="Progress Updated">Progress Updated</option>
                  <option value="Issue Completed">Issue Completed / Verified</option>
                  <option value="Issue Rejected">Issue Rejected</option>
                  <option value="User Registered">User Registered (Pending)</option>
                  <option value="User Approved">User Approved (Admin)</option>
                  <option value="User Rejected">User Rejected (Admin)</option>
                  <option value="User Role Changed">User Role Changed (Admin)</option>
                  <option value="User Activated">User Activated / Deactivated</option>
                </select>
              </div>

              {/* General Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Search details, actor, email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800"
                />
              </div>

            </div>

            {auditIssueIdFilter && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span>Showing complete historical audit timeline for issue: <strong>{auditIssueIdFilter}</strong></span>
                <button
                  onClick={() => setAuditIssueIdFilter('')}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>

          {/* Audit Logs Chronological Timeline & Table */}
          <div className="bg-white border border-[#E6ECEB] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Role</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Login Time</th>
                    <th className="py-3.5 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingAudits ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#008779]" />
                        <span>Loading audit logs...</span>
                      </td>
                    </tr>
                  ) : filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <History className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                        <div className="font-bold text-slate-700">No audit activity matched filter</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Try clearing filters to see all events.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(audit => {
                      const auditAction = audit.action || '';
                      const isCreation = auditAction.includes('Created');
                      const isAssignment = auditAction.includes('Assigned') || auditAction.includes('Allotment');
                      const isAcceptance = auditAction.includes('Accepted') || auditAction.includes('Verified');
                      const isProgress = auditAction.includes('Progress');
                      const isCompletion = auditAction.includes('Completed') || auditAction.includes('Finished');
                      const isRejection = auditAction.includes('Rejected');
                      const isUserApproval = auditAction.includes('User Approved');

                      const formattedDate = new Date(audit.timestamp).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                      });

                      const loginDisplay = audit.login_time
                        ? new Date(audit.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                      return (
                        <tr key={audit.id} className="hover:bg-slate-50/70 transition border-b border-slate-100">

                          {/* 1. Date */}
                          <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-900 font-bold text-xs">
                            {formattedDate}
                          </td>

                          {/* 2. Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 uppercase shrink-0">
                                {audit.actor_name ? audit.actor_name.charAt(0) : 'U'}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">{audit.actor_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{audit.user_email || '—'}</div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Role */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${(audit.actor_role || '').includes('Admin')
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : (audit.actor_role || '').includes('Manager')
                                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                  : (audit.actor_role || '').includes('Officer')
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                              {audit.actor_role || '—'}
                            </span>
                          </td>

                          {/* 4. Login Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                              <LogIn className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>{loginDisplay}</span>
                            </div>
                          </td>

                          {/* 5. Action (with View Button to open popup modal) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isCreation ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isAssignment ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : isAcceptance ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : isProgress ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : isCompletion ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                            : isRejection ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                              : isUserApproval ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                  {audit.action}
                                </span>

                                {audit.event_id && audit.event_id !== 'GENERAL' && (
                                  <span className="font-mono text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                    {audit.event_id}
                                  </span>
                                )}
                              </div>

                              {/* View Button */}
                              <button
                                onClick={() => setSelectedAuditDetail(audit)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
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
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ── MODAL: USER DETAILS ────────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center font-bold text-lg">
                  {selectedUserDetail.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedUserDetail.name}</h3>
                  <div className="text-xs text-slate-500 font-mono">{selectedUserDetail.email}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">ID Number</div>
                <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{selectedUserDetail.id_number}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Platform Role</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedUserDetail.role}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Phone Number</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedUserDetail.phone || '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Approval Status</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedUserDetail.approval_status}</div>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Address / Location</div>
                <div className="text-sm font-medium text-slate-900 mt-0.5">{selectedUserDetail.address || 'Refinery Complex, Operational Fleet'}</div>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Registration Date</div>
                <div className="text-xs font-mono text-slate-700 mt-0.5">
                  {new Date(selectedUserDetail.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Actions from Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              {selectedUserDetail.email !== 'admin@refinery.safe' && (
                <button
                  onClick={() => {
                    const uId = selectedUserDetail.id;
                    const uName = selectedUserDetail.name;
                    setSelectedUserDetail(null);
                    handleDeleteUser(uId, uName);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  title="Permanently delete user account"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete User</span>
                </button>
              )}
              {selectedUserDetail.approval_status === 'Pending' && (
                <div className="flex gap-2 flex-1 justify-end">
                  <button
                    onClick={() => {
                      handleApproveUser(selectedUserDetail.id, selectedUserDetail.name);
                      setSelectedUserDetail(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve Registration</span>
                  </button>
                  <button
                    onClick={() => {
                      handleRejectUser(selectedUserDetail.id, selectedUserDetail.name);
                      setSelectedUserDetail(null);
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ── MODAL: REPORT COMPLETE DETAILS ─────────────────────────────────── */}
      {/* ===================================================================== */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#008779] bg-[#E8F6F4] px-2 py-0.5 rounded">
                    {selectedReportDetail.report_code}
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase">
                    {selectedReportDetail.report_type}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedReportDetail.life_saving_rule}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Attached Photo Evidence */}
            {selectedReportDetail.photo_url && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase text-[#008779] flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-[#008779]" />
                  <span>Uploaded Photo Evidence (Cloudinary)</span>
                </div>
                <a href={selectedReportDetail.photo_url} target="_blank" rel="noreferrer" className="inline-block group">
                  <img
                    src={selectedReportDetail.photo_url}
                    alt="Report snapshot"
                    className="h-32 max-w-full rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:opacity-90 transition"
                  />
                  <span className="text-[10px] text-[#008779] font-bold mt-1 block group-hover:underline">Open Original Photo ↗</span>
                </a>
              </div>
            )}

            {/* Narrative */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">Report Narrative</div>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {selectedReportDetail.description}
              </p>
            </div>

            {/* Multi-Factor Scoring */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                <div className="text-[9.5px] font-extrabold text-amber-800 uppercase">SIF Score</div>
                <div className="text-lg font-black text-amber-900 mt-0.5">{selectedReportDetail.sif_risk_score} / 10</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs">
                <div className="text-[9.5px] font-extrabold text-blue-800 uppercase">Risk Level</div>
                <div className="text-lg font-black text-blue-900 mt-0.5">{selectedReportDetail.risk_level}</div>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs">
                <div className="text-[9.5px] font-extrabold text-purple-800 uppercase">Precursor</div>
                <div className="text-lg font-black text-purple-900 mt-0.5">{selectedReportDetail.is_sif_precursor}</div>
              </div>
            </div>

            {/* Location & Personnel */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Site & Unit</span>
                <span className="font-bold text-slate-900">{selectedReportDetail.site} — {selectedReportDetail.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Location Context</span>
                <span className="font-bold text-slate-900">{selectedReportDetail.location}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Reporter (Employee)</span>
                <span className="font-mono text-slate-800">{selectedReportDetail.reporter_email}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Reviewer / Officer</span>
                <span className="font-bold text-slate-800">{selectedReportDetail.reviewer}</span>
              </div>
            </div>

            {/* Quick Filter in Audit & Delete Option */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  const idToDel = selectedReportDetail.id.toString();
                  const codeToDel = selectedReportDetail.report_code;
                  setSelectedReportDetail(null);
                  handleDeleteReport(idToDel, codeToDel);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Permanently delete this report"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Report</span>
              </button>

              <button
                onClick={() => {
                  setAuditIssueIdFilter(selectedReportDetail.id);
                  setActiveTab('audit');
                  setSelectedReportDetail(null);
                }}
                className="px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <History className="h-3.5 w-3.5" />
                <span>View Complete Issue History in Audit Log →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ── MODAL: AUDIT LOG DETAIL ────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {selectedAuditDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#E8F6F4] text-[#008779] flex items-center justify-center font-bold">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Audit Action Details</h3>
                  <p className="text-xs text-slate-400 font-medium font-mono">
                    Activity Record #{selectedAuditDetail.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditDetail(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-xs">

              {/* Action Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                    Activity Type
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedAuditDetail.action}
                  </span>
                </div>
                {selectedAuditDetail.event_id && selectedAuditDetail.event_id !== 'GENERAL' && (
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                    {selectedAuditDetail.event_id}
                  </span>
                )}
              </div>

              {/* Grid: Actor, Role, Date, Login Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                    Actor Name
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs block">
                    {selectedAuditDetail.actor_name}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    {selectedAuditDetail.user_email || '—'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                    Role
                  </span>
                  <span className="font-extrabold text-teal-700 text-xs uppercase block">
                    {selectedAuditDetail.actor_role}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                    Date & Timestamp
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs block">
                    {new Date(selectedAuditDetail.timestamp).toLocaleDateString()} {new Date(selectedAuditDetail.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                    Login Time
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-xs flex items-center gap-1">
                    <LogIn className="h-3 w-3" />
                    {selectedAuditDetail.login_time
                      ? new Date(selectedAuditDetail.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : new Date(selectedAuditDetail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* What They Did / Full Action Details Narrative */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1.5">
                <span className="text-[10.5px] font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-700" />
                  What They Have Done (Action Narrative)
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedAuditDetail.details}
                </p>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {selectedAuditDetail.event_id && selectedAuditDetail.event_id !== 'GENERAL' && (
                <button
                  onClick={() => {
                    setAuditIssueIdFilter(selectedAuditDetail.event_id);
                    setSelectedAuditDetail(null);
                  }}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Filter Timeline for {selectedAuditDetail.event_id}
                </button>
              )}
              <button
                onClick={() => setSelectedAuditDetail(null)}
                className="ml-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
