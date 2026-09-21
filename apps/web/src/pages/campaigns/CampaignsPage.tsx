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
  Filter,
  Image as ImageIcon,
  Tag,
  Globe,
  ShieldCheck,
  Smartphone,
  Flame,
  UserX,
  Layers,
  ArrowRight,
  Check
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Campaign Form State
  const [name, setName] = useState('');
  const [customMessage, setCustomMessage] = useState(
    '🎉 *Exclusive VIP Mega Sale is Live!*\nGet *Flat 25% OFF* on all items today only.\n✨ High demand stock is moving fast!'
  );
  const [mediaUrl, setMediaUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('https://automatebydk.pages.dev');
  const [discountCode, setDiscountCode] = useState('VIP25');

  // Audience Segmentation Filters State
  const [contactType, setContactType] = useState<'all' | 'unsaved_only' | 'saved_only'>('all');
  const [recency, setRecency] = useState<'all' | '7days' | '30days' | 'inactive_30days'>('all');
  const [leadStage, setLeadStage] = useState<'all' | 'INQUIRERS_ONLY' | 'NEW' | 'INTERESTED' | 'HOT'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [isLaunchingId, setIsLaunchingId] = useState<string | null>(null);

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
        mediaUrl: mediaUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        discountCode: discountCode || undefined,
        targetAudience: {
          all: contactType === 'all' && recency === 'all' && leadStage === 'all' && !tagFilter,
          contactType,
          recency,
          leadStage,
          tags: tagFilter ? [tagFilter] : [],
        },
      });
      setIsModalOpen(false);
      setName('');
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign');
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('Broadcast this campaign to the targeted customer audience on WhatsApp? (Personal & family contacts are automatically excluded)')) return;
    setIsLaunchingId(id);
    try {
      const res: any = await api.post(`/campaigns/${id}/launch`);
      alert(res.message || 'Campaign dispatched successfully!');
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to launch campaign');
    } finally {
      setIsLaunchingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" /> Zero-Spam Broadcast Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Smart Broadcast Campaigns</h1>
          <p className="text-slate-300 text-sm mt-1">
            Send targeted sale posters, discount offers, and website links to segmented audiences without disturbing personal contacts.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Targeted Broadcast</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {campaigns.map((c) => {
          const audience = (c as any).targetAudience || {};
          return (
            <div
              key={c.id}
              className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 text-white"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      c.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : c.status === 'RUNNING'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                    {c.customMessage || c.template?.body || 'Broadcast content'}
                  </p>
                </div>

                {/* Audience Segmentation Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-slate-700">
                    <Filter className="w-3 h-3 text-emerald-400" />
                    {audience.contactType === 'unsaved_only'
                      ? 'Unsaved Contacts Only'
                      : audience.contactType === 'saved_only'
                      ? 'Saved Contacts Only'
                      : 'All Contact Types'}
                  </span>

                  {audience.recency && audience.recency !== 'all' && (
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700">
                      ⏱️ {audience.recency === '7days' ? 'Last 7 Days' : audience.recency === '30days' ? 'Last 30 Days' : 'Inactive > 30 Days'}
                    </span>
                  )}

                  {audience.leadStage && audience.leadStage !== 'all' && (
                    <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded-md font-medium border border-slate-700">
                      🎯 {audience.leadStage}
                    </span>
                  )}

                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-medium border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Excludes Blacklisted
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-slate-800">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Sent</span>
                    <span className="font-bold text-white text-sm">{c.sentCount}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Delivered</span>
                    <span className="font-bold text-blue-400 text-sm">{c.deliveredCount}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Read</span>
                    <span className="font-bold text-emerald-400 text-sm">{c.readCount}</span>
                  </div>
                </div>

                {c.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleLaunch(c.id)}
                    disabled={isLaunchingId === c.id}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isLaunchingId === c.id ? 'Broadcasting with anti-spam pacing...' : 'Launch Broadcast Now'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {campaigns.length === 0 && !isLoading && (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3 text-white">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold">No Broadcast Campaigns Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first segmented WhatsApp campaign with posters, coupon codes, and action buttons.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              Create Broadcast
            </button>
          </div>
        )}
      </div>

      {/* CREATE CAMPAIGN MODAL WITH FULL SEGMENTATION & PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl p-6 border border-slate-800 text-white my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> New Smart WhatsApp Broadcast
                </h3>
                <p className="text-xs text-slate-400">
                  Target only relevant customers and protect personal family contacts from promotional spam.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Audience Segmentation */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekend Flash Sale 25% OFF"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">WhatsApp Message Body</label>
                  <textarea
                    rows={4}
                    required
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>

                {/* Poster & Rich Media */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Promo Poster / Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-amber-400" /> Coupon / Discount Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIP25, FESTIVE50"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-400" /> Online Website / Catalog Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://yourstore.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-400 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* AUDIENCE SEGMENTATION FILTERS */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-emerald-400" /> Target Audience Filters
                    </h4>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Anti-Spam Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Contact Type</label>
                      <select
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">👥 All Customers</option>
                        <option value="unsaved_only">📱 Unsaved Customer Numbers Only</option>
                        <option value="saved_only">📖 Saved Address Book Contacts Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Interaction Recency</label>
                      <select
                        value={recency}
                        onChange={(e) => setRecency(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">🌐 All Time Inquirers</option>
                        <option value="7days">⚡ Active in Last 7 Days</option>
                        <option value="30days">📅 Active in Last 30 Days</option>
                        <option value="inactive_30days">🔄 Inactive &gt; 30 Days (Win-Back)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Lead & Inquiry Stage</label>
                      <select
                        value={leadStage}
                        onChange={(e) => setLeadStage(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">🎯 All Inquiries & Leads</option>
                        <option value="INQUIRERS_ONLY">🛍️ Product Inquirers Only</option>
                        <option value="HOT">🔥 Hot Leads</option>
                        <option value="INTERESTED">✨ Interested Prospects</option>
                        <option value="NEW">🆕 New Leads</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Filter by Customer Tag</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP-Buyer, Catalog-Viewer"
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic pt-1">
                    🛡️ <strong>Note:</strong> Numbers on your Excluded Numbers list (family/personal) are permanently excluded and will never receive this broadcast.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
                  >
                    Create & Review Broadcast
                  </button>
                </div>
              </div>

              {/* Right Column: Live WhatsApp Message Preview */}
              <div className="lg:col-span-5">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
                    <Smartphone className="w-4 h-4" /> Live WhatsApp Message Preview
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-3.5 space-y-3 border border-slate-800">
                    {/* Poster Image Preview */}
                    {mediaUrl ? (
                      <div className="rounded-xl overflow-hidden max-h-40 border border-slate-800">
                        <img src={mediaUrl} alt="Poster" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-28 bg-slate-950 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[11px] gap-1">
                        <ImageIcon className="w-5 h-5 text-slate-600" />
                        <span>Optional Poster Image</span>
                      </div>
                    )}

                    {/* Message Body Preview */}
                    <div className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {customMessage}
                      {discountCode && (
                        <div className="mt-2 p-2 bg-slate-950/80 rounded-lg border border-amber-500/30 text-amber-300 font-mono text-xs">
                          🏷️ Use Coupon Code: <strong>{discountCode.toUpperCase()}</strong>
                        </div>
                      )}
                      {websiteUrl && (
                        <div className="mt-1.5 text-blue-400 text-xs truncate">
                          🌐 {websiteUrl}
                        </div>
                      )}
                    </div>

                    {/* Interactive Clickable WhatsApp Action Buttons */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 text-xs font-bold rounded-xl text-center border border-emerald-500/30 shadow-xs flex items-center justify-center gap-1.5">
                        🛍️ Browse Catalog
                      </div>
                      <div className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 text-xs font-bold rounded-xl text-center border border-emerald-500/30 shadow-xs flex items-center justify-center gap-1.5">
                        🏷️ Claim Offer on WhatsApp
                      </div>
                      <div className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 text-xs font-bold rounded-xl text-center border border-emerald-500/30 shadow-xs flex items-center justify-center gap-1.5">
                        🧑‍💼 Talk to Support
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
