import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Campaign } from '../../types';
import {
  Send,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  Play,
  FileText,
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [customMessage, setCustomMessage] = useState('🎉 Special 20% OFF on all shirts & kurtis this weekend! Reply YES to shop.');

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/campaigns');
      if (res.data) setCampaigns(res.data);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/campaigns', {
        name,
        customMessage,
        targetAudience: { all: true },
      });
      setIsModalOpen(false);
      setName('');
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign');
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('Broadcast this message to all target customers on WhatsApp?')) return;
    try {
      await api.post(`/campaigns/${id}/launch`);
      alert('Campaign dispatched successfully!');
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to launch campaign');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Broadcast Campaigns</h1>
          <p className="text-xs text-slate-500 mt-0.5">Send targeted marketing & announcement broadcasts to customer lists.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Broadcast</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    c.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.status === 'RUNNING'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c.status}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                "{c.customMessage || c.template?.body || 'Broadcast content'}"
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Sent</span>
                <span className="font-bold text-slate-800">{c.sentCount}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Delivered</span>
                <span className="font-bold text-blue-600">{c.deliveredCount}</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <span className="text-[10px] text-emerald-600 block">Read</span>
                <span className="font-bold text-emerald-700">{c.readCount}</span>
              </div>
            </div>

            {c.status !== 'COMPLETED' && (
              <button
                onClick={() => handleLaunch(c.id)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Broadcast Now</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create Broadcast Campaign</h3>
            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash Sale Announcement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Message Text</label>
                <textarea
                  rows={4}
                  required
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-xs"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
