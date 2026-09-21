import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
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
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuperAdminStats = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/super-admin/stats');
      if (res.data) setData(res.data);
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminStats();
  }, []);

  const overview = data?.overview || {};
  const organizations = data?.organizations || [];
  const recentAuditLogs = data?.recentAuditLogs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin Platform Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">Multi-tenant management, subscription metrics, and system audit logs.</p>
        </div>
      </div>

      {/* Platform Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Businesses</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalOrganizations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Platform Users</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">WhatsApp Messages</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{overview.totalMessages || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total CRM Leads</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalLeads || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Active Subscriptions</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{overview.activeSubscriptions || 0}</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Connected Tenant Businesses</h3>
          <span className="text-xs text-slate-400 font-semibold">{organizations.length} organizations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4">Customers</th>
                <th className="py-3 px-4">Messages</th>
                <th className="py-3 px-4">Leads</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.map((org: any) => (
                <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{org.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{org.slug}</td>
                  <td className="py-3 px-4">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {org.planTier}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{org.productCount}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{org.customerCount}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{org.messageCount}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{org.leadCount}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">System Audit Logs</h3>
        <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
          {recentAuditLogs.map((log: any) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 font-mono text-[11px] mr-2">[{log.action}]</span>
                <span className="text-slate-600">{log.entityType} ({log.user?.name || 'System'})</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
