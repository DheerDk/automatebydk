import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, currentOrganization, updateProfile, refreshUserData } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

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
      setMsg({ type: 'success', text: 'Personal profile updated successfully in database.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-emerald-600" />
          <span>User Profile &amp; Account</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details, workspace profile, and business verification status.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 1. PERSONAL INFORMATION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
            <p className="text-xs text-slate-500">Your personal details across all tenant workspaces.</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={name}
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
                {user?.isEmailVerified && (
                  <span className="absolute right-3 top-2.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                    Verified
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Role</label>
              <input
                type="text"
                disabled
                value={user?.role || 'BUSINESS_OWNER'}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Personal Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. BUSINESS WORKSPACE DETAILS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Current Business Workspace</h2>
            <p className="text-xs text-slate-500">Workspace information and active plan details.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Workspace Name</span>
            <p className="text-sm font-bold text-slate-900">{currentOrganization?.name || 'My Business'}</p>
            <p className="text-slate-400">Slug: @{currentOrganization?.slug}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Active Subscription</span>
            <p className="text-sm font-bold text-emerald-700">{currentOrganization?.subscription?.planTier || 'GROWTH'} Plan</p>
            <p className="text-slate-400">Status: {currentOrganization?.subscription?.status || 'ACTIVE'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
