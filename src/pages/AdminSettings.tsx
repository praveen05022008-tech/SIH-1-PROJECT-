import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../config/api';
import {
  Settings,
  Database,
  Cloud,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Activity,
  Server,
  Clock,
  Info,
} from 'lucide-react';

interface ServiceInfo {
  status: 'live' | 'error' | 'checking';
  latency_ms: number | null;
  message: string;
  // TiDB
  host?: string;
  // Cloudinary
  cloud_name?: string;
  // HuggingFace
  username?: string;
}

interface StatusResponse {
  overall: 'live' | 'degraded';
  checked_at: string;
  services: {
    tidb: ServiceInfo;
    cloudinary: ServiceInfo;
    huggingface: ServiceInfo;
  };
}

const SERVICE_CONFIG = [
  {
    key: 'tidb' as const,
    name: 'TiDB Cloud',
    subtitle: 'Distributed SQL Database',
    icon: Database,
    color: '#E64032',
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    detail: (s: ServiceInfo) => s.host || 'gateway.tidbcloud.com',
    detailLabel: 'Host'
  },
  {
    key: 'cloudinary' as const,
    name: 'Cloudinary',
    subtitle: 'Media & Image Cloud Storage',
    icon: Cloud,
    color: '#3448C5',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    detail: (s: ServiceInfo) => s.cloud_name || '—',
    detailLabel: 'Cloud Name'
  },
  {
    key: 'huggingface' as const,
    name: 'Hugging Face',
    subtitle: 'AI / ML Model Inference',
    icon: Cpu,
    color: '#FF9D00',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    detail: (s: ServiceInfo) => s.username || '—',
    detailLabel: 'Account'
  }
];

interface AdminSettingsProps {
  onResetDb?: () => void;
  triggerNotification?: (msg: string) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  onResetDb,
  triggerNotification
}) => {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/admin/service-status'));
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch service status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResetDb = async () => {
    if (!window.confirm('This will purge the current database and re-seed all standard safety reports. Are you sure?')) {
      return;
    }
    setResettingDb(true);
    try {
      const res = await fetch(apiUrl('/api/seed/reset'), { method: 'POST' });
      if (!res.ok) throw new Error();
      triggerNotification?.('Database reset and re-seeded successfully.');
      onResetDb?.();
      fetchStatus();
    } catch (err) {
      console.warn('DB reset notice:', err);
      triggerNotification?.('Database reset triggered.');
      onResetDb?.();
    } finally {
      setResettingDb(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const overallLive = status?.overall === 'live';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans antialiased">

      {/* ── 1. MASTER HEADER & TOP-LEVEL NAVIGATION ────────────────────────── */}
      <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Master Administrator
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                ● Live Fleet Control
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Admin Master Management Center</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Centralized authority for user onboarding approvals, role governance, fleet reporting intelligence, and audit traceability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStatus();
                triggerNotification?.('Admin: Synchronized all service diagnostics.');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync All</span>
            </button>
            <button
              onClick={handleResetDb}
              disabled={resettingDb}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-60"
            >
              <span>{resettingDb ? 'Resetting...' : 'Reset Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#008779]/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-[#008779]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">System Settings</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Live connectivity diagnostics for all integrated services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
            </button>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008779] hover:bg-[#007064] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Checking...' : 'Refresh Now'}</span>
            </button>
          </div>
        </div>

        {/* Overall status banner */}
        {status && (
          <div className={`mt-5 flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${
            overallLive
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}>
            {overallLive
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            }
            <div className="flex-1">
              <span className={`text-sm font-black ${overallLive ? 'text-emerald-800' : 'text-rose-800'}`}>
                {overallLive ? 'All Systems Operational' : 'One or More Services Degraded'}
              </span>
              <p className={`text-xs font-medium mt-0.5 ${overallLive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {overallLive
                  ? 'TiDB, Cloudinary, and Hugging Face are all live and reachable.'
                  : 'Check individual service cards below for details.'}
              </p>
            </div>
            {lastRefreshed && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>Last checked</span>
                </div>
                <div className="text-[11px] font-black text-slate-600">
                  {lastRefreshed.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        )}

        {!status && !loading && (
          <div className="mt-5 flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium">
            <Info className="h-4 w-4 shrink-0" />
            <span>Click <strong>Refresh Now</strong> to check service connectivity.</span>
          </div>
        )}

        {loading && !status && (
          <div className="mt-5 flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
            <span>Pinging all services... this may take a few seconds.</span>
          </div>
        )}
      </div>

      {/* Service Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Server className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            Connected Services — Live Diagnostics
          </span>
        </div>

        {SERVICE_CONFIG.map(cfg => {
          const Icon = cfg.icon;
          const svc: ServiceInfo | undefined = status?.services?.[cfg.key];
          const isLive = svc?.status === 'live';
          const isError = svc?.status === 'error';
          const isUnknown = !svc;

          return (
            <div
              key={cfg.key}
              className="bg-white border border-[#E6ECEB] rounded-3xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                {/* Left: icon + name */}
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-6 w-6 ${cfg.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{cfg.name}</h2>
                      {/* Live/Error pill */}
                      {loading ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          Checking
                        </span>
                      ) : isLive ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          LIVE
                        </span>
                      ) : isError ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          <WifiOff className="h-2.5 w-2.5" />
                          ERROR
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                          NOT CHECKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{cfg.subtitle}</p>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-2 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
        <span>
          Service checks are performed live on the platform system.
          Auto-refresh pings every <strong className="text-slate-700">30 seconds</strong> when enabled.
        </span>
      </div>
    </div>
  );
};
