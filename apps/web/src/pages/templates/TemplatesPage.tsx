import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
  CheckCircle2,
  Smartphone,
  ExternalLink,
  PhoneCall,
  Send,
  Filter,
  Search,
  Check,
  Layers,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface MessageTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  body: string;
  variables: string[];
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  headerType?: 'NONE' | 'TEXT' | 'IMAGE';
  headerText?: string;
  headerMediaUrl?: string;
  footerText?: string;
  buttons?: {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phoneNumber?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

// Built-in starter templates for one-click customization
const STARTER_TEMPLATES: Omit<MessageTemplate, 'id'>[] = [
  {
    name: 'order_status_update',
    category: 'UTILITY',
    language: 'en',
    status: 'APPROVED',
    body: 'Hi {{1}}, your order #{{2}} has been confirmed and is now being prepared! Track your shipment live below.',
    variables: ['Customer Name', 'Order ID'],
    footerText: 'Thank you for choosing us!',
    buttons: [
      { type: 'URL', text: 'Track Order Live 📦', url: 'https://automatebydk.pages.dev/track' },
      { type: 'QUICK_REPLY', text: 'Need Help 🧑‍💼' },
    ],
  },
  {
    name: 'festive_vip_discount',
    category: 'MARKETING',
    language: 'en',
    status: 'APPROVED',
    body: 'Hello {{1}}! 🎉 Exclusive VIP Sale is now live! Get Flat {{2}}% OFF on all catalog items today using code {{3}}.',
    variables: ['Customer Name', 'Discount %', 'Coupon Code'],
    headerType: 'TEXT',
    headerText: '🌟 Exclusive VIP Offer',
    footerText: 'Valid for next 24 hours only',
    buttons: [
      { type: 'URL', text: 'Claim Offer Online 🛍️', url: 'https://automatebydk.pages.dev' },
      { type: 'QUICK_REPLY', text: 'Browse Catalog' },
    ],
  },
  {
    name: 'appointment_confirmation',
    category: 'UTILITY',
    language: 'en',
    status: 'APPROVED',
    body: 'Dear {{1}}, your appointment for {{2}} is confirmed for {{3}} at {{4}}. Please arrive 10 minutes prior.',
    variables: ['Patient Name', 'Doctor / Service', 'Date', 'Time'],
    footerText: 'Need to reschedule? Reply RESCHEDULE',
    buttons: [
      { type: 'URL', text: 'Get Directions 📍', url: 'https://maps.google.com' },
      { type: 'PHONE_NUMBER', text: 'Call Reception 📞', phoneNumber: '+919988011223' },
    ],
  },
  {
    name: 'instant_otp_verification',
    category: 'AUTHENTICATION',
    language: 'en',
    status: 'APPROVED',
    body: '{{1}} is your official verification security code. Do not share this OTP with anyone, including support staff.',
    variables: ['OTP Code'],
    footerText: 'Expires in 10 minutes',
    buttons: [{ type: 'QUICK_REPLY', text: 'Copy OTP' }],
  },
];

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Template Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en');
  const [body, setBody] = useState('');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [button1Text, setButton1Text] = useState('Visit Website 🌐');
  const [button1Url, setButton1Url] = useState('https://automatebydk.pages.dev');
  const [button2Text, setButton2Text] = useState('Chat with Us 💬');

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/templates');
      if (res.data && Array.isArray(res.data)) {
        // If user has database templates, use them; if empty, show starter templates
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setName('');
    setCategory('MARKETING');
    setLanguage('en');
    setBody('Hello {{1}}! 🎉 We are excited to announce our new special offer. Use code {{2}} to get 20% off today!');
    setHeaderType('NONE');
    setHeaderText('');
    setHeaderMediaUrl('');
    setFooterText('Reply STOP to unsubscribe');
    setButton1Text('Visit Website 🌐');
    setButton1Url('https://automatebydk.pages.dev');
    setButton2Text('Chat with Us 💬');
    setIsModalOpen(true);
  };

  const openEditModal = (t: MessageTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setCategory(t.category);
    setLanguage(t.language || 'en');
    setBody(t.body);
    setHeaderType(t.headerType || 'NONE');
    setHeaderText(t.headerText || '');
    setHeaderMediaUrl(t.headerMediaUrl || '');
    setFooterText(t.footerText || '');
    setButton1Text(t.buttons?.[0]?.text || '');
    setButton1Url(t.buttons?.[0]?.url || 'https://automatebydk.pages.dev');
    setButton2Text(t.buttons?.[1]?.text || '');
    setIsModalOpen(true);
  };

  const loadStarterTemplate = (starter: Omit<MessageTemplate, 'id'>) => {
    setEditingId(null);
    setName(`${starter.name}_custom`);
    setCategory(starter.category);
    setLanguage(starter.language);
    setBody(starter.body);
    setHeaderType(starter.headerType || 'NONE');
    setHeaderText(starter.headerText || '');
    setHeaderMediaUrl(starter.headerMediaUrl || '');
    setFooterText(starter.footerText || '');
    setButton1Text(starter.buttons?.[0]?.text || '');
    setButton1Url(starter.buttons?.[0]?.url || 'https://automatebydk.pages.dev');
    setButton2Text(starter.buttons?.[1]?.text || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, tplName: string) => {
    if (!confirm(`Are you sure you want to delete template "${tplName}"?`)) return;
    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const handleCopyBody = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertVariable = () => {
    // Count existing variables like {{1}}, {{2}}
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    const nextIndex = matches.length + 1;
    setBody(`${body} {{${nextIndex}}}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      alert('Please provide a valid template name and message body.');
      return;
    }

    // Extract variable count
    const varMatches = body.match(/\{\{(\d+)\}\}/g) || [];
    const variables = Array.from(new Set(varMatches));

    const buttons = [];
    if (button1Text.trim()) {
      buttons.push({ type: 'URL' as const, text: button1Text.trim(), url: button1Url.trim() });
    }
    if (button2Text.trim()) {
      buttons.push({ type: 'QUICK_REPLY' as const, text: button2Text.trim() });
    }

    const payload = {
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category,
      language,
      body,
      variables,
      headerType,
      headerText: headerType === 'TEXT' ? headerText : undefined,
      headerMediaUrl: headerType === 'IMAGE' ? headerMediaUrl : undefined,
      footerText: footerText || undefined,
      buttons,
    };

    try {
      if (editingId) {
        await api.put(`/templates/${editingId}`, payload);
      } else {
        await api.post('/templates', payload);
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  };

  // Combine database templates + starter templates if database is fresh
  const displayTemplates = templates.length > 0 ? templates : (STARTER_TEMPLATES as any);

  const filteredTemplates = displayTemplates.filter((t: MessageTemplate) => {
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1.5">
            <Sparkles className="w-4 h-4" /> Official WhatsApp Cloud API
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            WhatsApp Message Templates
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Create, preview, and manage rich message templates with dynamic variable tags (<code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded">{'{{1}}'}</code>), call-to-action buttons, and instant mobile preview.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Message Template</span>
        </button>
      </div>

      {/* Starter Template Library Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Ready-to-Use Starter Templates (1-Click Customize)</span>
          </div>
          <span className="text-[11px] text-slate-400">Click any preset to load into customizer</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STARTER_TEMPLATES.map((st, idx) => (
            <div
              key={idx}
              onClick={() => loadStarterTemplate(st)}
              className="group bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3.5 cursor-pointer transition flex flex-col justify-between space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    {st.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">en</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                  {st.name}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {st.body}
                </p>
              </div>
              <div className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 pt-1">
                <span>Use & Customize</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat === 'ALL' && 'All Categories'}
              {cat === 'MARKETING' && '🛍️ Marketing'}
              {cat === 'UTILITY' && '⚡ Utility'}
              {cat === 'AUTHENTICATION' && '🔐 Auth & OTP'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tpl: MessageTemplate) => (
          <div
            key={tpl.id || tpl.name}
            className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 shadow-xl transition-all flex flex-col justify-between overflow-hidden group"
          >
            {/* Top Bar */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  {tpl.category}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {tpl.language || 'en'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{tpl.name}</span>
                </h3>
              </div>

              {/* WhatsApp Simulated Message Card */}
              <div className="bg-[#0b141a] p-3.5 rounded-2xl border border-slate-800/80 space-y-2 relative shadow-inner">
                {tpl.headerText && (
                  <div className="font-bold text-xs text-emerald-400 pb-1 border-b border-slate-800/60">
                    {tpl.headerText}
                  </div>
                )}

                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {tpl.body}
                </p>

                {tpl.footerText && (
                  <p className="text-[10px] text-slate-400 italic pt-1">
                    {tpl.footerText}
                  </p>
                )}

                {/* Simulated Buttons */}
                {tpl.buttons && tpl.buttons.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    {tpl.buttons.map((btn, bIdx) => (
                      <div
                        key={bIdx}
                        className="w-full bg-[#1f2c34] hover:bg-[#2a3942] text-teal-400 text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-center transition"
                      >
                        {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                        {btn.type === 'PHONE_NUMBER' && <PhoneCall className="w-3 h-3" />}
                        {btn.type === 'QUICK_REPLY' && <Send className="w-3 h-3" />}
                        <span>{btn.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCopyBody(tpl.id || tpl.name, tpl.body)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                {copiedId === (tpl.id || tpl.name) ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5">
                {tpl.id && (
                  <>
                    <button
                      onClick={() => openEditModal(tpl)}
                      title="Edit Template"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      title="Delete Template"
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <Link
                  to="/dashboard/campaigns"
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Broadcast</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl p-6 border border-slate-800 text-white my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  {editingId ? 'Edit Message Template' : 'Create New WhatsApp Template'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure header, dynamic variable placeholders, and interactive buttons with live simulation.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Details */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Template Name (lowercase, no spaces) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. order_confirmed_alert"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MARKETING">🛍️ Marketing (Offers & Promos)</option>
                      <option value="UTILITY">⚡ Utility (Orders & Updates)</option>
                      <option value="AUTHENTICATION">🔐 Authentication (OTP & Security)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Header (Optional)</label>
                  <div className="flex gap-2 mb-2">
                    {(['NONE', 'TEXT', 'IMAGE'] as const).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setHeaderType(type)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                          headerType === type
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {headerType === 'TEXT' && (
                    <input
                      type="text"
                      placeholder="Enter header title..."
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                  {headerType === 'IMAGE' && (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-sample.jpg"
                      value={headerMediaUrl}
                      onChange={(e) => setHeaderMediaUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Message Body *</label>
                    <button
                      type="button"
                      onClick={insertVariable}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold cursor-pointer"
                    >
                      + Insert Variable {'{{1}}'}
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Hello {{1}}, your order #{{2}} is confirmed..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use placeholders like <code className="text-emerald-400">{'{{1}}'}</code>, <code className="text-emerald-400">{'{{2}}'}</code> to automatically personalize messages with the customer's name, order ID, or promo code.
                  </p>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Footer Text (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Reply STOP to opt-out"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Interactive Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-slate-300 font-semibold block">Interactive Action Buttons</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Button 1 (URL Link)</span>
                      <input
                        type="text"
                        placeholder="Button Title (e.g. Shop Online)"
                        value={button1Text}
                        onChange={(e) => setButton1Text(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white mb-1.5 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="url"
                        placeholder="https://yourstore.com"
                        value={button1Url}
                        onChange={(e) => setButton1Url(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Button 2 (Quick Reply)</span>
                      <input
                        type="text"
                        placeholder="Button Title (e.g. Talk to Agent)"
                        value={button2Text}
                        onChange={(e) => setButton2Text(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    {editingId ? 'Update Template' : 'Save Message Template'}
                  </button>
                </div>
              </div>

              {/* Right Column: Live Mobile Screen Simulation */}
              <div className="lg:col-span-5 bg-slate-950/80 p-5 rounded-3xl border border-slate-800 flex flex-col items-center justify-center">
                <div className="text-center mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" /> Live WhatsApp Mobile Screen
                  </span>
                </div>

                {/* Smartphone Device Frame */}
                <div className="w-[280px] bg-[#111b21] rounded-[36px] p-3 border-4 border-slate-800 shadow-2xl relative">
                  {/* Phone Notch / Header */}
                  <div className="bg-[#202c33] -mx-3 -mt-3 p-3 rounded-t-[32px] flex items-center gap-2 border-b border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                      DK
                    </div>
                    <div>
                      <h5 className="text-[11px] font-bold text-white leading-tight">AutoMate Official</h5>
                      <span className="text-[9px] text-emerald-400">Verified Business Account</span>
                    </div>
                  </div>

                  {/* Message Bubble Container */}
                  <div className="py-4 space-y-3 min-h-[260px] flex flex-col justify-end">
                    <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tl-sm text-xs shadow-md space-y-2">
                      {headerType === 'TEXT' && headerText && (
                        <div className="font-bold text-emerald-200 border-b border-emerald-600/50 pb-1 text-[11px]">
                          {headerText}
                        </div>
                      )}

                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap">
                        {body || 'Template message content will appear here in real-time...'}
                      </p>

                      {footerText && (
                        <div className="text-[9px] text-emerald-200/80 italic pt-0.5">
                          {footerText}
                        </div>
                      )}

                      {/* Action Buttons in Preview */}
                      {(button1Text || button2Text) && (
                        <div className="space-y-1 pt-1.5 border-t border-emerald-600/40">
                          {button1Text && (
                            <div className="w-full bg-[#111b21]/80 text-teal-300 py-1 px-2 rounded-md text-[10px] font-bold text-center flex items-center justify-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>{button1Text}</span>
                            </div>
                          )}
                          {button2Text && (
                            <div className="w-full bg-[#111b21]/80 text-teal-300 py-1 px-2 rounded-md text-[10px] font-bold text-center flex items-center justify-center gap-1">
                              <Send className="w-2.5 h-2.5" />
                              <span>{button2Text}</span>
                            </div>
                          )}
                        </div>
                      )}
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
