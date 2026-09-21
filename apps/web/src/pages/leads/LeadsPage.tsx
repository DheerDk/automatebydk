import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useTenant } from '../../contexts/TenantContext';
import { Lead } from '../../types';
import {
  Plus,
  Target,
  Clock,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronRight,
  TrendingUp,
  User,
  ShoppingBag,
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const { currency } = useTenant();
  const [columns, setColumns] = useState<Record<string, { leads: Lead[]; totalValue: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const statusList = [
    { key: 'NEW', label: 'New Enquiries', color: 'border-blue-500 bg-blue-50/50 text-blue-700' },
    { key: 'CONTACTED', label: 'Contacted', color: 'border-indigo-500 bg-indigo-50/50 text-indigo-700' },
    { key: 'INTERESTED', label: 'Interested', color: 'border-purple-500 bg-purple-50/50 text-purple-700' },
    { key: 'FOLLOW_UP', label: 'Follow-up', color: 'border-pink-500 bg-pink-50/50 text-pink-700' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'border-amber-500 bg-amber-50/50 text-amber-700' },
    { key: 'CONVERTED', label: 'Converted 🎉', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-700' },
    { key: 'LOST', label: 'Lost', color: 'border-slate-400 bg-slate-50 text-slate-600' },
  ];

  const fetchKanban = async () => {
    try {
      const res: any = await api.get('/leads/kanban');
      if (res.data) {
        setColumns(res.data);
      }
    } catch (err) {
      console.error('Error fetching leads Kanban:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKanban();

    const handleLeadUpdate = () => fetchKanban();
    socketService.on('lead:updated', handleLeadUpdate);
    socketService.on('lead:created', handleLeadUpdate);

    return () => {
      socketService.off('lead:updated', handleLeadUpdate);
      socketService.off('lead:created', handleLeadUpdate);
    };
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await api.put(`/leads/${leadId}/status`, { status: newStatus });
      fetchKanban();
    } catch (err) {
      console.error('Error updating lead status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leads Pipeline (Kanban)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track and convert WhatsApp leads through interactive pipeline stages.</p>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[calc(100vh-220px)]">
        {statusList.map((colDef) => {
          const colData = columns[colDef.key] || { leads: [], totalValue: 0 };
          const leads = colData.leads || [];

          return (
            <div
              key={colDef.key}
              className="w-72 bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3 flex flex-col shrink-0 max-h-[calc(100vh-220px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${colDef.color}`}>
                    {colDef.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500">({leads.length})</span>
                </div>
                <span className="text-xs font-black text-slate-800">
                  {currency} {colData.totalValue.toLocaleString()}
                </span>
              </div>

              {/* Leads Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {leads.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No leads in this stage
                  </div>
                ) : (
                  leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {lead.customer?.name || 'Customer'}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{lead.customer?.phone}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-600">
                          {currency} {(lead.estimatedValue || 0).toLocaleString()}
                        </span>
                      </div>

                      {lead.product && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2 text-xs">
                          <img
                            src={lead.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                            alt={lead.product.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                          <p className="font-semibold text-slate-800 truncate text-[11px]">{lead.product.name}</p>
                        </div>
                      )}

                      {lead.notes && (
                        <p className="text-[10px] text-slate-500 bg-slate-50/50 p-1.5 rounded italic">
                          "{lead.notes}"
                        </p>
                      )}

                      {/* Card Action Controls */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                        <Link
                          to="/dashboard/inbox"
                          className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </Link>

                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 focus:outline-none"
                        >
                          {statusList.map((st) => (
                            <option key={st.key} value={st.key}>{st.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
