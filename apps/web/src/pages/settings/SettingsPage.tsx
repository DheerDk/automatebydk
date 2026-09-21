import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2,
  QrCode,
  Bot,
  Users,
  CreditCard,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Smartphone,
  Cloud,
  RefreshCw,
  Power,
  Wifi,
  WifiOff,
  Check,
  PhoneCall,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  // WhatsApp Sub-Tab: 'qr' (Personal / WhatsApp Web) vs 'cloud' (Meta Cloud API)
  const [waMode, setWaMode] = useState<'qr' | 'cloud'>('qr');

  // QR Session State
  const [qrStatus, setQrStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrPhone, setQrPhone] = useState<string | null>(null);
  const [isQrStarting, setIsQrStarting] = useState(false);

  const { currentOrganization } = useAuth();
  const { settings, whatsappAccount, refetchSettings } = useTenant();

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    instagram: '',
    currency: 'INR',
    businessHours: '',
    deliveryPolicy: '',
    returnPolicy: '',
    exchangePolicy: '',
    paymentMethods: '',
    welcomeMessage: '',
    humanHandoffKeywords: 'human, agent, support, help',
  });

  const [waForm, setWaForm] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    verifyToken: 'chatflow_webhook_verify_token_secure_xyz_987',
    displayPhoneNumber: '',
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('STAFF');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setProfileForm({
        name: currentOrganization?.name || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        website: settings.website || '',
        instagram: settings.instagram || '',
        currency: settings.currency || 'INR',
        businessHours: settings.businessHours || '',
        deliveryPolicy: settings.deliveryPolicy || '',
        returnPolicy: settings.returnPolicy || '',
        exchangePolicy: settings.exchangePolicy || '',
        paymentMethods: settings.paymentMethods || '',
        welcomeMessage: settings.welcomeMessage || '',
        humanHandoffKeywords: (settings.humanHandoffKeywords || []).join(', '),
      });
    }

    if (whatsappAccount) {
      setWaForm({
        phoneNumberId: whatsappAccount.phoneNumberId || '',
        businessAccountId: whatsappAccount.businessAccountId || '',
        accessToken: '••••••••••••••••',
        verifyToken: 'chatflow_webhook_verify_token_secure_xyz_987',
        displayPhoneNumber: whatsappAccount.displayPhoneNumber || '',
      });
    }

    fetchTeam();
    fetchQrStatus();
  }, [settings, whatsappAccount, currentOrganization]);

  // QR Session Listeners
  useEffect(() => {
    socketService.connect();

    const handleQrUpdate = (data: any) => {
      if (data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
      }
      if (data.status) {
        setQrStatus(data.status);
      }
      setIsQrStarting(false);
    };

    const handleStatusUpdate = (data: any) => {
      setQrStatus(data.status);
      if (data.phone) {
        setQrPhone(data.phone);
      }
      if (data.status === 'CONNECTED') {
        setQrDataUrl(null);
        refetchSettings();
      }
      setIsQrStarting(false);
    };

    socketService.on('whatsapp:qr', handleQrUpdate);
    socketService.on('whatsapp:status', handleStatusUpdate);

    return () => {
      socketService.off('whatsapp:qr', handleQrUpdate);
      socketService.off('whatsapp:status', handleStatusUpdate);
    };
  }, []);

  const fetchQrStatus = async () => {
    try {
      const res: any = await api.get('/whatsapp/qr/status');
      if (res.data) {
        setQrStatus(res.data.status);
        setQrDataUrl(res.data.qrDataUrl);
        setQrPhone(res.data.phone);
      }
    } catch (err) {
      console.error('Failed to fetch QR status:', err);
    }
  };

  const handleStartQr = async () => {
    setIsQrStarting(true);
    try {
      const res: any = await api.post('/whatsapp/qr/start');
      if (res.data) {
        setQrStatus(res.data.status);
        setQrDataUrl(res.data.qrDataUrl);
        setQrPhone(res.data.phone);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize QR session');
    } finally {
      setIsQrStarting(false);
    }
  };

  const handleLogoutQr = async () => {
    if (!confirm('Are you sure you want to disconnect this WhatsApp number?')) return;
    try {
      await api.post('/whatsapp/qr/logout');
      setQrStatus('DISCONNECTED');
      setQrDataUrl(null);
      setQrPhone(null);
      refetchSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect WhatsApp');
    }
  };

  const fetchTeam = async () => {
    try {
      const res: any = await api.get('/organization/members');
      if (res.data) setTeamMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/profile', {
        ...profileForm,
        humanHandoffKeywords: profileForm.humanHandoffKeywords.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetchSettings();
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/settings/whatsapp', waForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetchSettings();
    } catch (err: any) {
      alert(err.message || 'Error saving WhatsApp credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/organization/members', {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      fetchTeam();
    } catch (err: any) {
      alert(err.message || 'Failed to invite team member');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'whatsapp', label: 'WhatsApp Meta API', icon: QrCode },
    { id: 'ai', label: 'AI & Store FAQ', icon: Bot },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  ];

  const webhookCallbackUrl = `${window.location.origin}/api/webhooks/whatsapp`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings & Configuration</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage store profile, Meta WhatsApp credentials, AI policies, and team permissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchParams({ tab: tab.id });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Tab 1: Business Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">General Business Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Store / Business Name</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Currency</label>
              <select
                value={profileForm.currency}
                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Support Phone</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Support Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="font-semibold text-slate-700 block mb-1">Physical Store Address</label>
            <input
              type="text"
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
      )}

      {/* Tab 2: WhatsApp Setup (Dual Mode: QR Code vs Cloud API) */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 max-w-3xl">
          {/* Mode Selector Header */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex gap-2">
            <button
              type="button"
              onClick={() => setWaMode('qr')}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                waMode === 'qr'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Scan QR Code (Personal / Business App)</span>
              <span className="text-[10px] font-extrabold bg-slate-950/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Instant
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWaMode('cloud')}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                waMode === 'cloud'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Meta Cloud API (Official API)</span>
              <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                v21.0
              </span>
            </button>
          </div>

          {/* SUB-TAB 1: QR CODE LINKED DEVICE */}
          {waMode === 'qr' && (
            <div className="space-y-6">
              {/* Connection Status Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        qrStatus === 'CONNECTED'
                          ? 'bg-emerald-100 text-emerald-600'
                          : qrStatus === 'QR_READY' || qrStatus === 'CONNECTING'
                          ? 'bg-amber-100 text-amber-600 animate-pulse'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {qrStatus === 'CONNECTED' ? (
                        <Wifi className="w-5 h-5" />
                      ) : qrStatus === 'QR_READY' || qrStatus === 'CONNECTING' ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <WifiOff className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>WhatsApp Multi-Device Connection</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            qrStatus === 'CONNECTED'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : qrStatus === 'QR_READY'
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : qrStatus === 'CONNECTING'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {qrStatus === 'CONNECTED'
                            ? '● Live & Connected'
                            : qrStatus === 'QR_READY'
                            ? '● Ready to Scan'
                            : qrStatus === 'CONNECTING'
                            ? '● Generating QR...'
                            : '○ Disconnected'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {qrStatus === 'CONNECTED'
                          ? `Linked to number: ${qrPhone || whatsappAccount?.displayPhoneNumber || 'Active'}`
                          : 'Connect your personal or WhatsApp Business app in 5 seconds.'}
                      </p>
                    </div>
                  </div>

                  {qrStatus === 'CONNECTED' ? (
                    <button
                      type="button"
                      onClick={handleLogoutQr}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Disconnect Number</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartQr}
                      disabled={isQrStarting}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isQrStarting ? 'animate-spin' : ''}`} />
                      <span>{qrDataUrl ? 'Refresh QR Code' : 'Generate QR Code'}</span>
                    </button>
                  )}
                </div>

                {/* QR Display Area */}
                {qrStatus === 'CONNECTED' ? (
                  <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-emerald-950">WhatsApp Linked & Active</h4>
                      <p className="text-xs text-emerald-700 mt-1 max-w-md">
                        Your WhatsApp number <span className="font-bold font-mono">{qrPhone || whatsappAccount?.displayPhoneNumber}</span> is linked. All incoming customer messages will receive AI auto-replies and show up in your inbox!
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-[11px] bg-white/80 border border-emerald-300 text-emerald-800 font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        AI Catalog Search Active
                      </span>
                      <span className="text-[11px] bg-white/80 border border-emerald-300 text-emerald-800 font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Lead Capture Active
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3 min-h-[280px]">
                      {qrDataUrl ? (
                        <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                          <img
                            src={qrDataUrl}
                            alt="WhatsApp QR Code"
                            className="w-52 h-52 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-3 py-8">
                          <QrCode className="w-16 h-16 text-slate-300" />
                          <p className="text-xs text-slate-500 max-w-[200px]">
                            {isQrStarting
                              ? 'Initializing WhatsApp Multi-Device session...'
                              : 'Click the button below to generate a real-time QR code'}
                          </p>
                          <button
                            type="button"
                            onClick={handleStartQr}
                            disabled={isQrStarting}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isQrStarting ? 'animate-spin' : ''}`} />
                            <span>{isQrStarting ? 'Generating...' : 'Show QR Code'}</span>
                          </button>
                        </div>
                      )}

                      {qrDataUrl && (
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          Waiting for scan from your phone...
                        </span>
                      )}
                    </div>

                    {/* How to scan instructions */}
                    <div className="space-y-4 text-xs">
                      <h4 className="font-bold text-slate-900 text-sm">How to link your WhatsApp:</h4>
                      <ol className="space-y-3 text-slate-600">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            1
                          </span>
                          <span>Open <strong>WhatsApp</strong> or <strong>WhatsApp Business</strong> on your phone.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            2
                          </span>
                          <span>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            3
                          </span>
                          <span>Tap <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            4
                          </span>
                          <span>Point your phone camera at the QR code on the left!</span>
                        </li>
                      </ol>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                        💡 <strong>Note:</strong> You will remain logged into WhatsApp on your phone as usual. You can chat with your personal contacts anytime!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: META CLOUD API (OFFICIAL API) */}
          {waMode === 'cloud' && (
            <div className="space-y-6">
              {/* Webhook Configuration Card */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Meta Webhook Configuration</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                    Meta Graph API v21.0
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Paste these details in your Meta WhatsApp Developer App &gt; Webhooks configuration:
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 font-sans block mb-1 font-semibold">Callback URL:</span>
                    <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 truncate flex-1">{webhookCallbackUrl}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(webhookCallbackUrl)}
                        className="p-1 hover:text-emerald-400"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-sans block mb-1 font-semibold">Verify Token:</span>
                    <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 flex-1">{waForm.verifyToken}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(waForm.verifyToken)}
                        className="p-1 hover:text-emerald-400"
                        title="Copy Token"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleSaveWhatsApp} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">WhatsApp Cloud API Credentials</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 109823485729104"
                      value={waForm.phoneNumberId}
                      onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">WhatsApp Business Account ID (WABA)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 209384729182394"
                      value={waForm.businessAccountId}
                      onChange={(e) => setWaForm({ ...waForm, businessAccountId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">System User Access Token</label>
                    <input
                      type="password"
                      placeholder="EAAB..."
                      value={waForm.accessToken}
                      onChange={(e) => setWaForm({ ...waForm, accessToken: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Tokens are encrypted server-side and never exposed to the frontend.
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Connecting...' : 'Save & Connect WhatsApp'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AI & Store FAQ Policies */}
      {activeTab === 'ai' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 max-w-3xl text-xs">
          <h3 className="text-sm font-bold text-slate-900">AI Policies & Knowledge Base</h3>
          <p className="text-slate-400 text-[11px]">ChatFlow AI uses this knowledge base to resolve customer questions accurately.</p>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Store Timings & Business Hours</label>
            <input
              type="text"
              value={profileForm.businessHours}
              onChange={(e) => setProfileForm({ ...profileForm, businessHours: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Delivery & Shipping Policy</label>
            <textarea
              rows={2}
              value={profileForm.deliveryPolicy}
              onChange={(e) => setProfileForm({ ...profileForm, deliveryPolicy: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Return & Refund Policy</label>
            <textarea
              rows={2}
              value={profileForm.returnPolicy}
              onChange={(e) => setProfileForm({ ...profileForm, returnPolicy: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Accepted Payment Methods</label>
            <input
              type="text"
              value={profileForm.paymentMethods}
              onChange={(e) => setProfileForm({ ...profileForm, paymentMethods: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Human Handoff Trigger Keywords</label>
            <input
              type="text"
              value={profileForm.humanHandoffKeywords}
              onChange={(e) => setProfileForm({ ...profileForm, humanHandoffKeywords: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save AI Policies</span>
          </button>
        </form>
      )}

      {/* Tab 4: Team Members */}
      {activeTab === 'team' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Team Members & Permissions</h3>
              <p className="text-xs text-slate-400">Invite staff agents to manage WhatsApp conversations</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Staff</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {teamMembers.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                    {member.user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{member.user.name}</h4>
                    <p className="text-slate-400 text-[11px]">{member.user.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                  {member.role}
                </span>
              </div>
            ))}
          </div>

          {isInviteModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-4">Invite Team Member</h3>
                <form onSubmit={handleInvite} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="STAFF">STAFF (Inbox & Customer Management)</option>
                      <option value="ADMIN">ADMIN (Catalog & Automations)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-xs"
                    >
                      Send Invite
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Billing & Plans */}
      {activeTab === 'billing' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 max-w-3xl">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
              Current Active Plan
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-2">GROWTH Business Plan</h3>
            <p className="text-xs text-slate-500 mt-1">Unlimited AI product searches, broadcast campaigns & 10 team seats.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">Products Limit</span>
              <span className="font-bold text-slate-800">500 items</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">Monthly Chats</span>
              <span className="font-bold text-slate-800">10,000</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">AI Searches</span>
              <span className="font-bold text-slate-800">25,000</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">Team Members</span>
              <span className="font-bold text-slate-800">10 Seats</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
