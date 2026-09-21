import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  Bot,
  Zap,
  Kanban,
  Send,
  BarChart3,
  ShieldCheck,
  Check,
  ArrowRight,
  ChevronDown,
  ShoppingBag,
  Users,
  Clock,
  TrendingUp,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does AutoMate by DK connect to WhatsApp?',
      a: 'AutoMate by DK supports dual connection modes: 1) Instant QR Code Scan (Multi-Device) which links your existing WhatsApp phone app in 5 seconds without changing SIMs, or 2) Official Meta WhatsApp Cloud API (Graph API v21.0) for high-volume enterprise accounts.',
    },
    {
      q: 'How does the AI natural language product search work?',
      a: 'When a customer types natural language like "Show me red kurti under 1500 in size M", our AI extracts structured filters (color, size, maxPrice, category) and executes a strict query against your real database catalog. It NEVER invents products, stock or prices.',
    },
    {
      q: 'Can human staff take over when needed?',
      a: 'Yes! Customers can type "agent" or "talk to person", and AutoMate by DK immediately halts automatic replies, switches conversation status to Human Required, and assigns a team member with real-time notifications.',
    },
    {
      q: 'Can multiple team members manage the same WhatsApp number?',
      a: 'Absolutely. AutoMate by DK provides role-based multi-user access (Owner, Admin, Staff) so your entire team can collaborate on WhatsApp inbox enquiries simultaneously.',
    },
    {
      q: 'Can I test it before connecting my live WhatsApp account?',
      a: 'Yes! AutoMate by DK includes a built-in interactive WhatsApp Simulator directly in your browser. You can test product searches, AI answers, and lead captures without any external credentials.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* 1. Header Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">AutoMate <span className="text-emerald-400">by DK</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#ai" className="hover:text-emerald-400 transition-colors">AI Engine</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg shadow-md shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>📱 Instant QR Code Link &amp; Meta Cloud API v21.0 Dual Support</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Automate Conversations. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Capture Leads.</span> Grow Your Business.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Link your WhatsApp in 5 seconds via QR Code or Meta Cloud API. Transform customer chats into sales, showcase live catalog products, and close leads 24/7 on autopilot.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto text-base font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Start Free 14-Day Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 px-8 py-3.5 rounded-xl transition-all"
          >
            Explore StyleHub Demo
          </Link>
        </div>

        {/* Hero Interactive WhatsApp & Dashboard Preview */}
        <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900/60 p-2 border border-slate-700/60 shadow-2xl">
          <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
            {/* Left WhatsApp Simulation */}
            <div className="md:col-span-5 bg-[#EFEAE2] rounded-xl overflow-hidden flex flex-col h-[400px] border border-slate-700 shadow-inner">
              <div className="bg-[#075E54] text-white p-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold">S</div>
                <div>
                  <p className="text-xs font-bold">StyleHub Store</p>
                  <p className="text-[10px] text-emerald-200">AI Active • online</p>
                </div>
              </div>
              <div className="p-3 flex-1 space-y-2.5 overflow-y-auto text-xs whatsapp-chat-bg">
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] text-slate-900 p-2.5 rounded-xl rounded-tr-none max-w-[85%] shadow-xs">
                    Show me black shirts under 1500
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white text-slate-900 p-2.5 rounded-xl rounded-tl-none max-w-[85%] shadow-xs border border-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&auto=format&fit=crop&q=80"
                      alt="Shirt"
                      className="w-full h-24 object-cover rounded-md mb-1.5"
                    />
                    <p className="font-bold">Royal Oxford Slim Fit Black Shirt</p>
                    <p className="text-emerald-700 font-semibold mt-0.5">₹1,199 (Offer)</p>
                    <p className="text-[10px] text-slate-500 mt-1">Reply "BUY" to place order instantly!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Live Dashboard KPI Preview */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <p className="text-xs text-slate-400">Total Leads Captured</p>
                  <p className="text-2xl font-black text-white mt-1">1,248</p>
                  <span className="text-[11px] text-emerald-400 font-semibold">+24.8% this month</span>
                </div>
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <p className="text-xs text-slate-400">AI Resolved Queries</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">89.4%</p>
                  <span className="text-[11px] text-slate-400">Instant zero-wait</span>
                </div>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Live Leads Pipeline (Kanban)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">Synced</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-400">New (42)</span>
                    <p className="font-semibold text-white mt-1">₹68,400</p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-blue-400">Follow-up (18)</span>
                    <p className="font-semibold text-white mt-1">₹34,200</p>
                  </div>
                  <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-400">Converted (65)</span>
                    <p className="font-semibold text-emerald-400 mt-1">₹1,42,800</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-slate-300">
                  <strong className="text-white font-semibold">Zero Hallucinations:</strong> Every product card sent to WhatsApp customers comes strictly from your PostgreSQL database.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Simple 4-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">How AutoMate by DK Works</h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">Turn incoming WhatsApp chats into revenue on autopilot.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Link WhatsApp', desc: 'Scan a QR code to connect your personal / WhatsApp Business app in 5s, or connect Meta Cloud API.' },
              { step: '02', title: 'Upload Catalog', desc: 'Add your products, prices, variants, SKUs, and store FAQ policies into your database.' },
              { step: '03', title: 'AI Assistant Answers', desc: 'Customers search naturally. AI matches real items, answers FAQs, and captures leads.' },
              { step: '04', title: 'Convert & Follow-Up', desc: 'Track deals on Kanban, dispatch automated 24h reminders, and close sales.' },
            ].map((s, idx) => (
              <div key={idx} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative hover:border-emerald-500/40 transition-all">
                <span className="text-3xl font-black text-emerald-500/30">{s.step}</span>
                <h3 className="text-lg font-bold text-white mt-3">{s.title}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Enterprise Feature Set</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Built for Modern Commerce</h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">Everything retail, salons, clinics, and local businesses need to scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Bot, title: 'Natural Language Product Search', desc: 'Understands phrases like "black shirt under 1500" and extracts structured filters to query real catalog stock.' },
            { icon: Kanban, title: 'Visual Lead Kanban Pipeline', desc: 'Track customer journey across New, Contacted, Interested, Follow-up, Negotiation, and Converted stages.' },
            { icon: MessageSquare, title: 'Unified Multi-Agent Inbox', desc: 'WhatsApp-style 3-panel chat with customer CRM sidebar, instant product picker, and staff assignment.' },
            { icon: Zap, title: 'Smart Automation Rule Engine', desc: 'Trigger auto-replies, keyword menus, lead status updates, and staff notifications conditionally.' },
            { icon: Clock, title: 'Automated Scheduled Follow-ups', desc: 'Re-engage inactive customer conversations after 24h or 48h to prevent abandoned sales.' },
            { icon: Send, title: 'Broadcast Campaigns', desc: 'Send personalized WhatsApp broadcasts to segmented audiences (by tags, interest, or past buyers).' },
          ].map((f, idx) => (
            <div key={idx} className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Predictable Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Plans Designed for Growth</h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">No hidden commission. Upgrade or downgrade anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                tier: 'FREE',
                name: 'Free Starter',
                price: '₹0',
                period: '/month',
                desc: 'For new stores testing WhatsApp automation.',
                features: ['20 Products Catalog', '200 Conversations/mo', '1 Staff Account', 'Basic WhatsApp Webhook', 'Community Support'],
                cta: 'Start Free',
                highlight: false,
              },
              {
                tier: 'STARTER',
                name: 'Starter Pro',
                price: '₹1,499',
                period: '/month',
                desc: 'For small shops and growing boutique brands.',
                features: ['100 Products Catalog', '2,000 Conversations/mo', '3 Team Members', 'AI Product Search', 'CRM & Kanban Pipeline', 'Priority Email Support'],
                cta: 'Get Started',
                highlight: false,
              },
              {
                tier: 'GROWTH',
                name: 'Growth Business',
                price: '₹2,999',
                period: '/month',
                desc: 'Most popular for high-volume retail & clinics.',
                features: ['500 Products Catalog', '10,000 Conversations/mo', '10 Team Members', 'Full OpenAI GPT-4o Integration', 'Automated 24h Follow-ups', 'Broadcast Campaigns', 'Full Analytics'],
                cta: 'Start 14-Day Trial',
                highlight: true,
              },
              {
                tier: 'PRO',
                name: 'Enterprise Scale',
                price: '₹5,999',
                period: '/month',
                desc: 'For multi-outlet chains and top eCommerce.',
                features: ['5,000+ Products', '50,000 Conversations/mo', 'Unlimited Team Members', 'Dedicated Account Manager', 'Custom AI Fine-tuning', '24/7 SLA Support'],
                cta: 'Contact Sales',
                highlight: false,
              },
            ].map((p, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 flex flex-col justify-between ${
                  p.highlight
                    ? 'bg-gradient-to-b from-slate-900 to-emerald-950/30 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10'
                    : 'bg-slate-900 border border-slate-800'
                }`}
              >
                <div>
                  {p.highlight && (
                    <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-3">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">{p.desc}</p>
                  <div className="flex items-baseline gap-1 my-4">
                    <span className="text-3xl font-black text-white">{p.price}</span>
                    <span className="text-xs text-slate-400">{p.period}</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 mt-6 pt-6 border-t border-slate-800">
                    {p.features.map((feat, fidx) => (
                      <li key={fidx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/register"
                  className={`mt-8 w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                    p.highlight
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Got Questions?</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between text-sm font-bold text-white hover:text-emerald-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. Bottom CTA */}
      <section className="py-20 bg-gradient-to-tr from-emerald-950/60 via-slate-900 to-slate-950 border-t border-slate-800 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Start Converting WhatsApp Chats Today</h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base">
            Set up your AI catalog, connect WhatsApp in 5 seconds, and close leads on autopilot.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-500/20 text-sm"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white">AutoMate by DK</span>
            <span>— Automate conversations. Capture leads. Grow your business.</span>
          </div>
          <p>© 2025 AutoMate by DK. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
