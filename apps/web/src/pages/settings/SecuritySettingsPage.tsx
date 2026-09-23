import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Shield,
  KeyRound,
  Laptop,
  Smartphone,
  Globe,
  Trash2,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  History,
  Lock,
  SmartphoneNfc,
} from 'lucide-react';
import { UserSession, LoginHistoryItem } from '../../types';

export const SecuritySettingsPage: React.FC = () => {
  const {
    user,
    fetchSessions,
    revokeSession,
    logoutOtherDevices,
    logoutAllDevices,
    changePassword,
    fetchLoginHistory,
    deleteAccount,
  } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Login History state
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPass, setDeleteConfirmPass] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadSecurityData = async () => {
    setSessionsLoading(true);
    setHistoryLoading(true);
    try {
      const [sessionsData, historyData] = await Promise.all([
        fetchSessions(),
        fetchLoginHistory(),
      ]);
      setSessions(sessionsData);
      setHistory(historyData);
    } catch {
      // Handled
    } finally {
      setSessionsLoading(false);
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully! Other device sessions were terminated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadSecurityData();
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password. Verify current password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke session');
    }
  };

  const handleLogoutOthers = async () => {
    if (!window.confirm('Are you sure you want to log out from all other devices?')) return;
    try {
      await logoutOtherDevices();
      loadSecurityData();
    } catch (err: any) {
      alert(err.message || 'Failed to log out other devices');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteAccount(deleteConfirmPass);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600" />
          <span>Security &amp; Device Management</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account credentials, view active device sessions, and audit recent login history.
        </p>
      </div>

      {/* 1. PASSWORD UPDATE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500">Ensure you use a strong password with letters, numbers, and symbols.</p>
          </div>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Update Password</span>
          </button>
        </form>
      </div>

      {/* 2. ACTIVE DEVICE SESSIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Device Sessions</h2>
              <p className="text-xs text-slate-500">Devices currently logged into your account workspace.</p>
            </div>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleLogoutOthers}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out other devices</span>
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No active sessions found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${s.isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {s.os.toLowerCase().includes('ios') || s.os.toLowerCase().includes('android') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{s.deviceName}</span>
                      {s.isCurrent && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      IP: <span className="font-mono">{s.ipAddress}</span> &bull; Last active: {new Date(s.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(s.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Terminate this session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. CONNECTED ACCOUNTS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Connected Accounts</h2>
            <p className="text-xs text-slate-500">Third-party identity providers linked to your account.</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <span className="text-sm font-bold text-slate-900">Google Account</span>
              <p className="text-xs text-slate-500">
                {user?.authProvider === 'GOOGLE' || (user?.connectedAccounts && user.connectedAccounts.length > 0)
                  ? 'Connected for single sign-on.'
                  : 'Not linked yet.'}
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${
              user?.authProvider === 'GOOGLE' || (user?.connectedAccounts && user.connectedAccounts.length > 0)
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {user?.authProvider === 'GOOGLE' || (user?.connectedAccounts && user.connectedAccounts.length > 0)
              ? '✓ Connected'
              : 'Not Linked'}
          </span>
        </div>
      </div>

      {/* 4. LOGIN HISTORY & AUDIT LOG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Login Activity</h2>
            <p className="text-xs text-slate-500">Recent authentication events for security auditing.</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No recent login records recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Device / Client</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold">
                        {h.authMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{h.deviceName}</td>
                    <td className="py-2.5 px-3 font-mono">{h.ipAddress}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          h.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. DANGER ZONE */}
      <div className="bg-red-50/40 rounded-2xl border border-red-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-red-950">Danger Zone: Delete Account</h2>
            <p className="text-xs text-red-800/80">
              Permanently remove your profile and terminate all active sessions. This action cannot be undone.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
        >
          Delete My Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Are you sure?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting your account will deactivate your workspace and terminate all active device sessions. Enter your password below to confirm:
            </p>

            {deleteError && (
              <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 text-xs rounded-lg">
                {deleteError}
              </div>
            )}

            <input
              type="password"
              value={deleteConfirmPass}
              onChange={(e) => setDeleteConfirmPass(e.target.value)}
              placeholder="Your current password"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-red-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmPass('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
