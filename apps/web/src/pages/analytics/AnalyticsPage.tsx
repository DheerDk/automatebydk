import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Users,
  Target,
  Sparkles,
  ShoppingBag,
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

export const AnalyticsPage: React.FC = () => {
  const { currency } = useTenant();
  const [data, setData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get(`/analytics/dashboard?timeframe=${timeframe}`);
      if (res.data) setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const metrics = data?.metrics || {};
  const timeline = data?.timeline || [];
  const funnel = data?.funnel || [];
  const topProducts = data?.topProducts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Performance tracking across messaging, conversions, and product demand.</p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          {(['7d', '30d', '90d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tf === '7d' ? 'Last 7 Days' : tf === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Conversations</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalMessages || 0}</p>
          <span className="text-xs text-emerald-600 font-bold">100% Delivery Rate</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Captured Leads</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalLeads || 0}</p>
          <span className="text-xs text-blue-600 font-bold">+{metrics.newLeads || 0} in timeframe</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Closed Sales Deals</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.convertedLeads || 0}</p>
          <span className="text-xs text-emerald-600 font-bold">{metrics.conversionRate || 0}% Conversion</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Attributed Revenue</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{currency} {(metrics.revenue || 0).toLocaleString()}</p>
          <span className="text-xs text-slate-400 font-medium">WhatsApp direct pipeline</span>
        </div>
      </div>

      {/* Daily Volume Bar Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Daily WhatsApp Message Volume</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline}>
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
              <Bar dataKey="inbound" name="Inbound Chats" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outbound" name="Outbound Replies" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
