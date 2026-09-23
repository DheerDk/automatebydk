import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  ShieldCheck,
  Calendar,
  CreditCard,
  Zap,
  Globe,
  Lock,
  Download,
  KeyRound,
  ExternalLink,
  Bot,
  MessageSquare,
  Sparkles,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '../../components/common/ImageUploader';

export const ProfilePage: React.FC = () => {
  const { user, currentOrganization, updateProfile, refreshUserData } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'integrations' | 'billing'>('profile');

  // Profile Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Billing & Subscriptions
  const [subData, setSubData] = useState<any>(null);
  const [viewInvoice, setViewInvoice] = useState<any>(null);

  // Status message
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const loadSubscriptionInfo = async () => {
    try {
      const res: any = await api.get('/subscription');
      const payload = res?.data || res;
      if (payload) setSubData(payload);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  };

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      await refreshUserData();
      setMsg({ type: 'success', text: 'Personal profile updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to save profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    try {
      await api.post('/auth/password/change', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsg({ type: 'success', text: 'Password changed successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to change password.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Profile Header Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={
                  avatarUrl ||
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={name || user?.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/20"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white">{user?.name || 'Store Owner'}</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider rounded-full">
                  {user?.role || 'BUSINESS_OWNER'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
              <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Workspace: <strong className="text-white">{currentOrganization?.name || 'AutoMate Store'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/dashboard/billing"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Manage Subscription ({subData?.planTier || 'STARTER'})
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto text-xs">
          {[
            { key: 'profile', label: 'Personal & Business Profile', icon: UserIcon },
            { key: 'integrations', label: 'Live Gateway & Integrations', icon: Zap },
            { key: 'billing', label: 'Subscription & Invoices', icon: CreditCard },
            { key: 'security', label: 'Password & Security', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Banner */}
      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-3 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span className="font-semibold">{msg.text}</span>
        </div>
      )}

      {/* TAB 1: PERSONAL & BUSINESS PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Info Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
                <p className="text-xs text-slate-500">Your profile details across all workspaces.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <ImageUploader
                value={avatarUrl}
                onChange={setAvatarUrl}
                label="Profile Picture / Avatar"
                description="Upload an avatar photo from your device or paste a URL (Max 5MB • JPG, PNG, WEBP)."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:border-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role & Permissions
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role || 'BUSINESS_OWNER'}
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Business Workspace Details Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Information</h3>
                <p className="text-[11px] text-slate-500">Live store profile and domain.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Store Name</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{currentOrganization?.name || 'AutoMate Store'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Store Slug</span>
                <span className="font-mono text-slate-900 dark:text-white mt-0.5 block">@{currentOrganization?.slug || 'store'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Status</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified & Active Workspace
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE GATEWAY & INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Razorpay Gateway */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-black">
                    ₹
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Razorpay Payment Gateway</h3>
                    <p className="text-xs text-slate-500">Live UPI, QR, PhonePe, Cards & NetBanking</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                  Connected & Verified
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Secured with HMAC-SHA256 digital signature validation, anti-replay attack safeguards, and server-side order calculations.
              </p>
            </div>

            {/* Meta WhatsApp Cloud API */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Meta WhatsApp Cloud API (v21.0)</h3>
                    <p className="text-xs text-slate-500">Real-time webhook and interactive buttons</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                  v21.0 Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                End-to-end webhook stream with rate-limited throughput, QR sessions, and multi-agent customer support inbox.
              </p>
            </div>

            {/* OpenAI GPT-4o Model */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">OpenAI GPT-4o Sales Agent</h3>
                    <p className="text-xs text-slate-500">Smart catalog search and auto-replies</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400 text-[10px] font-bold rounded-full">
                  GPT-4o Engine
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Trained on your custom business FAQs, policy guidelines, product catalog, and natural language sentiment.
              </p>
            </div>

            {/* Supabase Database */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Supabase PostgreSQL Pooler</h3>
                    <p className="text-xs text-slate-500">Multi-tenant encrypted database engine</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                  Healthy
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Full tenant-scoped isolation (IDOR protected), transaction pools, and automatic daily backups.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BILLING & INVOICES */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Active Plan Summary Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Active Subscription
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Cycle: {subData?.billingCycle || 'MONTHLY'}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {subData?.planTier || 'STARTER'} Tier Plan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your plan is active and valid for <strong className="text-emerald-600">{subData?.daysRemaining ?? 30} more days</strong>.
                </p>
              </div>

              <Link
                to="/dashboard/billing"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Change / Upgrade Plan
              </Link>
            </div>

            {/* Quota Progress Meters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Products</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {subData?.usage?.products || 0} / {subData?.limits?.maxProducts || 500}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Conversations</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {subData?.usage?.conversations || 0} / {subData?.limits?.maxConversations || 10000}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Automations</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {subData?.usage?.automations || 0} / {subData?.limits?.maxAutomations || 50}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Broadcast Campaigns</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {subData?.usage?.campaigns || 0} / {subData?.limits?.maxCampaigns || 20}
                </span>
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tax Invoices &amp; Receipts</h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Plan Tier</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(subData?.recentPayments || []).map((pay: any) => (
                    <tr key={pay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {pay.invoiceNumber || `INV-${pay.id.slice(0, 6).toUpperCase()}`}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{pay.planTier || subData?.planTier}</td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">₹{pay.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{pay.paymentMethod || 'RAZORPAY_UPI'}</td>
                      <td className="py-3 px-3 text-slate-500">{new Date(pay.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3">
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {pay.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewInvoice(pay)}
                          className="text-emerald-600 hover:text-emerald-700 font-bold text-xs underline"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PASSWORD & SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Change Account Password</h2>
              <p className="text-xs text-slate-500">Ensure your workspace is safeguarded with a strong password.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password (minimum 6 characters)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                {isChangingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: View Printable Receipt / Invoice */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Receipt</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {viewInvoice.invoiceNumber || `INV-${viewInvoice.id.slice(0, 6).toUpperCase()}`}
                </h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase">
                {viewInvoice.status}
              </span>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Platform:</span>
                <span className="font-bold text-slate-900">AutoMate by DK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Plan:</span>
                <span className="font-bold text-slate-900">{viewInvoice.planTier || subData?.planTier} Tier</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono text-slate-800">{viewInvoice.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-slate-900">{viewInvoice.paymentMethod || 'Razorpay UPI'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paid On:</span>
                <span className="font-medium text-slate-900">{new Date(viewInvoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700">₹{viewInvoice.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Print / Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
