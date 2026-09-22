import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  Package,
  Users,
  Bot,
  Zap,
  Send,
  FileText,
  BarChart3,
  QrCode,
  Settings,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, currentOrganization } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'WhatsApp Inbox', icon: MessageSquare, path: '/dashboard/inbox' },
    { label: 'Leads Pipeline', icon: Kanban, path: '/dashboard/leads' },
    { label: 'Product Catalog', icon: Package, path: '/dashboard/products' },
    { label: 'Customer CRM', icon: Users, path: '/dashboard/customers' },
    { label: 'Automations', icon: Zap, path: '/dashboard/automations' },
    { label: 'Campaigns', icon: Send, path: '/dashboard/campaigns' },
    { label: 'Templates', icon: FileText, path: '/dashboard/templates' },
    { label: 'AI Assistant', icon: Bot, path: '/dashboard/ai' },
    { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    { label: 'WhatsApp Setup', icon: QrCode, path: '/dashboard/settings?tab=whatsapp' },
    { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="AutoMate by DK" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <div>
              <span className="text-base font-bold text-white tracking-tight">AutoMate</span>
              <span className="text-xs font-semibold text-emerald-400 ml-1">by DK</span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Store Automation
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isSuperAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </div>
              <NavLink
                to="/super-admin"
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Platform Admin</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Footer Plan badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <NavLink
            to="/dashboard/settings?tab=billing"
            onClick={() => onClose()}
            className="block hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Subscription</span>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {currentOrganization?.subscription?.planTier || 'GROWTH'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Status: {currentOrganization?.status || 'ACTIVE'}</span>
              <span className="text-emerald-400 font-semibold underline text-[10px]">Manage</span>
            </p>
          </NavLink>
        </div>
      </aside>
    </>
  );
};
