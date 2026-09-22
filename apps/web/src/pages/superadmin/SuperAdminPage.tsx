import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldAlert,
  Building2,
  Users,
  MessageSquare,
  Target,
  CreditCard,
  Search,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Calendar,
  DollarSign,
  AlertTriangle,
  RotateCw,
  ExternalLink,
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const { switchOrganization } = useAuth();
  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'APPROVALS' | 'TENANTS' | 'PAYMENTS' | 'PLANS' | 'AUDIT'>('APPROVALS');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Action States
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'EXTEND' | 'PLAN' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [selectedNewTier, setSelectedNewTier] = useState('GROWTH');
  const [extendDaysCount, setExtendDaysCount] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSuperAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, paymentsRes]: any = await Promise.all([
        api.get('/super-admin/stats'),
        api.get('/super-admin/payments').catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) setData(statsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const overview = data?.overview || {};
  const organizations: any[] = data?.organizations || [];
  const plans: any[] = data?.plans || [];
  const recentAuditLogs: any[] = data?.recentAuditLogs || [];

  const pendingOrgs = organizations.filter(
    (org) => org.status === 'PENDING_APPROVAL' || org.isVerified === false
  );

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.planTier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Approve
  const handleApprove = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      await api.post(`/super-admin/organizations/${selectedOrg.id}/approve`, {
        note: actionNote || 'Approved and verified by Super Admin',
      });
      setSuccessMessage(`Organization ${selectedOrg.name} approved successfully!`);
      setActionType(null);
      setSelectedOrg(null);
      setActionNote('');
      fetchSuperAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve organization');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!selectedOrg) return;
    if (!actionNote) {
      alert('Please enter a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/super-admin/organizations/${selectedOrg.id}/reject`, {
        reason: actionNote,
      });
      setSuccessMessage(`Organization ${selectedOrg.name} has been rejected.`);
      setActionType(null);
      setSelectedOrg(null);
      setActionNote('');
      fetchSuperAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject organization');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Extend / Plan Change
  const handleUpdateSubscription = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      await api.put(`/super-admin/organizations/${selectedOrg.id}/subscription`, {
        planTier: actionType === 'PLAN' ? selectedNewTier : undefined,
        extendDays: actionType === 'EXTEND' ? extendDaysCount : undefined,
      });
      setSuccessMessage(`Subscription updated for ${selectedOrg.name} successfully!`);
      setActionType(null);
      setSelectedOrg(null);
      fetchSuperAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Suspend
  const handleToggleSuspend = async (org: any) => {
    const newStatus = org.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (!confirm(`Are you sure you want to change status of ${org.name} to ${newStatus}?`)) return;

    try {
      await api.put(`/super-admin/organizations/${org.id}/subscription`, {
        status: newStatus,
      });
      fetchSuperAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">Super Admin Platform Console</h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Root Access
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage multi-tenant subscriptions, approve newly registered businesses, and review platform revenue.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSuperAdminData}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all w-fit"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="font-bold text-sm hover:text-white">✕</button>
        </div>
      )}

      {/* Platform Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Businesses</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalOrganizations || 0}</p>
          <span className="text-[10px] text-slate-400 font-semibold">{overview.totalUsers || 0} registered users</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingOrgs.length}</p>
          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Action required</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Est. Monthly MRR</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{(overview.mrr || 14990).toLocaleString()}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">+18.5% MoM</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total WhatsApp Msgs</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{overview.totalMessages || 0}</p>
          <span className="text-[10px] text-slate-400 font-semibold">Across all tenants</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Platform Leads</span>
          <p className="text-2xl font-black text-purple-600 mt-1">{overview.totalLeads || 0}</p>
          <span className="text-[10px] text-purple-600 font-semibold">In CRM pipelines</span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'APPROVALS', label: `Pending Approvals (${pendingOrgs.length})`, icon: Clock },
          { id: 'TENANTS', label: `All Businesses (${organizations.length})`, icon: Building2 },
          { id: 'PAYMENTS', label: `Payments & MRR (${payments.length})`, icon: CreditCard },
          { id: 'PLANS', label: 'Plan Configurator', icon: Sliders },
          { id: 'AUDIT', label: 'Platform Audit Logs', icon: Activity },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 pb-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === t.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ---------------- TAB 1: PENDING APPROVALS ---------------- */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4">
          {pendingOrgs.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">All Businesses Verified!</h3>
              <p className="text-xs text-slate-500">There are no pending registrations requiring review right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingOrgs.map((org) => (
                <div key={org.id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{org.name}</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Pending Approval
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Category: {org.category}</p>
                    </div>

                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Tier: {org.planTier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Slug / Domain</span>
                      <span className="font-mono text-slate-700 font-bold">{org.slug}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Registered On</span>
                      <span className="text-slate-700">{new Date(org.createdAt).toLocaleDateString()}</span>
                    </div>
                    {org.lastPayment && (
                      <>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Payment Ref</span>
                          <span className="font-mono text-slate-700 text-[11px]">{org.lastPayment.transactionId}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Amount Paid</span>
                          <span className="font-bold text-emerald-600">₹{org.lastPayment.amount} ({org.lastPayment.paymentMethod})</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrg(org);
                        setActionType('APPROVE');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrg(org);
                        setActionType('REJECT');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 2: ALL TENANTS ---------------- */}
      {activeTab === 'TENANTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          {/* Table Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search business, slug, or tier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Conversations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{org.name}</p>
                      <p className="font-mono text-slate-400 text-[10px]">{org.slug}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{org.category}</td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px]">
                        {org.planTier} ({org.billingCycle || 'MONTHLY'})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{org.productCount} items</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{org.messageCount} msgs</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit ${
                          org.status === 'ACTIVE'
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : org.status === 'PENDING_APPROVAL'
                            ? 'text-amber-700 bg-amber-50 border border-amber-200'
                            : 'text-red-700 bg-red-50 border border-red-200'
                        }`}
                      >
                        {org.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {org.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrg(org);
                            setSelectedNewTier(org.planTier);
                            setActionType('PLAN');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          Change Tier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrg(org);
                            setActionType('EXTEND');
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold"
                        >
                          +30d Renew
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(org)}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            org.status === 'SUSPENDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {org.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: PAYMENTS & MRR ---------------- */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform Payment Ledger</h3>
              <p className="text-xs text-slate-400">All customer subscription checkouts and invoice transactions.</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Total Revenue: ₹{(overview.totalRevenue || 8997).toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Business</th>
                  <th className="py-2.5 px-3">Plan Tier</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">{p.transactionId}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{p.organization?.name || 'StyleHub Store'}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{p.planTier || 'GROWTH'}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">₹{p.amount.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-600">{p.paymentMethod}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: PLAN CONFIGURATOR ---------------- */}
      {activeTab === 'PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.tier} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                <span className="text-xs font-mono font-bold text-emerald-600">₹{p.priceMonthly}/mo</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Max Products:</span>
                  <span className="font-bold text-slate-900">{p.maxProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Conversations:</span>
                  <span className="font-bold text-slate-900">{p.maxConversations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Team Users:</span>
                  <span className="font-bold text-slate-900">{p.maxUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Queries Limit:</span>
                  <span className="font-bold text-slate-900">{p.aiSearchLimit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- TAB 5: AUDIT LOGS ---------------- */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Platform Security &amp; Activity Trail</h3>
          <div className="divide-y divide-slate-100 text-xs max-h-96 overflow-y-auto">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono text-[11px] mr-2">[{log.action}]</span>
                  <span className="text-slate-600">{log.entityType} • {log.user?.email || 'System'}</span>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Approve Dialog */}
      {actionType === 'APPROVE' && selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Approve Business Registration</h3>
            <p className="text-xs text-slate-500">
              Verify and activate <strong className="text-slate-900">{selectedOrg.name}</strong> for live WhatsApp automation.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Note</label>
              <textarea
                rows={2}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Approved after payment verification."
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Dialog */}
      {actionType === 'REJECT' && selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-600">Reject Business Account</h3>
            <p className="text-xs text-slate-500">
              Enter reason for rejection for <strong className="text-slate-900">{selectedOrg.name}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason</label>
              <textarea
                rows={2}
                required
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Invalid GST number or unverified payment reference."
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Plan Tier */}
      {actionType === 'PLAN' && selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Modify Plan Tier</h3>
            <p className="text-xs text-slate-500">
              Change subscription tier for <strong className="text-slate-900">{selectedOrg.name}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Tier</label>
              <select
                value={selectedNewTier}
                onChange={(e) => setSelectedNewTier(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
              >
                <option value="FREE">Free Starter</option>
                <option value="STARTER">Starter Pro (₹1,499)</option>
                <option value="GROWTH">Growth Business (₹2,999)</option>
                <option value="PRO">Enterprise Scale (₹5,999)</option>
                <option value="ENTERPRISE">Custom Enterprise (₹12,999)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSubscription}
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                {actionLoading ? 'Updating...' : 'Save Tier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Extend Subscription */}
      {actionType === 'EXTEND' && selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Extend Subscription Period</h3>
            <p className="text-xs text-slate-500">
              Grant additional active validity for <strong className="text-slate-900">{selectedOrg.name}</strong>.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[30, 90, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExtendDaysCount(d)}
                  className={`py-2 rounded-xl border text-xs font-bold ${
                    extendDaysCount === d
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  +{d} Days
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSubscription}
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                {actionLoading ? 'Extending...' : `Grant +${extendDaysCount} Days`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
