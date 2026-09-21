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
  GitBranch,
  Shield,
  UserX,
  Sliders,
  X,
  Split,
  Settings2,
  RotateCcw,
  Sparkle,
  PhoneCall,
  Info,
  Edit3,
  Globe
} from 'lucide-react';

interface FlowBranch {
  id: string;
  conditionType: 'EQUALS' | 'CONTAINS' | 'NUMBER_CHOICE';
  value: string; // e.g. "1", "price", "order"
  title: string;
  actions: {
    type: 'SEND_MESSAGE' | 'SEND_CATALOG' | 'SEND_LOCATION' | 'SEND_WEBSITE' | 'CREATE_LEAD' | 'ADD_TAGS' | 'HUMAN_HANDOFF';
    text?: string;
    url?: string;
    address?: string;
    leadStatus?: string;
    tags?: string[];
  }[];
}

interface VisualFlowData {
  triggerKeyword: string;
  triggerType: string;
  branches: FlowBranch[];
  defaultAction: {
    type: 'SEND_MESSAGE' | 'AI_FALLBACK' | 'HUMAN_HANDOFF';
    text?: string;
  };
}

export const AutomationsPage: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'flow_builder' | 'recipes' | 'privacy'>('flow_builder');

  // Privacy & Excluded Contacts State
  const [onlyUnsavedContacts, setOnlyUnsavedContacts] = useState(false);
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([]);
  const [newExcludedInput, setNewExcludedInput] = useState('');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  // Visual Flow Builder State
  const [flowName, setFlowName] = useState('Smart Store Welcome & Branching Menu');
  const [triggerKeyword, setTriggerKeyword] = useState('hi, hello, menu, start, 1, 2, 3, 4, 5');
  const [branches, setBranches] = useState<FlowBranch[]>([
    {
      id: 'b1',
      conditionType: 'NUMBER_CHOICE',
      value: '1',
      title: 'Option 1: Browse Products',
      actions: [
        {
          type: 'SEND_CATALOG',
          text: '🛍️ Here are our top trending products from the store catalog:',
        },
        {
          type: 'CREATE_LEAD',
          leadStatus: 'INTERESTED',
        },
        {
          type: 'ADD_TAGS',
          tags: ['Browsed-Catalog'],
        },
      ],
    },
    {
      id: 'b2',
      conditionType: 'NUMBER_CHOICE',
      value: '2',
      title: 'Option 2: Search a Product',
      actions: [
        {
          type: 'SEND_MESSAGE',
          text: '🔍 *Product Search:* Reply with the name of the product, model, or color you are looking for (e.g. "iPhone 15 Pro" or "Black T-Shirt") and our AI will find it for you!',
        },
        {
          type: 'ADD_TAGS',
          tags: ['Search-Intent'],
        },
      ],
    },
    {
      id: 'b3',
      conditionType: 'NUMBER_CHOICE',
      value: '3',
      title: 'Option 3: Offers & Deals',
      actions: [
        {
          type: 'SEND_MESSAGE',
          text: '🏷️ *Exclusive WhatsApp VIP Offer!*\nGet *Flat 15% OFF* on all purchases today using code: *DKVIP15*.\n\n✨ Reply with your selected item to claim this offer before stock runs out!',
        },
        {
          type: 'CREATE_LEAD',
          leadStatus: 'HOT',
        },
        {
          type: 'ADD_TAGS',
          tags: ['Hot-Offer-Lead'],
        },
      ],
    },
    {
      id: 'b4',
      conditionType: 'NUMBER_CHOICE',
      value: '4',
      title: 'Option 4: Talk to Support',
      actions: [
        {
          type: 'HUMAN_HANDOFF',
          text: '🧑‍💼 *Transferring to Support Manager...*\nOur live store manager has been notified and will message you directly in a moment! Please describe what you need help with.',
        },
      ],
    },
    {
      id: 'b5',
      conditionType: 'NUMBER_CHOICE',
      value: '5',
      title: 'Option 5: Store Location & Timings',
      actions: [
        {
          type: 'SEND_LOCATION',
          address: 'Main Commercial Boulevard, Store #42',
          text: '📍 *Store Location & Hours:*\n🏢 Main Commercial Boulevard, Store #42\n🗺️ GPS Map: https://maps.google.com/?q=Store\n⏰ Hours: Mon-Sat (10:00 AM - 9:00 PM)',
        },
        {
          type: 'ADD_TAGS',
          tags: ['Store-Visit-Enquiry'],
        },
      ],
    },
    {
      id: 'b6',
      conditionType: 'NUMBER_CHOICE',
      value: '6',
      title: 'Option 6: Visit Online Website',
      actions: [
        {
          type: 'SEND_WEBSITE',
          url: 'https://automatebydk.pages.dev',
          text: '🌐 *Visit Our Official Online Store:*\n🔗 https://automatebydk.pages.dev\n\n✨ Browse full catalog, check new arrivals, and place orders directly!',
        },
        {
          type: 'ADD_TAGS',
          tags: ['Website-Visitor'],
        },
      ],
    },
  ]);

  const [defaultAction, setDefaultAction] = useState<{
    type: 'SEND_MESSAGE' | 'AI_FALLBACK' | 'HUMAN_HANDOFF';
    text: string;
  }>({
    type: 'SEND_MESSAGE',
    text: '👋 *Welcome to AutoMate by DK!*\n\nTap a button below or reply with a number:\n1️⃣ 🛍️ Browse Trending Products\n2️⃣ 🔍 Search a Product\n3️⃣ 🏷️ Offers & Deals\n4️⃣ 🧑‍💼 Talk to Support\n5️⃣ 📍 Store Location & Hours\n6️⃣ 🌐 Visit Store Website',
  });

  const [activeBranchId, setActiveBranchId] = useState<string>('b1');
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [flowSaveSuccess, setFlowSaveSuccess] = useState(false);

  // Live Simulator State
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: '👋 *Welcome to AutoMate by DK!*\n\nReply with a number to choose an option:\n1️⃣ 🛍️ Browse Trending Products\n2️⃣ 🔍 Search a Product\n3️⃣ 🏷️ Offers & Deals\n4️⃣ 🧑‍💼 Talk to Support\n5️⃣ 📍 Store Location & Hours',
      time: 'Just now',
    },
  ]);
  const [simInput, setSimInput] = useState('');

  useEffect(() => {
    fetchRules();
    fetchPrivacySettings();
  }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/automations');
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrivacySettings = async () => {
    try {
      const res: any = await api.get('/settings');
      if (res.data?.settings) {
        setOnlyUnsavedContacts(Boolean(res.data.settings.onlyUnsavedContacts));
        if (res.data.settings.excludedNumbers) {
          const arr = res.data.settings.excludedNumbers
            .split(',')
            .map((n: string) => n.trim())
            .filter(Boolean);
          setExcludedNumbers(arr);
        }
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    }
  };

  const savePrivacySettings = async () => {
    setIsSavingPrivacy(true);
    setPrivacySuccess(false);
    try {
      await api.put('/settings/profile', {
        onlyUnsavedContacts,
        excludedNumbers: excludedNumbers.join(','),
      });
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy settings');
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const addExcludedNumber = () => {
    const val = newExcludedInput.trim();
    if (!val) return;
    if (!excludedNumbers.includes(val)) {
      setExcludedNumbers([...excludedNumbers, val]);
    }
    setNewExcludedInput('');
  };

  const removeExcludedNumber = (num: string) => {
    setExcludedNumbers(excludedNumbers.filter((n) => n !== num));
  };

  const handleSaveFlow = async () => {
    setIsSavingFlow(true);
    setFlowSaveSuccess(false);
    try {
      // Package flow into master automation rule
      const flowData = {
        triggerKeyword,
        branches,
        defaultAction,
      };

      // Create individual action nodes for backward compatibility
      const actionsList = branches.map((b) => ({
        type: 'BRANCH_NODE',
        keyword: b.value,
        title: b.title,
        actions: b.actions,
      }));

      await api.post('/automations', {
        name: flowName,
        trigger: 'KEYWORD_MATCH',
        conditions: JSON.stringify({ keyword: triggerKeyword }),
        actions: JSON.stringify(actionsList),
        flowData: JSON.stringify(flowData),
        isActive: true,
      });

      setFlowSaveSuccess(true);
      fetchRules();
      setTimeout(() => setFlowSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save ChatFlow');
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleSimSend = (textToSend?: string) => {
    const text = (textToSend || simInput).trim();
    if (!text) return;

    const newMsgs = [...simMessages, { sender: 'user' as const, text, time: 'Just now' }];
    setSimMessages(newMsgs);
    setSimInput('');

    // Simulate flow logic
    setTimeout(() => {
      const lower = text.toLowerCase();

      // Check if matches any branch
      const matchedBranch = branches.find((b) => {
        if (b.conditionType === 'NUMBER_CHOICE' || b.conditionType === 'EQUALS') {
          return lower === b.value.toLowerCase() || lower === `option ${b.value}` || lower === `${b.value}.`;
        }
        return lower.includes(b.value.toLowerCase());
      });

      if (matchedBranch) {
        let reply = '';
        matchedBranch.actions.forEach((act) => {
          if (act.type === 'SEND_MESSAGE') {
            reply = act.text || 'Action executed.';
          } else if (act.type === 'SEND_CATALOG') {
            reply = '🛍️ *Trending Catalog Products:*\n1. Premium Phone Case - ₹499\n2. Fast Wireless Charger 20W - ₹899\n3. Noise Cancelling Earbuds - ₹1,499\n\n👉 Tap an option below to order!';
          } else if (act.type === 'SEND_LOCATION') {
            reply = act.text || '📍 *Store Location & Timings:*\n🏢 Main Commercial Boulevard, Store #42\n🗺️ Google Maps: https://maps.google.com/?q=Store\n⏰ Hours: Mon-Sat (10:00 AM - 9:00 PM)';
          } else if (act.type === 'SEND_WEBSITE') {
            reply = act.text || '🌐 *Visit Our Official Online Store:*\n🔗 https://automatebydk.pages.dev\n\n✨ Browse full catalog, check new arrivals, and place orders directly!';
          } else if (act.type === 'HUMAN_HANDOFF') {
            reply = act.text || '🧑‍💼 Store manager has been alerted!';
          }
        });

        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: reply || `✅ Executed ${matchedBranch.title}`,
            time: 'Just now',
          },
        ]);
      } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('menu') || lower.includes('start')) {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: defaultAction.text,
            time: 'Just now',
          },
        ]);
      } else {
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🤖 I received "${text}". Please reply with a number (1, 2, 3, 4, 5) or type *Menu* to see available options!`,
            time: 'Just now',
          },
        ]);
      }
    }, 600);
  };

  const addBranch = () => {
    const newId = `b${Date.now()}`;
    const nextNum = branches.length + 1;
    const newBranch: FlowBranch = {
      id: newId,
      conditionType: 'NUMBER_CHOICE',
      value: String(nextNum),
      title: `Option ${nextNum}: Custom Branch`,
      actions: [
        {
          type: 'SEND_MESSAGE',
          text: `✨ Response for option ${nextNum}! Customize this message in the flow editor.`,
        },
      ],
    };
    setBranches([...branches, newBranch]);
    setActiveBranchId(newId);
  };

  const removeBranch = (id: string) => {
    if (branches.length <= 1) {
      alert('You must keep at least one branch.');
      return;
    }
    const filtered = branches.filter((b) => b.id !== id);
    setBranches(filtered);
    if (activeBranchId === id && filtered.length > 0) {
      setActiveBranchId(filtered[0].id);
    }
  };

  const selectedBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-2xl border border-emerald-500/20 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" /> Visual Automation Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ChatFlow & Automation Studio</h1>
          <p className="text-slate-300 text-sm mt-1">
            Build custom "If-This-Then-That" WhatsApp branching flows and protect personal contacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 border transition ${
              activeTab === 'privacy'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            Family & Privacy Filter
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('flow_builder')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'flow_builder'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Visual Flow Canvas
        </button>

        <button
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'workflows'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Rules ({rules.length})
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'privacy'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserX className="w-4 h-4" />
          Excluded Numbers ({excludedNumbers.length})
        </button>
      </div>

      {/* TAB 1: VISUAL FLOW BUILDER */}
      {activeTab === 'flow_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Interactive Node Canvas */}
          <div className="lg:col-span-8 space-y-6">
            {/* Flow Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Workflow Title
                  </label>
                  <input
                    type="text"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. VIP Retail Store Automation"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSaveFlow}
                    disabled={isSavingFlow}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isSavingFlow ? (
                      'Saving Flow...'
                    ) : flowSaveSuccess ? (
                      <>
                        <Check className="w-4 h-4" /> Saved Successfully!
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Save & Activate Flow
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Trigger Node */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" /> 1. Flow Trigger Node
                  </div>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
                    Incoming Message
                  </span>
                </div>
                <label className="text-xs text-slate-400 block mb-1">
                  Trigger on Customer Keywords / Numbers:
                </label>
                <input
                  type="text"
                  value={triggerKeyword}
                  onChange={(e) => setTriggerKeyword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="e.g. hi, hello, menu, start, 1, 2, 3, 4, 5"
                />
              </div>
            </div>

            {/* Visual Branch Nodes List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Split className="w-4 h-4 text-emerald-400" /> 2. "If-This-Then-That" Branching Options
                  </h3>
                  <p className="text-xs text-slate-400">
                    Each branch represents what happens when a customer sends a specific choice or word.
                  </p>
                </div>
                <button
                  onClick={addBranch}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Branch Option
                </button>
              </div>

              {/* Branch Selector Tabs */}
              <div className="flex flex-wrap gap-2 pt-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBranchId(b.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                      activeBranchId === b.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900/50 flex items-center justify-center text-[10px] font-bold">
                      {b.value}
                    </span>
                    {b.title}
                  </button>
                ))}
              </div>

              {/* Active Branch Configuration Card */}
              {selectedBranch && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mt-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {selectedBranch.value}
                      </span>
                      <input
                        type="text"
                        value={selectedBranch.title}
                        onChange={(e) => {
                          const updated = branches.map((b) =>
                            b.id === selectedBranch.id ? { ...b, title: e.target.value } : b
                          );
                          setBranches(updated);
                        }}
                        className="bg-transparent text-white font-bold text-sm focus:outline-none border-b border-dashed border-slate-700 hover:border-emerald-500 focus:border-emerald-500 px-1 py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400">Match Choice:</label>
                      <input
                        type="text"
                        value={selectedBranch.value}
                        onChange={(e) => {
                          const updated = branches.map((b) =>
                            b.id === selectedBranch.id ? { ...b, value: e.target.value } : b
                          );
                          setBranches(updated);
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-center font-mono text-xs text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {branches.length > 1 && (
                        <button
                          onClick={() => removeBranch(selectedBranch.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition"
                          title="Delete Branch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions in this branch */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
                      Actions executed when customer chooses "{selectedBranch.value}":
                    </label>

                    {/* Action 1: Response Message */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <MessageSquare className="w-3.5 h-3.5" /> Action: WhatsApp Reply Message
                        </div>
                        <select
                          value={selectedBranch.actions[0]?.type || 'SEND_MESSAGE'}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const acts = [...b.actions];
                                acts[0] = { ...acts[0], type: newType };
                                return { ...b, actions: acts };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="SEND_MESSAGE">💬 Send Text Message</option>
                          <option value="SEND_CATALOG">🛍️ Send Product Catalog</option>
                          <option value="SEND_LOCATION">📍 Send Store Location (Google Maps Pin)</option>
                          <option value="SEND_WEBSITE">🌐 Send Official Store Website Link</option>
                          <option value="HUMAN_HANDOFF">🧑‍💼 Transfer to Support Manager</option>
                        </select>
                      </div>

                      {selectedBranch.actions[0]?.type === 'SEND_LOCATION' ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-slate-950/60 border border-emerald-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span>
                              Sends store address, opening hours, Google Maps GPS link, and a native WhatsApp Location Pin.
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={selectedBranch.actions[0]?.text || ''}
                            onChange={(e) => {
                              const updated = branches.map((b) => {
                                if (b.id === selectedBranch.id) {
                                  const acts = [...b.actions];
                                  acts[0] = { ...acts[0], text: e.target.value };
                                  return { ...b, actions: acts };
                                }
                                return b;
                              });
                              setBranches(updated);
                            }}
                            placeholder="Store address and directions..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-sans focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                          />
                        </div>
                      ) : selectedBranch.actions[0]?.type === 'SEND_WEBSITE' ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-slate-950/60 border border-blue-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span>
                              Delivers direct website catalog link with preview and shopping instructions.
                            </span>
                          </div>
                          <input
                            type="text"
                            value={selectedBranch.actions[0]?.url || 'https://automatebydk.pages.dev'}
                            onChange={(e) => {
                              const updated = branches.map((b) => {
                                if (b.id === selectedBranch.id) {
                                  const acts = [...b.actions];
                                  acts[0] = { ...acts[0], url: e.target.value };
                                  return { ...b, actions: acts };
                                }
                                return b;
                              });
                              setBranches(updated);
                            }}
                            placeholder="https://yourwebsite.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-blue-400 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      ) : selectedBranch.actions[0]?.type !== 'SEND_CATALOG' ? (
                        <textarea
                          rows={4}
                          value={selectedBranch.actions[0]?.text || ''}
                          onChange={(e) => {
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const acts = [...b.actions];
                                acts[0] = { ...acts[0], text: e.target.value };
                                return { ...b, actions: acts };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          placeholder="Type response text here... Use {{name}} for customer's name."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-sans focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                        />
                      ) : (
                        <div className="p-3 bg-slate-950/60 border border-dashed border-emerald-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>
                            Automatically pulls active products from your **Products** catalog with photo, price, and instant order instructions.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action 2: Lead CRM Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" /> Capture Lead in CRM:
                        </label>
                        <select
                          value={selectedBranch.actions.find((a) => a.type === 'CREATE_LEAD')?.leadStatus || 'INTERESTED'}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const existing = b.actions.filter((a) => a.type !== 'CREATE_LEAD');
                                existing.push({ type: 'CREATE_LEAD', leadStatus: newStatus });
                                return { ...b, actions: existing };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="NEW">🎯 New Inquirer</option>
                          <option value="INTERESTED">🔥 Interested Prospect</option>
                          <option value="HOT">⚡ Hot Deal Lead</option>
                          <option value="NEGOTIATION">💳 Checkout / Order Lead</option>
                        </select>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-400" /> Apply CRM Customer Tag:
                        </label>
                        <input
                          type="text"
                          value={selectedBranch.actions.find((a) => a.type === 'ADD_TAGS')?.tags?.[0] || 'Store-Lead'}
                          onChange={(e) => {
                            const newTag = e.target.value;
                            const updated = branches.map((b) => {
                              if (b.id === selectedBranch.id) {
                                const existing = b.actions.filter((a) => a.type !== 'ADD_TAGS');
                                existing.push({ type: 'ADD_TAGS', tags: [newTag] });
                                return { ...b, actions: existing };
                              }
                              return b;
                            });
                            setBranches(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="e.g. Catalog-Viewer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Default Greeting / Fallback Menu Node */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" /> 3. Default Welcome Greeting Menu (Sent for 'Hi' or Unrecognized Text)
                </h3>
              </div>
              <textarea
                rows={5}
                value={defaultAction.text}
                onChange={(e) => setDefaultAction({ ...defaultAction, text: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-sans focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Live Interactive WhatsApp Simulator */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Live Flow Simulator</h4>
                    <p className="text-[11px] text-slate-400">Test your chatbot in real-time</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setSimMessages([
                      {
                        sender: 'bot',
                        text: defaultAction.text,
                        time: 'Just now',
                      },
                    ])
                  }
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition text-xs flex items-center gap-1"
                  title="Reset Simulator"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chat Screen Mockup */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl h-[440px] flex flex-col justify-between overflow-hidden shadow-inner">
                {/* Header Mockup */}
                <div className="bg-slate-900 px-3.5 py-2.5 border-b border-slate-800 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                    DK
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">AutoMate by DK</p>
                    <p className="text-[10px] text-emerald-400 leading-none">🟢 online bot</p>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                  {simMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-3.5 py-2 whitespace-pre-wrap leading-relaxed shadow-md ${
                          m.sender === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                        }`}
                      >
                        {m.text}
                      </div>

                      {/* Render Interactive WhatsApp Clickable Action Buttons for Bot Message */}
                      {m.sender === 'bot' && idx === simMessages.length - 1 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 max-w-[95%]">
                          {branches.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => handleSimSend(b.value)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-[10px] font-bold rounded-xl border border-emerald-500/40 shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                            >
                              {b.actions[0]?.type === 'SEND_LOCATION' ? (
                                <MapPin className="w-3 h-3 text-emerald-400" />
                              ) : b.actions[0]?.type === 'SEND_WEBSITE' ? (
                                <Globe className="w-3 h-3 text-blue-400" />
                              ) : b.actions[0]?.type === 'SEND_CATALOG' ? (
                                <ShoppingBag className="w-3 h-3 text-amber-400" />
                              ) : b.actions[0]?.type === 'HUMAN_HANDOFF' ? (
                                <UserCheck className="w-3 h-3 text-purple-400" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                              )}
                              <span>{b.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Choice Buttons */}
                <div className="px-2 py-1.5 bg-slate-900/80 border-t border-slate-800 flex gap-1.5 overflow-x-auto">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSimSend(b.value)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 whitespace-nowrap transition"
                    >
                      Send {b.value}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSimSend('hi')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 whitespace-nowrap transition"
                  >
                    Send 'Hi'
                  </button>
                </div>

                {/* Input Bar */}
                <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimSend()}
                    placeholder="Type a message (e.g. 1, 2, hi)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleSimSend()}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-slate-300">
                <p className="font-semibold text-emerald-400 mb-0.5">💡 Tip:</p>
                Click any quick button above or type numbers (1 to {branches.length}) to test how customer flows execute live!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRIVACY & PERSONAL CONTACT FILTER */}
      {activeTab === 'privacy' && (
        <div className="max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Family & Personal Contact Protection</h2>
              <p className="text-xs text-slate-400">
                Ensure your personal family, friends, and staff never get disturbed by automated bot replies.
              </p>
            </div>
          </div>

          {/* Toggle 1: Only Unsaved Contacts */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Only Automate Unsaved Customer Numbers
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When enabled, the automation will **only respond to new / unsaved customer phone numbers**. Anyone already saved in your personal phone contact book will be completely ignored by the bot, allowing you to chat normally.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={onlyUnsavedContacts}
                onChange={(e) => setOnlyUnsavedContacts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Section 2: Excluded Numbers Blacklist */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-400" /> Excluded Phone Numbers Blacklist
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Add specific numbers (family members, personal friends, VIPs) that should **NEVER** receive automated replies under any circumstance.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newExcludedInput}
                onChange={(e) => setNewExcludedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExcludedNumber()}
                placeholder="Enter phone number (e.g. +919876543210 or 9876543210)"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={addExcludedNumber}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Number
              </button>
            </div>

            {/* List of excluded numbers tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {excludedNumbers.map((num) => (
                <span
                  key={num}
                  className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg shadow-sm font-mono"
                >
                  <PhoneCall className="w-3 h-3 text-red-400" />
                  {num}
                  <button
                    onClick={() => removeExcludedNumber(num)}
                    className="text-slate-400 hover:text-red-400 transition ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {excludedNumbers.length === 0 && (
                <p className="text-xs text-slate-500 italic">No numbers excluded yet.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {privacySuccess ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Privacy settings saved successfully!
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Changes take effect immediately on your live WhatsApp number.
              </span>
            )}

            <button
              onClick={savePrivacySettings}
              disabled={isSavingPrivacy}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {isSavingPrivacy ? 'Saving...' : 'Save Privacy Filters'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE RULES LIST */}
      {activeTab === 'workflows' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Active Automation Workflows</h2>
              <p className="text-xs text-slate-400">
                All automation rules currently running on your WhatsApp business account.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('flow_builder')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create New Flow
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="text-sm font-bold text-white">{r.name}</h4>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                      {r.trigger}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Executed: <span className="text-emerald-400 font-semibold">{r.executionCount}</span> times
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('flow_builder')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                  >
                    Edit Flow
                  </button>
                </div>
              </div>
            ))}

            {rules.length === 0 && !isLoading && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No custom automation rules created yet. Click **Create New Flow** to design your first flow!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
