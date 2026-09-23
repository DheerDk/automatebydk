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
  HelpCircle,
  Users,
  X,
  Play,
  Share2,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '../../components/common/ImageUploader';

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
  {
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'en',
    status: 'APPROVED',
    body: 'Hi {{1}}, a friendly reminder regarding your pending invoice #{{2}} for amount ₹{{3}}. Kindly complete payment via the link below.',
    variables: ['Customer Name', 'Invoice #', 'Amount'],
    footerText: 'AutoMate Secure Payments',
    buttons: [
      { type: 'URL', text: 'Pay Securely Now 💳', url: 'https://automatebydk.pages.dev/billing' },
    ],
  },
  {
    name: 'lead_follow_up',
    category: 'MARKETING',
    language: 'en',
    status: 'APPROVED',
    body: 'Hello {{1}}! Thank you for showing interest in {{2}}. Our sales team is ready to provide you with the best quote. Would you like a quick callback?',
    variables: ['Customer Name', 'Product / Service Name'],
    footerText: 'Reply YES for callback',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Request Callback 📞' },
      { type: 'QUICK_REPLY', text: 'View Catalog 🛍️' },
    ],
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  // SEND MODAL STATE
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<MessageTemplate | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [customHeaderMediaUrl, setCustomHeaderMediaUrl] = useState('');
  const [sendToAllLeads, setSendToAllLeads] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/templates');
      const payload = res?.data || res;
      if (Array.isArray(payload)) {
        setTemplates(payload);
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
      showToast(`Template "${tplName}" deleted successfully`);
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
        showToast('Template updated successfully!');
      } else {
        await api.post('/templates', payload);
        showToast('New template created successfully!');
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  };

  // OPEN SEND MODAL
  const openSendModal = (tpl: MessageTemplate) => {
    setSendingTemplate(tpl);
    setRecipientInput('');
    setCustomHeaderMediaUrl(tpl.headerMediaUrl || '');
    setSendToAllLeads(false);

    // Parse variables from body e.g. {{1}}, {{2}}
    const varMatches = tpl.body.match(/\{\{(\d+)\}\}/g) || [];
    const initialVals: Record<string, string> = {};
    varMatches.forEach((v) => {
      const num = v.replace(/\D/g, '');
      initialVals[num] = '';
    });

    if (tpl.variables && Array.isArray(tpl.variables)) {
      tpl.variables.forEach((vName, idx) => {
        initialVals[String(idx + 1)] = '';
        initialVals[vName] = '';
      });
    }

    setVariableValues(initialVals);
    setIsSendModalOpen(true);
  };

  // DISPATCH TEMPLATE VIA WHATSAPP
  const handleSendTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendingTemplate) return;

    if (!sendToAllLeads && !recipientInput.trim()) {
      alert('Please enter at least one recipient phone number (e.g. +919876543210)');
      return;
    }

    setIsSending(true);
    try {
      const res: any = await api.post(`/templates/${sendingTemplate.id}/send`, {
        recipients: recipientInput.trim(),
        variableValues,
        headerMediaUrl: customHeaderMediaUrl.trim() || undefined,
        sendToAllLeads,
      });

      const data = res?.data || res;
      showToast(data?.message || 'WhatsApp template dispatched successfully!');
      setIsSendModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to send template');
    } finally {
      setIsSending(false);
    }
  };

  // Compute live rendered preview text for send modal
  const getRenderedSendPreview = () => {
    if (!sendingTemplate) return '';
    let rendered = sendingTemplate.body;
    for (let i = 1; i <= 10; i++) {
      const val = variableValues[String(i)];
      if (val) {
        rendered = rendered.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), val);
      }
    }
    return rendered;
  };

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
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1.5">
            <Sparkles className="w-4 h-4" /> Official WhatsApp Cloud API &amp; Multi-Device
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            WhatsApp Message Templates
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Design, preview, and send custom message templates with dynamic variable tags (<code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded">{'{{1}}'}</code>), call-to-action buttons, and instant WhatsApp delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={openNewModal}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Custom Template</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or keywords..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Templates Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No message templates match your current filter. Try searching for something else or create a custom template.
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 shadow-md"
          >
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((t: MessageTemplate) => {
            const isStarter = !t.id;
            return (
              <div
                key={t.id || t.name}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700">
                        {t.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {t.language?.toUpperCase() || 'EN'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Ready to Send
                    </span>
                  </div>

                  {/* Template Name */}
                  <h3 className="text-sm font-bold text-white tracking-tight font-mono truncate">
                    {t.name}
                  </h3>

                  {/* WhatsApp Message Bubble Simulation */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 relative">
                    {/* Header preview if present */}
                    {t.headerType === 'TEXT' && t.headerText && (
                      <p className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1">
                        {t.headerText}
                      </p>
                    )}

                    {t.headerType === 'IMAGE' && (
                      <div className="h-24 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800 overflow-hidden">
                        {t.headerMediaUrl ? (
                          <img
                            src={t.headerMediaUrl}
                            alt="Header Flyer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center gap-1 text-[11px]">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Attached Image / Flyer</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Body with highlighted variables */}
                    <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                      {t.body}
                    </p>

                    {/* Footer text */}
                    {t.footerText && (
                      <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-900">
                        {t.footerText}
                      </p>
                    )}

                    {/* Action Buttons preview */}
                    {t.buttons && t.buttons.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-1">
                        {t.buttons.map((btn, idx) => (
                          <div
                            key={idx}
                            className="text-center py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1.5"
                          >
                            {btn.type === 'URL' && <ExternalLink className="w-3 h-3 text-emerald-400" />}
                            {btn.type === 'PHONE_NUMBER' && <PhoneCall className="w-3 h-3 text-emerald-400" />}
                            <span>{btn.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Variables badges */}
                  {t.variables && t.variables.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="text-[10px] text-slate-500 font-semibold mr-1">Variables:</span>
                      {t.variables.map((v, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {v.startsWith('{{') ? v : `{{${i + 1}}}: ${v}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyBody(t.id || t.name, t.body)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      title="Copy template text"
                    >
                      {copiedId === (t.id || t.name) ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {!isStarter && (
                      <>
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Edit template"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* PRIMARY ACTION: SEND TEMPLATE NOW */}
                  <button
                    onClick={() => (isStarter ? loadStarterTemplate(t) : openSendModal(t))}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isStarter ? 'Customize & Save' : 'Send Template'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: SEND TEMPLATE TO CUSTOM RECIPIENTS */}
      {isSendModalOpen && sendingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Send WhatsApp Template: <span className="font-mono text-emerald-400">{sendingTemplate.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dispatch to custom phone numbers, existing customers, or all leads.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSendModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendTemplate} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: Inputs */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Recipient Mode Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Select Recipients:
                    </label>

                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sendMode"
                          checked={!sendToAllLeads}
                          onChange={() => setSendToAllLeads(false)}
                          className="accent-emerald-500"
                        />
                        <span>Custom Phone Numbers</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sendMode"
                          checked={sendToAllLeads}
                          onChange={() => setSendToAllLeads(true)}
                          className="accent-emerald-500"
                        />
                        <span>Broadcast to All Captured Leads</span>
                      </label>
                    </div>

                    {!sendToAllLeads ? (
                      <div>
                        <textarea
                          rows={2}
                          value={recipientInput}
                          onChange={(e) => setRecipientInput(e.target.value)}
                          placeholder="e.g. +919876543210, +919811223344 (comma or newline separated)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required={!sendToAllLeads}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Enter country code with + (e.g. <span className="font-mono text-emerald-400">+919876543210</span>).
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Will automatically dispatch this template to all active leads in your pipeline!</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Variables Form Fields */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Custom Variable Values:
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold">Live Real-time Preview</span>
                    </div>

                    {/* Generate input for each variable */}
                    {Object.keys(variableValues).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">This template has no dynamic variable tags.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {Object.keys(variableValues)
                          .filter((k) => /^\d+$/.test(k)) // Only numbered keys
                          .map((keyNum) => (
                            <div key={keyNum} className="flex items-center gap-2">
                              <span className="w-14 text-center py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400">
                                {`{{${keyNum}}}`}
                              </span>
                              <input
                                type="text"
                                value={variableValues[keyNum] || ''}
                                onChange={(e) =>
                                  setVariableValues({ ...variableValues, [keyNum]: e.target.value })
                                }
                                placeholder={`Value for variable ${keyNum} (e.g. Rahul, 20% OFF)`}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Header Image Override */}
                  <div className="pt-2 border-t border-slate-800">
                    <ImageUploader
                      value={customHeaderMediaUrl}
                      onChange={setCustomHeaderMediaUrl}
                      label="Header Image / Flyer Attachment (Optional)"
                      description="Upload a flyer from your computer or paste an image URL to send with this template."
                    />
                  </div>
                </div>

                {/* Right: Live Real-time WhatsApp Preview */}
                <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        Live WhatsApp Chat Preview
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    {/* Simulated Phone Bubble */}
                    <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 shadow-inner space-y-2 text-xs">
                      {/* Optional Image */}
                      {customHeaderMediaUrl && (
                        <div className="h-32 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                          <img
                            src={customHeaderMediaUrl}
                            alt="Flyer Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Header Text */}
                      {sendingTemplate.headerType === 'TEXT' && sendingTemplate.headerText && (
                        <p className="font-bold text-emerald-400 border-b border-slate-800 pb-1">
                          {sendingTemplate.headerText}
                        </p>
                      )}

                      {/* Rendered Text */}
                      <p className="text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {getRenderedSendPreview()}
                      </p>

                      {/* Footer */}
                      {sendingTemplate.footerText && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-900">
                          {sendingTemplate.footerText}
                        </p>
                      )}

                      {/* Buttons */}
                      {sendingTemplate.buttons && sendingTemplate.buttons.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1">
                          {sendingTemplate.buttons.map((btn, i) => (
                            <div
                              key={i}
                              className="text-center py-1.5 bg-[#111b21] border border-slate-800 rounded-lg text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1"
                            >
                              <span>{btn.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dispatch Notice */}
                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Dispatches directly via connected WhatsApp session and logs in Inbox.</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4 stroke-[3]" />
                  <span>{isSending ? 'Dispatching WhatsApp...' : 'Send WhatsApp Template Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingId ? 'Edit Message Template' : 'Create New WhatsApp Template'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customize message body, variable tags, headers, and quick reply buttons.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Fields */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Template Name:
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. flash_sale_discount"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Category:
                      </label>
                      <select
                        value={category}
                        onChange={(e: any) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="MARKETING">Marketing &amp; Promotions</option>
                        <option value="UTILITY">Utility &amp; Order Updates</option>
                        <option value="AUTHENTICATION">Authentication / OTP</option>
                      </select>
                    </div>
                  </div>

                  {/* Header Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Header Type:
                    </label>
                    <div className="flex items-center gap-3 text-xs">
                      {(['NONE', 'TEXT', 'IMAGE'] as const).map((h) => (
                        <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="headerType"
                            checked={headerType === h}
                            onChange={() => setHeaderType(h)}
                            className="accent-emerald-500"
                          />
                          <span>{h}</span>
                        </label>
                      ))}
                    </div>

                    {headerType === 'TEXT' && (
                      <input
                        type="text"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Header Title (e.g. 🌟 Exclusive VIP Offer)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    )}

                    {headerType === 'IMAGE' && (
                      <ImageUploader
                        value={headerMediaUrl}
                        onChange={setHeaderMediaUrl}
                        label="Template Header Flyer"
                        description="Upload a promo banner or flyer (Max 5MB • JPG, PNG, WEBP)."
                      />
                    )}
                  </div>

                  {/* Message Body with Variable Helper */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Message Body:
                      </label>
                      <button
                        type="button"
                        onClick={insertVariable}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Insert Variable tag</span>
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Hi {{1}}, thank you for contacting us! Your order #{{2}} is confirmed."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                    <p className="text-[11px] text-slate-400">
                      Use <code className="text-emerald-400 font-mono">{'{{1}}'}</code>, <code className="text-emerald-400 font-mono">{'{{2}}'}</code> for customer name, order number, discounts, etc.
                    </p>
                  </div>

                  {/* Footer Text */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Footer Text (Optional):
                    </label>
                    <input
                      type="text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="e.g. Reply STOP to unsubscribe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Call-to-action buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Quick Action Buttons:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={button1Text}
                        onChange={(e) => setButton1Text(e.target.value)}
                        placeholder="Button 1 (URL) Text"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <input
                        type="url"
                        value={button1Url}
                        onChange={(e) => setButton1Url(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <input
                      type="text"
                      value={button2Text}
                      onChange={(e) => setButton2Text(e.target.value)}
                      placeholder="Button 2 (Quick Reply) Text e.g. Chat with Us 💬"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        Real-Time Mobile Simulation
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 shadow-inner space-y-2 text-xs">
                      {headerType === 'IMAGE' && headerMediaUrl && (
                        <div className="h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                          <img
                            src={headerMediaUrl}
                            alt="Header Flyer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {headerType === 'TEXT' && headerText && (
                        <p className="font-bold text-emerald-400 border-b border-slate-800 pb-1">
                          {headerText}
                        </p>
                      )}

                      <p className="text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {body || 'Type your message body on the left to see live preview...'}
                      </p>

                      {footerText && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-900">
                          {footerText}
                        </p>
                      )}

                      {(button1Text || button2Text) && (
                        <div className="pt-2 border-t border-slate-800 space-y-1">
                          {button1Text && (
                            <div className="text-center py-1.5 bg-[#111b21] border border-slate-800 rounded-lg text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              <span>{button1Text}</span>
                            </div>
                          )}
                          {button2Text && (
                            <div className="text-center py-1.5 bg-[#111b21] border border-slate-800 rounded-lg text-[11px] font-semibold text-emerald-400">
                              <span>{button2Text}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-4 text-center">
                    Compliant with Meta WhatsApp Cloud API format specifications.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingId ? 'Save Changes' : 'Create Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
