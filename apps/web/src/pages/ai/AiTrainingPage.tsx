import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bot,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  Send,
  MessageSquare,
  Building2,
  Sliders,
  RotateCcw,
  BookOpen,
  Zap,
  Tag,
  Store,
  Stethoscope,
  Utensils,
  Dumbbell,
  Briefcase,
  Home,
  Check,
  AlertCircle,
  ChevronRight,
  User,
  ShieldCheck,
} from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
  category?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  intent?: string;
  matchedFaq?: string;
  sources?: string[];
  products?: any[];
  time: string;
}

export const AiTrainingPage: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { currency } = useTenant();

  const [activeTab, setActiveTab] = useState<'prompt' | 'faqs' | 'knowledge' | 'settings'>('prompt');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // AI Training Form State
  const [aiAutoReplyEnabled, setAiAutoReplyEnabled] = useState(true);
  const [aiTone, setAiTone] = useState('FRIENDLY');
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState('');
  const [aiFallbackMessage, setAiFallbackMessage] = useState(
    'I am sorry, I am not sure about that. Let me connect you with our store team!'
  );
  const [aiIncludeCatalog, setAiIncludeCatalog] = useState(true);
  const [customFaqs, setCustomFaqs] = useState<FaqItem[]>([]);

  // FAQ Add Form State
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqKeywords, setNewFaqKeywords] = useState('');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');

  // Interactive Live Chat Simulator State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: `👋 Hello! I am the trained AI assistant for ${currentOrganization?.name || 'this business'}. Ask me anything about our products, services, or policies to test my training!`,
      time: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);

  // Industry Presets
  const industryPresets = [
    {
      id: 'retail',
      name: 'Retail & E-commerce',
      icon: Store,
      tone: 'FRIENDLY',
      prompt: `You are the friendly WhatsApp sales assistant for our retail brand. 
Help customers find products, explain sizes, answer queries about stock, shipping, and return policies. 
Always encourage the customer to purchase by highlighting bestsellers, discounts, and free shipping benefits.`,
      knowledge: `• All orders are dispatched within 24 hours.
• Express shipping available across major metro cities in 24-48 hours.
• Cash on Delivery (COD) available with verified OTP.
• Size exchanges are 100% free within 7 days of delivery.`,
      sampleFaqs: [
        {
          id: 'f1',
          question: 'Do you offer Cash on Delivery (COD)?',
          answer: 'Yes! We offer Cash on Delivery (COD) on all orders above ₹499 across 19,000+ pincodes in India.',
          keywords: ['cod', 'cash on delivery', 'pay on delivery', 'cash'],
        },
        {
          id: 'f2',
          question: 'How do I track my order?',
          answer: 'Once your order is shipped, you will receive a WhatsApp tracking link with real-time live tracking from BlueDart / Delhivery.',
          keywords: ['track', 'where is order', 'tracking link', 'courier status'],
        },
      ],
    },
    {
      id: 'clinic',
      name: 'Clinic & Healthcare',
      icon: Stethoscope,
      tone: 'PROFESSIONAL',
      prompt: `You are the courteous healthcare appointment assistant for our clinic.
Help patients with consultation timings, doctor specialties, clinic address, and booking appointment slots.
Never prescribe medicines or provide direct medical diagnosis. Always instruct patients in emergencies to visit the nearest hospital.`,
      knowledge: `• Clinic Consultation Hours: Monday to Saturday 09:00 AM - 08:00 PM. Sunday: Emergency only.
• General Physician Consultation: ₹500. Specialist Consultation: ₹800.
• Digital reports sent via WhatsApp within 4 hours.
• Advance appointment booking is recommended to avoid waiting times.`,
      sampleFaqs: [
        {
          id: 'f1',
          question: 'What is the consultation fee?',
          answer: 'Our general doctor consultation fee is ₹500, and specialist doctor consultation is ₹800. Online and in-clinic payments are accepted.',
          keywords: ['fee', 'charges', 'cost', 'consultation price'],
        },
        {
          id: 'f2',
          question: 'How to book an appointment?',
          answer: 'You can book an appointment by replying with your preferred Date, Time Slot, and Patient Name here! Our team will confirm your slot within 10 minutes.',
          keywords: ['book', 'appointment', 'slot', 'doctor timing'],
        },
      ],
    },
    {
      id: 'realestate',
      name: 'Real Estate & Properties',
      icon: Home,
      tone: 'PROFESSIONAL',
      prompt: `You are the luxury real estate consultant assistant. 
Help prospective buyers and investors learn about available residential and commercial projects, pricing ranges, amenities, and site visit schedules. 
Aim to collect the customer's budget, preferred location, and arrange a site visit.`,
      knowledge: `• Current Active Projects: Green Heights (2 & 3 BHK luxury apartments starting ₹75 Lakhs), Palm Grove Villas (starting ₹1.8 Cr).
• 0% Brokerage on direct developer bookings.
• Free cab pickup & drop for scheduled site visits on weekends.
• Bank approvals from SBI, HDFC, ICICI, and Axis Bank with up to 80% loan assistance.`,
      sampleFaqs: [
        {
          id: 'f1',
          question: 'Can I schedule a site visit?',
          answer: 'Absolutely! We arrange complimentary site visits including cab pickup. Please share your convenient day and time, and our property manager will confirm.',
          keywords: ['site visit', 'visit project', 'see property', 'inspect'],
        },
      ],
    },
    {
      id: 'restaurant',
      name: 'Restaurant & Cafe',
      icon: Utensils,
      tone: 'SALES_DRIVEN',
      prompt: `You are the enthusiastic food ordering and table reservation host for our restaurant.
Share menu specials, daily chef recommendations, home delivery options, and party bookings. Make food sound mouth-watering!`,
      knowledge: `• Dine-in Hours: 11:30 AM to 11:30 PM (All 7 Days).
• Free home delivery within 5 km radius on orders above ₹300.
• 100% Pure Vegetarian kitchen with Jain options available.
• 15% Flat Discount on direct WhatsApp orders using code: WA15.`,
      sampleFaqs: [
        {
          id: 'f1',
          question: 'Do you have home delivery?',
          answer: 'Yes! We deliver piping hot food in 30-40 minutes within 5 km. Order directly here on WhatsApp to enjoy a Flat 15% discount with code *WA15*!',
          keywords: ['delivery', 'home delivery', 'swiggy', 'zomato', 'order food'],
        },
      ],
    },
    {
      id: 'fitness',
      name: 'Gym & Fitness Studio',
      icon: Dumbbell,
      tone: 'SALES_DRIVEN',
      prompt: `You are the energetic fitness advisor for our gym and wellness center.
Provide membership plans, personal training details, batch timings, and invite prospects for a Free 1-Day Trial Pass.`,
      knowledge: `• Gym Timings: Mon-Sat 06:00 AM - 10:30 PM. Sunday: 08:00 AM - 02:00 PM.
• Monthly Membership: ₹2,000 | 3-Month Plan: ₹5,000 | Annual VIP Membership: ₹14,999.
• Certified personal trainers, steam bath, cardio zone, and strength section included in all memberships.`,
      sampleFaqs: [
        {
          id: 'f1',
          question: 'Can I get a free trial pass?',
          answer: 'Yes! We offer a Free 1-Day Trial Workout Pass. Reply with your Name and preferred workout time to get your instant VIP trial pass on WhatsApp!',
          keywords: ['trial', 'free trial', 'demo', 'guest pass'],
        },
      ],
    },
  ];

  // Fetch current AI training settings on load
  useEffect(() => {
    loadAiTraining();
  }, []);

  const loadAiTraining = async () => {
    try {
      const res: any = await api.get('/ai/training');
      if (res.data) {
        const data = res.data;
        setAiAutoReplyEnabled(data.aiAutoReplyEnabled ?? true);
        setAiSystemPrompt(data.aiSystemPrompt || '');
        setAiKnowledgeBase(data.aiKnowledgeBase || '');
        setCustomFaqs(Array.isArray(data.aiCustomFaqs) ? data.aiCustomFaqs : []);
        setAiTone(data.aiTone || 'FRIENDLY');
        setAiFallbackMessage(data.aiFallbackMessage || 'I am sorry, I am not sure about that. Let me connect you with our store team!');
        setAiIncludeCatalog(data.aiIncludeCatalog ?? true);
      }
    } catch (err: any) {
      console.error('Error fetching AI training settings:', err);
    }
  };

  const handleSaveTraining = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');
    try {
      await api.put('/ai/training', {
        aiAutoReplyEnabled,
        aiSystemPrompt,
        aiKnowledgeBase,
        aiCustomFaqs: customFaqs,
        aiTone,
        aiFallbackMessage,
        aiIncludeCatalog,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save AI training settings');
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (preset: typeof industryPresets[0]) => {
    if (confirm(`Apply the "${preset.name}" preset? This will load pre-configured instructions, knowledge notes, and sample FAQs.`)) {
      setAiTone(preset.tone);
      setAiSystemPrompt(preset.prompt);
      setAiKnowledgeBase(preset.knowledge);
      setCustomFaqs(preset.sampleFaqs);
    }
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const keywords = newFaqKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const newFaq: FaqItem = {
      id: `faq_${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
      keywords: keywords.length > 0 ? keywords : undefined,
    };

    setCustomFaqs([newFaq, ...customFaqs]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setNewFaqKeywords('');
  };

  const handleDeleteFaq = (id: string) => {
    setCustomFaqs(customFaqs.filter((f) => f.id !== id));
  };

  // Test Chat in Sandbox
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newChat = [...chatMessages, userMsg];
    setChatMessages(newChat);
    setIsSending(true);

    try {
      // Build conversation history for multi-turn test
      const history = chatMessages
        .filter((m) => m.id !== '1')
        .map((m) => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        }));

      const res: any = await api.post('/ai/test-agent', {
        message: userText,
        customerName: 'Dheeraj (Test Customer)',
        history,
      });

      if (res.data) {
        const aiReply: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: res.data.reply,
          intent: res.data.detectedIntent,
          matchedFaq: res.data.matchedCustomFaq?.question,
          sources: res.data.sourcesUsed,
          products: res.data.products,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages([...newChat, aiReply]);
        setLastDebugInfo(res.data);
      }
    } catch (err: any) {
      const errorReply: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Test error: ${err.message || 'Could not connect to AI service'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages([...newChat, errorReply]);
    } finally {
      setIsSending(false);
    }
  };

  const filteredFaqs = customFaqs.filter((f) =>
    f.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
    (f.keywords && f.keywords.some((k) => k.toLowerCase().includes(faqSearchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 p-6 rounded-3xl border border-slate-800 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">AI Agent Training Studio</h1>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Multi-Tenant Isolated
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Train the AI assistant specifically for <strong className="text-white font-semibold">{currentOrganization?.name}</strong>. Set custom instructions, brand persona, FAQs, and business knowledge to reply to WhatsApp customers automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Auto-Reply Toggle */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-300 font-medium">WhatsApp AI Auto-Reply:</span>
            <button
              onClick={() => setAiAutoReplyEnabled(!aiAutoReplyEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                aiAutoReplyEnabled
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {aiAutoReplyEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <button
            onClick={handleSaveTraining}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Saved Live!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save AI Training</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>Success:</strong> AI prompt, custom knowledge base, and FAQs updated! Incoming WhatsApp messages will now follow these trained instructions.</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Training Studio (Left) + Interactive Live Sandbox (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: AI Training Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'prompt' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>Persona & Prompt</span>
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'faqs' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Custom FAQs ({customFaqs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'knowledge' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>Business Knowledge</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'settings' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Behavior & Fallbacks</span>
            </button>
          </div>

          {/* TAB 1: Persona & System Prompt */}
          {activeTab === 'prompt' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              {/* Industry Preset Templates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Quick Start Industry Presets
                  </span>
                  <span className="text-[11px] text-slate-400">Click to apply 1-click training</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {industryPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 text-left transition-all text-xs group"
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-800 group-hover:text-emerald-700">
                        <p.icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600" />
                        <span>{p.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* AI Persona & Tone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>AI Conversation Tone & Persona</span>
                  <span className="text-[10px] text-slate-400 font-normal">How the AI talks to customers</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: 'FRIENDLY', label: '😊 Friendly & Warm', desc: 'Approachable, warm emojis' },
                    { key: 'PROFESSIONAL', label: '👔 Professional', desc: 'Formal, polite, corporate' },
                    { key: 'SALES_DRIVEN', label: '🚀 Sales & Conversion', desc: 'Persuasive, strong CTAs' },
                    { key: 'HINGLISH', label: '🇮🇳 Hinglish Conversational', desc: 'Natural Hindi & English blend' },
                    { key: 'CONCISE', label: '⚡ Short & Crisp', desc: 'Minimal words, bullet points' },
                  ].map((t) => (
                    <div
                      key={t.key}
                      onClick={() => setAiTone(t.key)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        aiTone === t.key
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs">{t.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Business System Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Custom AI Business Instructions (System Prompt)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {aiSystemPrompt.length} characters
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Give specific rules to your AI agent. Mention your staff names, specific brand values, return rules, and what NOT to do.
                </p>
                <textarea
                  rows={6}
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  placeholder={`e.g.\nYou are Maya, the official customer concierge for ${currentOrganization?.name || 'our store'}.\n- Always greet the customer politely.\n- If a customer asks about discounts, offer our 10% coupon code: WELCOME10.\n- Never make promises on non-refundable items.\n- If the customer is angry, politely offer to connect with a manager.`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-y"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Custom FAQs Manager */}
          {activeTab === 'faqs' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              {/* Add New FAQ Form */}
              <form onSubmit={handleAddFaq} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Add Custom Business FAQ (Q&A Pair)
                </span>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFaqQuestion}
                    onChange={(e) => setNewFaqQuestion(e.target.value)}
                    placeholder="Customer Question (e.g. Do you deliver to Bangalore?)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <textarea
                    rows={2}
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="AI Trained Answer (e.g. Yes! We deliver across all areas of Bangalore within 24 hours.)"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                  />
                  <input
                    type="text"
                    value={newFaqKeywords}
                    onChange={(e) => setNewFaqKeywords(e.target.value)}
                    placeholder="Optional keywords (comma separated, e.g. bangalore, delivery, karnataka, time)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Training</span>
                  </button>
                </div>
              </form>

              {/* FAQs List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-800">
                    Trained FAQs ({customFaqs.length})
                  </span>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={faqSearchQuery}
                      onChange={(e) => setFaqSearchQuery(e.target.value)}
                      placeholder="Filter FAQs..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No custom FAQs found. Add your first Q&A pair above or select an industry preset!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {filteredFaqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-1.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {faq.question}
                          </p>
                          <button
                            onClick={() => handleDeleteFaq(faq.id)}
                            className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                            title="Delete FAQ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                        {faq.keywords && faq.keywords.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {faq.keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Business Knowledge Base */}
          {activeTab === 'knowledge' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Freeform Knowledge Base Notes
                </h3>
                <p className="text-xs text-slate-500">
                  Add detailed notes about your company history, services offered, warranties, pricing tiers, branch locations, and special terms. The AI references this knowledge base for answering questions.
                </p>
              </div>

              <textarea
                rows={10}
                value={aiKnowledgeBase}
                onChange={(e) => setAiKnowledgeBase(e.target.value)}
                placeholder={`e.g.\n• Branches: Main Branch in Indiranagar, Sub-branch in Koramangala.\n• Doctor Specialties: Dr. Sharma (Orthodontist, available Tue & Thu 4-8 PM), Dr. Priya (Pediatric Dentist, Mon-Fri 10 AM-2 PM).\n• Warranty: All dental implants come with a 5-year replacement guarantee.\n• Insurance Partners: We accept Star Health, Care Health, HDFC Ergo for cashless billing.`}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-mono leading-relaxed resize-y"
              />

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-purple-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Zero-Hallucination Guardrail:</strong> The AI will only state facts documented in your knowledge base and policies. It will never invent fake services or prices.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: Behavior & Fallbacks */}
          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
              {/* Fallback Message */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900">
                  Custom Unknown / Fallback Message
                </label>
                <p className="text-[11px] text-slate-500">
                  Sent to customer if they ask something not in the knowledge base or catalog.
                </p>
                <textarea
                  rows={2}
                  value={aiFallbackMessage}
                  onChange={(e) => setAiFallbackMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Include Catalog Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900">Include Product Catalog in AI Answers</span>
                  <p className="text-[11px] text-slate-500">
                    Allows the AI to automatically recommend relevant products and prices from your database.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={aiIncludeCatalog}
                  onChange={(e) => setAiIncludeCatalog(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Live WhatsApp Simulator Sandbox (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 p-5 rounded-3xl border border-slate-800 text-white shadow-2xl flex flex-col h-[740px]">
          {/* Simulator Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xs">
                  AI
                </div>
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-tight">
                    {currentOrganization?.name || 'Trained Assistant'}
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-semibold">
                    SANDBOX
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Live AI Chat Simulator</span>
              </div>
            </div>

            <button
              onClick={() => {
                setChatMessages([
                  {
                    id: '1',
                    sender: 'ai',
                    text: `👋 Hello! I am the trained AI assistant for ${currentOrganization?.name || 'this business'}. Ask me anything!`,
                    time: 'Just now',
                  },
                ]);
                setLastDebugInfo(null);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Sandbox Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Test Prompt Chips */}
          <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto text-[10px] text-slate-300 no-scrollbar">
            <span className="text-slate-500 text-[10px] font-medium shrink-0">Try:</span>
            {[
              'Store hours?',
              'Return policy?',
              'Do you offer COD?',
              'Show products under 1500',
              'Talk to a human',
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputMessage(chip);
                }}
                className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-full text-slate-300 shrink-0 border border-slate-700/60 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 my-2">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-xs shadow-md'
                      : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/80 shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Matching Products Preview */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 block">
                        Catalog Matches ({msg.products.length}):
                      </span>
                      {msg.products.map((p: any) => (
                        <div key={p.id} className="bg-slate-900/80 p-2 rounded-xl border border-slate-700 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-200">{p.name}</span>
                          <span className="text-emerald-400 font-bold">{currency} {p.discountPrice || p.price}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-1.5 text-[9px] text-slate-400">
                    <span>{msg.time}</span>
                    {msg.intent && (
                      <span className="bg-slate-900/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                        {msg.intent}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 bg-slate-800 text-slate-400 text-xs px-3 py-2 rounded-2xl rounded-bl-xs border border-slate-700 max-w-[50%]">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span>AI generating reply...</span>
              </div>
            )}
          </div>

          {/* Debug Inspector (if available) */}
          {lastDebugInfo && (
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1 mb-2">
              <div className="flex items-center justify-between text-emerald-400 font-semibold">
                <span>Reasoning & Knowledge Sources:</span>
                <span>{lastDebugInfo.aiMode}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {lastDebugInfo.sourcesUsed?.map((src: string, i: number) => (
                  <span key={i} className="bg-slate-850 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                    {src}
                  </span>
                ))}
                {lastDebugInfo.matchedCustomFaq && (
                  <span className="bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">
                    FAQ: {lastDebugInfo.matchedCustomFaq.question}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sandbox Input Form */}
          <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type customer message to test AI..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2.5 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
