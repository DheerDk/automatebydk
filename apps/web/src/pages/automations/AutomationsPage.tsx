import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AutomationRule } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  Zap,
  Plus,
  Power,
  Trash2,
  Clock,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  Bot,
  MapPin,
  ShoppingBag,
  Tag,
  UserCheck,
  ChevronRight,
  Layers,
  FileText,
  Smartphone,
  Send,
  HelpCircle,
  Play,
  Flame,
  Check,
} from 'lucide-react';

interface RecipeTemplate {
  id: string;
  name: string;
  category: string;
  icon: any;
  color: string;
  description: string;
  trigger: string;
  keyword: string;
  replyText: string;
  tags: string[];
  leadStatus?: string;
}

export const AutomationsPage: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'builder' | 'recipes'>('workflows');

  // Builder State
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('KEYWORD_MATCH');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(['5', 'location', 'address', 'map']);
  const [replyText, setReplyText] = useState(
    '📍 *Our Store Location & Hours:*\n🏢 StyleHub Store, 102 MG Road, Bangalore\n🗺️ Map: https://maps.google.com/?q=StyleHub\n⏰ Open: Mon–Sat (10:00 AM – 9:00 PM)'
  );
  const [actionTag, setActionTag] = useState('Location-Lead');
  const [createLead, setCreateLead] = useState(true);
  const [leadStatus, setLeadStatus] = useState('INTERESTED');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-built One-Click Recipes
  const recipes: RecipeTemplate[] = [
    {
      id: 'rec_location',
      name: 'Option 5: Store Location & Timings Bot',
      category: 'Store Info',
      icon: MapPin,
      color: 'from-amber-500 to-orange-500',
      description: 'Replies with store address, Google Maps GPS link, and operating hours whenever customer sends 5 or asks for location.',
      trigger: 'KEYWORD_MATCH',
      keyword: '5, location, address, map, store, where',
      replyText:
        '📍 *Our Store Location & Timings:*\n🏢 102 Fashion Boulevard, Commercial Street, Bangalore\n🗺️ Google Maps: https://maps.google.com/?q=StyleHub\n⏰ Hours: Mon-Sat (10:00 AM - 09:00 PM)\n📞 Contact: +91 98765 43210',
      tags: ['Store-Visit-Enquiry'],
      leadStatus: 'INTERESTED',
    },
    {
      id: 'rec_order',
      name: 'Option 6: Instant Online Order & Checkout',
      category: 'Sales & Orders',
      icon: ShoppingBag,
      color: 'from-emerald-500 to-teal-500',
      description: 'Sends direct website catalog links, WhatsApp order steps, and supported payment methods for number 6 or order requests.',
      trigger: 'KEYWORD_MATCH',
      keyword: '6, order, buy, cart, order now, checkout',
      replyText:
        '🛒 *Place Your Order in 2 Easy Steps:*\n1. Browse catalog: https://stylehub.com/shop\n2. Or reply here with the item name, color & size!\n\n💳 *Payment:* UPI, Cards, Net Banking & Cash on Delivery (COD)',
      tags: ['Hot-Buyer', 'WhatsApp-Order'],
      leadStatus: 'NEGOTIATION',
    },
    {
      id: 'rec_discount',
      name: 'Option 7: VIP 15% Discount Voucher Flow',
      category: 'Lead Capture',
      icon: Tag,
      color: 'from-purple-500 to-indigo-500',
      description: 'Captures hot prospects by issuing an exclusive 15% discount code and moving them directly into the sales CRM pipeline.',
      trigger: 'KEYWORD_MATCH',
      keyword: '7, discount, coupon, offer, promo, voucher, deal',
      replyText:
        '🎉 *VIP 15% Discount Voucher Unlocked!*\nUse promo code *STYLE15* on your order today.\n✨ Reply with your selected item name now to reserve your piece at discounted price!',
      tags: ['VIP-Coupon-Claimed'],
      leadStatus: 'INTERESTED',
    },
    {
      id: 'rec_catalog',
      name: 'Option 8: PDF Catalog Download Flow',
      category: 'Content',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      description: 'Delivers full seasonal collection lookbook PDF link instantly to prospective buyers.',
      trigger: 'KEYWORD_MATCH',
      keyword: '8, catalog, catalogue, pdf, lookbook, brochure',
      replyText:
        '📄 *Download Our 2026 Collection Catalog (PDF):*\n👉 https://stylehub.com/catalog.pdf\n\nTake a look and reply with the product code to order instantly!',
      tags: ['Catalog-Downloaded'],
      leadStatus: 'NEW',
    },
    {
      id: 'rec_support',
      name: 'Option 4: Live Human Support Escalation',
      category: 'Customer Care',
      icon: UserCheck,
      color: 'from-rose-500 to-pink-500',
      description: 'Immediately disables bot auto-replies, alerts your team on dashboard, and connects human agent.',
      trigger: 'KEYWORD_MATCH',
      keyword: '4, human, agent, support, talk to person, representative, call',
      replyText:
        '🧑‍💼 *Connecting with our Store Support Team!*\nA customer executive has been notified and will reply to you directly in this chat shortly.',
      tags: ['Support-Requested'],
      leadStatus: 'FOLLOW_UP',
    },
    {
      id: 'rec_inactivity',
      name: 'Smart 24-Hour Abandoned Inactivity Follow-up',
      category: 'Re-engagement',
      icon: Clock,
      color: 'from-amber-600 to-red-500',
      description: 'Automatically sends a friendly check-in message after 24 hours of customer inactivity.',
      trigger: 'NO_RESPONSE',
      keyword: '',
      replyText:
        '👋 Hi {{name}}, we noticed you were browsing our collection yesterday. Can we help you with any sizes, colors, or special offers today?',
      tags: ['24h-Followup-Sent'],
      leadStatus: 'FOLLOW_UP',
    },
  ];

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/automations');
      if (res.data) setRules(res.data);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (rule: AutomationRule) => {
    try {
      await api.put(`/automations/${rule.id}`, { isActive: !rule.isActive });
      fetchRules();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation workflow?')) return;
    try {
      await api.delete(`/automations/${id}`);
      fetchRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    if (!keywordInput.trim()) return;

    const newKws = keywordInput
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k && !keywords.includes(k));

    setKeywords([...keywords, ...newKws]);
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((k) => k !== kwToRemove));
  };

  const loadRecipeIntoBuilder = (recipe: RecipeTemplate) => {
    setName(recipe.name);
    setTrigger(recipe.trigger);
    setKeywords(recipe.keyword ? recipe.keyword.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean) : []);
    setReplyText(recipe.replyText);
    setActionTag(recipe.tags[0] || 'Automation-Lead');
    setLeadStatus(recipe.leadStatus || 'INTERESTED');
    setCreateLead(true);
    setSelectedRuleId(null);
    setActiveTab('builder');
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    setIsSaving(true);
    try {
      const actions: any[] = [{ type: 'SEND_MESSAGE', payload: { text: replyText } }];

      if (createLead) {
        actions.push({
          type: 'CREATE_LEAD',
          payload: {
            source: 'WORKFLOW_AUTOMATION',
            status: leadStatus,
            notes: `Generated from workflow: ${name}`,
          },
        });
      }

      if (actionTag.trim()) {
        actions.push({
          type: 'ADD_TAGS',
          payload: { tags: [actionTag.trim()] },
        });
      }

      const payload = {
        name,
        trigger,
        conditions: { keyword: keywords.join(', ') },
        actions,
        isActive: true,
      };

      if (selectedRuleId) {
        await api.put(`/automations/${selectedRuleId}`, payload);
      } else {
        await api.post('/automations', payload);
      }

      await fetchRules();
      setActiveTab('workflows');
      // Reset form
      setSelectedRuleId(null);
      setName('');
    } catch (err: any) {
      alert(err.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">WhatsApp Visual Workflow Studio</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build interactive menu responses, custom keyword bots, order workflows, and automated lead pipelines in minutes.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'workflows'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Workflows ({rules.length})</span>
          </button>
          <button
            onClick={() => {
              setSelectedRuleId(null);
              setName('New Custom Workflow');
              setActiveTab('builder');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'builder'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Visual Flow Builder</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'recipes'
                ? 'bg-white text-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-built Recipes</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE WORKFLOWS */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Your Active Automated Workflows</h2>
            <button
              onClick={() => setActiveTab('recipes')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>Explore Pre-built Menu Recipes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {rules.length === 0 && !isLoading && (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No automation workflows created yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start with our pre-built 1-click recipes (Location, Orders, VIP Discounts) or build your custom workflow from scratch.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('recipes')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20"
                >
                  Browse Menu Recipes
                </button>
                <button
                  onClick={() => {
                    setSelectedRuleId(null);
                    setActiveTab('builder');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Open Visual Builder
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rules.map((rule) => {
              let conditions: any = {};
              try {
                conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions || {};
              } catch {
                conditions = {};
              }

              let actions: any[] = [];
              try {
                actions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions || [];
              } catch {
                actions = [];
              }

              const keywordDisplay = conditions.keyword || 'All messages';
              const replyMsg = actions[0]?.payload?.text || 'Automated action';

              return (
                <div
                  key={rule.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Status & Trigger Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/60 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-500" />
                        {rule.trigger}
                      </span>
                      <button
                        onClick={() => toggleRule(rule)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{rule.isActive ? 'Active' : 'Paused'}</span>
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {rule.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {rule.description || 'Configured WhatsApp Flow'}
                      </p>
                    </div>

                    {/* Visual Flow Mini Node Diagram */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2.5 text-xs">
                      {/* Trigger Node */}
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Bot className="w-3 h-3" />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">When Customer Says:</span>
                          <span className="font-semibold text-slate-800 text-[11px] truncate block bg-white px-1.5 py-0.5 rounded border border-slate-200/60">
                            {keywordDisplay}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center py-0.5 text-slate-300">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </div>

                      {/* Action Node */}
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-3 h-3" />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Bot Reply Message:</span>
                          <span className="text-slate-700 text-[11px] truncate block font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200/60">
                            {replyMsg.substring(0, 45)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Executions</span>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {rule.executionCount} triggers
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedRuleId(rule.id);
                        setName(rule.name);
                        setTrigger(rule.trigger);
                        setKeywords(
                          conditions.keyword
                            ? String(conditions.keyword)
                                .split(',')
                                .map((k) => k.trim())
                                .filter(Boolean)
                            : []
                        );
                        setReplyText(replyMsg);
                        setActiveTab('builder');
                      }}
                      className="text-xs text-slate-700 hover:text-emerald-600 font-bold flex items-center gap-1"
                    >
                      <span>Edit Workflow</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL WORKFLOW BUILDER */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Middle: Visual Step-by-Step Flow Canvas */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveWorkflow} className="space-y-5">
              {/* Workflow Name Bar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Option 5 - Store Location & GPS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* NODE 1: TRIGGER */}
              <div className="bg-white p-6 rounded-3xl border-2 border-emerald-500/30 shadow-sm relative space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">TRIGGER: When This Happens</h3>
                    <p className="text-[11px] text-slate-500">Define what customer action starts this automation workflow.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setTrigger('KEYWORD_MATCH')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      trigger === 'KEYWORD_MATCH'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Keyword / Number Match</span>
                      {trigger === 'KEYWORD_MATCH' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Customer types a menu number (e.g. 5, 6) or specific words.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrigger('GREETING')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      trigger === 'GREETING'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Greeting / First Message</span>
                      {trigger === 'GREETING' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Customer texts Hi, Hello, Start or opens a new chat.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrigger('NO_RESPONSE')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      trigger === 'NO_RESPONSE'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">24h Customer Inactivity</span>
                      {trigger === 'NO_RESPONSE' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Customer asked something but went idle for 24 hours.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrigger('MESSAGE_RECEIVED')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      trigger === 'MESSAGE_RECEIVED'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Every Inbound Message</span>
                      {trigger === 'MESSAGE_RECEIVED' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Triggers on every single message received.</p>
                  </button>
                </div>

                {/* Keywords Chips Box */}
                {trigger === 'KEYWORD_MATCH' && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Trigger Keywords & Numbers</label>
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-slate-400 hover:text-red-500 text-xs font-black"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Type keyword & press Enter..."
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleAddKeyword}
                          className="bg-transparent border-none text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 min-w-[160px]"
                        />
                        <button
                          type="button"
                          onClick={handleAddKeyword}
                          className="text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      💡 Tip: Add both numbers and natural words (e.g. <span className="font-mono text-slate-600">5, location, map, address</span>).
                    </p>
                  </div>
                )}
              </div>

              {/* CONNECTOR LINE */}
              <div className="flex justify-center -my-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>

              {/* NODE 2: ACTION */}
              <div className="bg-white p-6 rounded-3xl border-2 border-blue-500/30 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">ACTION: Send WhatsApp Reply Message</h3>
                    <p className="text-[11px] text-slate-500">
                      Craft the response sent to the customer's WhatsApp instantly.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">WhatsApp Message Content</label>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>Dynamic tags:</span>
                      <button
                        type="button"
                        onClick={() => setReplyText((prev) => prev + ' {{name}}')}
                        className="font-mono bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded text-slate-700"
                      >
                        &#123;&#123;name&#125;&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyText((prev) => prev + ' {{phone}}')}
                        className="font-mono bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded text-slate-700"
                      >
                        &#123;&#123;phone&#125;&#125;
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your WhatsApp message response..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-sans transition-all leading-relaxed"
                  />
                </div>

                {/* Additional Action Pipeline: Tags & CRM */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Add Customer CRM Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Store-Inquiry, VIP"
                      value={actionTag}
                      onChange={(e) => setActionTag(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Move Lead Pipeline Stage</label>
                    <select
                      value={leadStatus}
                      onChange={(e) => setLeadStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="NEW">New Lead</option>
                      <option value="INTERESTED">Interested</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                      <option value="NEGOTIATION">Negotiation</option>
                      <option value="CONVERTED">Converted / Paid</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit / Save Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('workflows')}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2.5 rounded-2xl text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>{isSaving ? 'Saving Workflow...' : selectedRuleId ? 'Update Workflow' : 'Publish Automation'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Interactive WhatsApp Device Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6">
              <div className="bg-slate-900 rounded-[36px] p-4 shadow-2xl border-4 border-slate-800 text-white max-w-sm mx-auto">
                {/* Phone Notch & Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-3 text-[11px] text-slate-400">
                  <span className="font-semibold text-white">WhatsApp</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Live Preview</span>
                  </div>
                </div>

                {/* WhatsApp Chat Header */}
                <div className="bg-emerald-800/80 backdrop-blur p-3 rounded-2xl flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-full bg-white text-emerald-900 flex items-center justify-center font-bold text-xs">
                    {currentOrganization?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{currentOrganization?.name || 'StyleHub Fashion'}</h4>
                    <p className="text-[10px] text-emerald-200">Official Business Bot</p>
                  </div>
                </div>

                {/* Chat Bubbles */}
                <div className="space-y-3 min-h-[300px] flex flex-col justify-end p-2 bg-[#0b141a]/60 rounded-2xl">
                  {/* Customer Trigger Message */}
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-xs text-xs max-w-[80%] shadow-xs">
                      <p>{keywords[0] || '5'}</p>
                      <span className="text-[9px] text-emerald-300/80 block text-right mt-1">Just now</span>
                    </div>
                  </div>

                  {/* Automated Bot Reply */}
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] text-white p-3 rounded-2xl rounded-tl-xs text-xs max-w-[90%] shadow-xs whitespace-pre-wrap leading-relaxed">
                      {replyText.replace('{{name}}', 'Rahul').replace('{{phone}}', '+91 98765 43210') ||
                        'Type your message above to see preview here...'}
                      <span className="text-[9px] text-slate-400 block text-right mt-1">Just now</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center text-[10px] text-slate-400">
                  ⚡ Updates in real-time as you edit the workflow!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRE-BUILT RECIPES LIBRARY */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pre-built WhatsApp Menu & Growth Recipes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Install ready-to-use business automations in 1 click. You can customize the text, discounts, and links anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((rec) => {
              const IconComp = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${rec.color} text-white shadow-md`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {rec.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {rec.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rec.description}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="text-[11px] text-slate-600">
                        <span className="font-bold text-slate-400 uppercase text-[10px] block">Trigger Keywords:</span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
                          {rec.keyword || 'Inactivity Timer (24h)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => loadRecipeIntoBuilder(rec)}
                      className="w-full bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use This Recipe</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
