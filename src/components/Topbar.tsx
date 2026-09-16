import React, { useState } from 'react';
import { User } from '../types';
import { 
  Bell, 
  LogOut, 
  ShieldAlert, 
  Search, 
  Mail, 
  Menu,
  ChevronDown, 
  Sparkles,
  User as UserIcon
} from 'lucide-react';

interface TopbarProps {
  user: User | null;
  onLogout: () => void;
  title: string;
  notifications: string[];
  clearNotifications: () => void;
  onSwitchPersona?: (email: string) => void;
  onSearch?: (term: string) => void;
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  user, 
  onLogout, 
  title, 
  notifications, 
  clearNotifications,
  onSwitchPersona,
  onSearch,
  onOpenMobileMenu
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <header className="h-16 bg-[#F7F9FC]/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 lg:px-8 fixed top-0 right-0 left-0 md:left-64 z-20 border-b border-[#E6ECEB]/80 shadow-2xs">
      
      {/* Left section: Mobile Hamburger + Pill Search Bar */}
      <div className="flex items-center gap-2 flex-1 max-w-sm">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-[#008779] hover:bg-white border border-[#E6ECEB] shadow-2xs transition cursor-pointer shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        {/* Pill Search Bar */}
        <div className="relative w-full max-w-[140px] sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder="Search events, rules..."
            className="w-full bg-white border border-[#E6ECEB] rounded-full pl-9 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* Right Action Icons & User Pill */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Verified User Account Pill (Desktop/Tablet) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6ECEB] rounded-full text-xs text-slate-700 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-[#008779]"></span>
          <span className="text-slate-600 font-medium">Employee</span>
          <span className="font-extrabold text-slate-900">{user?.id_number || 'EMP002'}</span>
        </div>

        {/* Circular Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white border border-[#E6ECEB] flex items-center justify-center text-slate-600 hover:text-[#008779] hover:border-[#008779]/40 transition shadow-2xs relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-[#FF7A1A] border-2 border-white rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white border border-[#E6ECEB] rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-[#E8F6F4]/50">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Alerts Queue</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-[10px] text-[#008779] font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div key={idx} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-2.5 items-start">
                      <ShieldAlert className="h-4 w-4 text-[#FF7A1A] mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 leading-normal">{notif}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Circular Mail Icon */}
        <div className="hidden sm:flex h-10 w-10 rounded-xl bg-white border border-[#E6ECEB] items-center justify-center text-slate-600 hover:text-[#008779] hover:border-[#008779]/40 transition shadow-2xs cursor-pointer">
          <Mail className="h-4.5 w-4.5" />
        </div>

        {/* User Profile Pill */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-2.5 bg-white border border-[#E6ECEB] rounded-full py-1 sm:py-1.5 pl-1.5 sm:pl-2 pr-2.5 sm:pr-3 shadow-2xs">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-[#008779] text-white font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-black text-slate-900 leading-tight truncate max-w-[100px]">{user.name}</div>
              <div className="text-[10px] font-medium text-slate-400 truncate max-w-[100px]">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="text-slate-400 hover:text-[#008779] transition cursor-pointer p-0.5"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
