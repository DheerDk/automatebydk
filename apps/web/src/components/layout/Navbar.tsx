import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  Bell,
  Search,
  Building2,
  ChevronDown,
  LogOut,
  Radio,
  CheckCircle2,
  AlertCircle,
  Menu,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onMenuToggle?: () => void;
  onOpenSimulator?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, onOpenSimulator }) => {
  const { user, organizations, currentOrganization, switchOrganization, logout } = useAuth();
  const { isWhatsAppConnected, whatsappAccount } = useTenant();
  const { notifications, unreadCount, clearAll } = useNotification();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Menu + Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products, customers, leads, or orders..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Right: Actions, WhatsApp Status, Simulator trigger, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* WhatsApp Test Simulator Trigger */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>WhatsApp Simulator</span>
        </button>

        {/* WhatsApp Connection Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 border-slate-200">
          <span className={`w-2 h-2 rounded-full ${isWhatsAppConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-700">
            {isWhatsAppConnected ? 'WhatsApp Connected' : 'Demo Simulator Mode'}
          </span>
        </div>

        {/* Business Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="max-w-[120px] truncate">{currentOrganization?.name || 'Select Store'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isOrgDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Switch Business
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOrgDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${
                    currentOrganization?.id === org.id ? 'text-emerald-600 font-semibold bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {currentOrganization?.id === org.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {isNotifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase">Live Activity</span>
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-600">
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-500 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100"
          >
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=10b981&color=fff`}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
            />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {user?.role}
                </span>
              </div>
              <div className="py-1 border-b border-slate-100">
                <a
                  href="/dashboard/profile"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  My Profile
                </a>
                <a
                  href="/dashboard/security"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Security &amp; Device Sessions
                </a>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 mt-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
              <div className="px-4 py-1.5 mt-1 border-t border-slate-100 bg-emerald-50/50 rounded-b-xl">
                <p className="text-[10px] text-emerald-800 font-medium flex items-center gap-1.5 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  Automations &amp; WhatsApp stay active 24/7 after logout
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
