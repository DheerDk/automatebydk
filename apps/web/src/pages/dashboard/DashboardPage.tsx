import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppSimulatorModal } from '../../components/simulator/WhatsAppSimulatorModal';
import {
  Users,
  Target,
  MessageSquare,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  Power,
  Play,
  Pause,
  Smartphone,
  ShieldCheck,
  Send,
  Plus,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  ExternalLink,
  Flame,
  Check,
  QrCode,
  CreditCard,
  Settings,
  HelpCircle,
  Activity,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { currency } = useTenant();
  const { user, currentOrganization } = useAuth();

  const [data, setData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Live WhatsApp & Automation states
  const [automations, setAutomations] = useState<any[]>([]);
  const [isTogglingMaster, setIsTogglingMaster] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>('CONNECTING');
  const [qrPhone, setQrPhone] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res: any = await api.get(`/analytics/dashboard?timeframe=${timeframe}`);
      const payload = res?.data || res;
      if (payload) {
        setData(payload);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  const fetchAutomations = async () => {
    try {
      const res: any = await api.get('/automations');
      const list = res?.data || res || [];
      setAutomations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    }
  };

  const fetchQrStatus = async () => {
    try {
      const res: any = await api.get('/whatsapp/qr/status');
      const payload = res?.data || res;
      if (payload) {
        setQrStatus(payload.status || 'DISCONNECTED');
        setQrPhone(payload.phone || null);
      }
    } catch {
      setQrStatus('DISCONNECTED');
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    await Promise.all([fetchStats(), fetchAutomations(), fetchQrStatus()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  // Master Automation ON/OFF Toggle
  const activeCount = automations.filter((a) => a.isActive).length;
  const isAllActive = automations.length > 0 && activeCount === automations.length;
  const isMasterOn = activeCount > 0;

  const handleMasterToggle = async () => {
    const targetState = !isMasterOn;
    setIsTogglingMaster(true);
    try {
      await api.post('/automations/toggle-all', { isActive: targetState });
      setAutomations((prev) => prev.map((a) => ({ ...a, isActive: targetState })));
      showToast(targetState ? 'All WhatsApp Automations Activated (24/7)' : 'All Automations Paused');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to toggle automations');
    } finally {
      setIsTogglingMaster(false);
    }
  };

  // 1-Click Single Rule ON/OFF Toggle
  const handleToggleRule = async (ruleId: string) => {
    setTogglingRuleId(ruleId);
    try {
      const res: any = await api.patch(`/automations/${ruleId}/toggle`);
      const updated = res?.data || res;
      setAutomations((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: updated.isActive } : r))
      );
      showToast(`Rule "${updated.name || 'Automation'}" is now ${updated.isActive ? 'ACTIVE' : 'PAUSED'}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to toggle rule');
    } finally {
      setTogglingRuleId(null);
    }
  };

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  if (isLoading && !data) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading AutoMate 24/7 Dashboard...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const timeline = data?.timeline || [];
  const funnel = data?.funnel || [];
  const topProducts = data?.topProducts || [];
  const recentLeads = data?.recentLeads || [];
  const recentConversations = data?.recentConversations || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {actionSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Header & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            Live Store Operations Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Store Owner'} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics, 24/7 background WhatsApp engine, and active automations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Live Simulator Button */}
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Test Simulator</span>
          </button>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {(['7d', '30d', '90d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeframe === tf
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MASTER 24/7 CLOUD AUTOMATION & WHATSAPP CONTROL PANEL */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Master Toggle Control */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isMasterOn ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isMasterOn ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                {isMasterOn ? '24/7 Cloud Background Engine: ACTIVE' : 'Automations Paused'}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Persistent on Logout
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Master Automation Control
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Turn all WhatsApp auto-replies, keyword flows, and AI responses ON or OFF instantly. Active automations run <strong>24/7 non-stop in the cloud</strong> even when logged out.
              </p>
            </div>

            {/* Master Button Action */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleMasterToggle}
                disabled={isTogglingMaster || automations.length === 0}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2.5 shadow-lg transition-all disabled:opacity-50 ${
                  isMasterOn
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>
                  {isTogglingMaster
                    ? 'Updating...'
                    : isMasterOn
                    ? 'Pause All Automations'
                    : 'Turn ON All Automations'}
                </span>
              </button>

              <Link
                to="/dashboard/automations"
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-2xl flex items-center gap-2 transition"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Manage Flows ({automations.length})</span>
              </Link>
            </div>
          </div>

          {/* Right: Real-time Status Badges & WhatsApp Connection */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-slate-400">WhatsApp Device Link:</span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  qrStatus === 'CONNECTED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    qrStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {qrStatus === 'CONNECTED' ? 'Linked & Live' : 'Needs Scan'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">
                  {qrPhone ? qrPhone : 'Multi-Device QR Session'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {qrStatus === 'CONNECTED' ? 'Receiving & replying 24/7' : 'Scan QR code to link'}
                </p>
              </div>

              <Link
                to="/dashboard/settings?tab=whatsapp"
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{qrStatus === 'CONNECTED' ? 'View Setup' : 'Connect QR'}</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Active Rules: <strong className="text-white">{activeCount} / {automations.length}</strong>
              </span>
              <span className="text-emerald-400 font-medium">Cloud Daemon: Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK LAUNCH ACTION SHORTCUTS (6 ESSENTIAL FEATURES) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Quick Launch Actions
          </h2>
          <span className="text-xs text-slate-400 font-medium">1-Click Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Flow Builder */}
          <Link
            to="/dashboard/automations"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-start justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Visual Flows
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Build bot branching</p>
            </div>
          </Link>

          {/* Action 2: WhatsApp Live Inbox */}
          <Link
            to="/dashboard/inbox"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-start justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Live Inbox
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Chat with leads</p>
            </div>
          </Link>

          {/* Action 3: Broadcast Campaigns */}
          <Link
            to="/dashboard/campaigns"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-start justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Campaigns
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Broadcast flyers</p>
            </div>
          </Link>

          {/* Action 4: Product Catalog */}
          <Link
            to="/dashboard/products"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-start justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Catalog
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Manage products</p>
            </div>
          </Link>

          {/* Action 5: AI Training */}
          <Link
            to="/dashboard/ai"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-teal-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-start justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                AI Assistant
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Store knowledge</p>
            </div>
          </Link>

          {/* Action 6: Billing & Plan */}
          <Link
            to="/dashboard/billing"
            className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-rose-300 shadow-2xs hover:shadow-md transition-all flex flex-col items-start justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                Billing &amp; Plan
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Invoices &amp; Razorpay</p>
            </div>
          </Link>
        </div>
      </div>

      {/* QUICK ON/OFF AUTOMATION FLOWS WIDGET */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Active Automations Quick Switches
            </h2>
            <p className="text-xs text-slate-500">
              Toggle specific flows ON or OFF directly from the dashboard without opening settings.
            </p>
          </div>
          <Link
            to="/dashboard/automations"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {automations.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
            <Zap className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              You don't have any custom automations yet. Create your first flow with 1-click industry recipes!
            </p>
            <Link
              to="/dashboard/automations"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Automation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {automations.slice(0, 4).map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  rule.isActive
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      {rule.trigger}
                    </span>
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      disabled={togglingRuleId === rule.id}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        rule.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={rule.isActive ? 'Turn OFF' : 'Turn ON'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          rule.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{rule.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {rule.description || `Auto-triggers on matching message`}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600">
                    Status:{' '}
                    <strong className={rule.isActive ? 'text-emerald-700' : 'text-slate-500'}>
                      {rule.isActive ? 'RUNNING 24/7' : 'PAUSED'}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    {rule.actions?.length || 1} action(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Customers</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalCustomers || 0}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +{metrics.newCustomers || 0} new
            </span>
          </div>
        </div>

        {/* Total Leads Captured */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Leads</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalLeads || 0}</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              +{metrics.newLeads || 0} new
            </span>
          </div>
        </div>

        {/* Converted Pipeline Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Converted Value</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">
              {currency} {(metrics.revenue || 0).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              ({metrics.convertedLeads || 0} deals)
            </span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lead Conversion Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.conversionRate || 0}%</span>
            <span className="text-xs font-medium text-slate-400">of captured enquiries</span>
          </div>
        </div>
      </div>

      {/* CHARTS ROW: MESSAGES TIMELINE & LEADS FUNNEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Message Volume Timeline */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">WhatsApp Message Traffic</h3>
              <p className="text-xs text-slate-400">Inbound customer chats vs AI/agent outgoing replies</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-medium">Inbound ({metrics.inboundMessages || 0})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 font-medium">Outbound ({metrics.outboundMessages || 0})</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutbound)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Lead Conversion Funnel */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Lead Conversion Funnel</h3>
            <p className="text-xs text-slate-400">Drop-off stages from enquiry to sale</p>
          </div>

          <div className="space-y-3 pt-2">
            {funnel.map((stage: any, idx: number) => {
              const maxCount = Math.max(...funnel.map((s: any) => s.count), 1);
              const percentage = Math.round((stage.count / maxCount) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{stage.stage}</span>
                    <span className="text-slate-900 font-bold">{stage.count} leads</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percentage, 6)}%`,
                        backgroundColor: stage.fill || '#10b981',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* REAL-TIME STREAMS ROW: RECENT CONVERSATIONS & HOT LEADS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent WhatsApp Conversations Stream */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Live Customer Chats
              </h3>
              <p className="text-xs text-slate-400">Incoming WhatsApp customer conversations</p>
            </div>
            <Link
              to="/dashboard/inbox"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Inbox</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentConversations.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No recent conversations yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentConversations.map((conv: any) => (
                <Link
                  key={conv.id}
                  to={`/dashboard/inbox`}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                      {conv.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{conv.customerName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{conv.customerPhone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {conv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Captured Leads Pipeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                Captured Leads Pipeline
              </h3>
              <p className="text-xs text-slate-400">Automatic leads generated from WhatsApp</p>
            </div>
            <Link
              to="/dashboard/leads"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>Pipeline</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No leads captured yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLeads.map((lead: any) => (
                <div
                  key={lead.id}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{lead.title || 'WhatsApp Enquiry'}</p>
                      <p className="text-[11px] text-slate-400">{lead.customerName} ({lead.customerPhone})</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {currency} {(lead.estimatedValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TOP ENQUIRED CATALOG PRODUCTS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top Enquired Catalog Products</h3>
            <p className="text-xs text-slate-400">Most requested products by WhatsApp customers</p>
          </div>
          <Link
            to="/dashboard/products"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View Full Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {topProducts.map((prod: any) => (
            <div
              key={prod.id}
              className="group p-3 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col justify-between"
            >
              <div>
                <img
                  src={prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'}
                  alt={prod.name}
                  className="w-full h-28 object-cover rounded-lg mb-2 group-hover:scale-[1.02] transition-transform"
                />
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                  {prod.category}
                </span>
                <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{prod.name}</h4>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                  {currency}{' '}
                  {prod.discountPrice ? prod.discountPrice.toLocaleString() : prod.price.toLocaleString()}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Enquiries</span>
                <span className="font-bold text-emerald-600">{prod.enquiryCount} times</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Simulator Modal */}
      <WhatsAppSimulatorModal isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />
    </div>
  );
};
