import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  FileCheck2,
  Network,
  MapPin,
  ClipboardCheck,
  GraduationCap,
  FileBarChart2,
  Settings as SettingsIcon,
  Cpu,
  FileText,
  Zap,
  Activity,
  LogOut,
  Sparkles,
  Users,
  Clock,
  X,
  Shield,
  History,
  BarChart3,
  CheckSquare,
  Bell,
  BookOpen,
  HelpCircle,
  Search,
  UserCheck
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  systemStatus: {
    aiEngine: string;
    gati: string;
    data: string;
  };
  userRole?: string;
  user?: User | null;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  systemStatus,
  userRole,
  user,
  onLogout,
  isOpen = false,
  onClose
}) => {
  const isEmployee = userRole === 'Employee' || userRole === 'Field Worker';

  const getMenuItems = (): MenuItem[] => {
    switch (userRole) {
      case 'Employee':
      case 'Field Worker':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'my-report', label: 'My reports', icon: FileText },
          { id: 'report-issue', label: 'Submit report', icon: CheckSquare },
          { id: 'ai-analysis', label: 'AI analysis', icon: Cpu, badge: 'New', badgeColor: 'bg-[#008779] text-white' }
        ];

      case 'Officer':
      case 'Safety Officer':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'assigned-reports', label: 'Assigned Reports', icon: ClipboardCheck },
          { id: 're-check', label: 'Re-Check', icon: CheckSquare },
          { id: 'investigate', label: 'Investigate', icon: Search },
          { id: 'sif', label: 'SIF Risk', icon: ShieldAlert },
          { id: 'ai-analysis', label: 'AI Analysis', icon: Cpu }
        ];
      case 'Manager':
      case 'Safety Manager':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'assign-officer', label: 'Assign Officer', icon: UserCheck },
          { id: 're-check', label: 'Re-Check', icon: CheckSquare, badge: 'QUEUE', badgeColor: 'bg-emerald-100 text-emerald-800' },
          { id: 'sif-risk', label: 'SIF Risk (AI)', icon: ShieldAlert, badge: 'CEREBRAS', badgeColor: 'bg-orange-100 text-orange-700' },
          { id: 'manager-analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'manager-alerts', label: 'Alerts', icon: Bell },
          { id: 'reports', label: 'Reports', icon: FileBarChart2 }
        ];
      case 'Admin':
        return [
          { id: 'settings', label: 'Dashboard', icon: BarChart3 },
          { id: 'admin-requests', label: 'Admin Requests', icon: Clock },
          { id: 'admin-users', label: 'User Directory', icon: Users },
          { id: 'admin-roles', label: 'Role Governance', icon: Shield },
          { id: 'admin-reports', label: 'All Reports', icon: FileText },
          { id: 'admin-audit', label: 'Audit Log', icon: History },
          { id: 'admin-settings', label: 'Settings', icon: SettingsIcon }
        ];
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inbox', label: 'Safety Alerts', icon: Inbox },
          { id: 'sif', label: 'SIF Intelligence', icon: ShieldAlert },
          { id: 'lsr', label: 'Life-Saving Rules', icon: FileCheck2 },
          { id: 'precursors', label: 'Precursors', icon: Network },
          { id: 'sites', label: 'Sites & Units', icon: MapPin },
          { id: 'my-report', label: 'Worker Portal', icon: Users },
          { id: 'learning', label: 'Precursor Intelligence', icon: GraduationCap }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`w-64 bg-white text-slate-800 flex flex-col h-screen fixed left-0 top-0 border-r border-[#E6ECEB] z-40 font-sans shadow-xl md:shadow-xs transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        {/* Brand Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#005B54] via-[#008779] to-[#00A389] text-white shadow-xs flex items-center justify-center">
              <Shield className="h-5 w-5 fill-white/20" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                RAKSHA
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Safety Intelligence
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 text-left cursor-pointer ${isActive
                    ? 'bg-[#E8F6F4] text-[#008779] font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-[#008779]' : 'text-slate-400'
                    }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-[#008779] text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose?.();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all text-left mt-2 cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400" />
              <span>Logout</span>
            </button>
          )}
        </nav>

        {/* Bottom Section: User Card */}
        <div className="p-3 border-t border-slate-100">

          {/* User Profile Card */}
          <div className="p-2.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-[#008779] text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {user?.name ? user.name.charAt(0) : 'S'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">
                  {user?.name || 'Srinith'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  Field Operator, Duliajan ...
                </div>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mr-1" title="Online"></span>
          </div>

        </div>
      </aside>
    </>
  );
};
