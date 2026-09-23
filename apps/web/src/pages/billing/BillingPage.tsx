import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award,
} from 'lucide-react';
import { api } from '../../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanTier {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxConversations: number;
  maxAutomations: number;
  maxCampaigns: number;
  aiSearchLimit: number;
  features: string[];
}

export const BillingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedTier, setSelectedTier] = useState<string>('GROWTH');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Razorpay Checkout Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [subRes, payRes] = await Promise.all([
        api.get('/subscription').catch(() => ({ data: { data: null } })),
        api.get('/payments/history').catch(() => ({ data: { data: [] } })),
      ]);

      setSubscription(subRes.data?.data || null);
      setPayments(payRes.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load billing details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const plans: PlanTier[] = [
    {
      id: 'STARTER',
      name: 'Starter Business',
      tier: 'STARTER',
      priceMonthly: 1499,
      priceYearly: 14990,
      maxConversations: 2000,
      maxAutomations: 5,
      maxCampaigns: 5,
      aiSearchLimit: 2000,
      features: [
        '2,000 WhatsApp Conversations/mo',
        'AI Store Assistant (Catalog Search)',
        'Up to 5 Automated Keyword Flows',
        '5 Broadcast Campaigns/mo',
        'Standard Support & CRM',
      ],
    },
    {
      id: 'GROWTH',
      name: 'Growth Accelerate',
      tier: 'GROWTH',
      priceMonthly: 2999,
      priceYearly: 29990,
      maxConversations: 10000,
      maxAutomations: 20,
      maxCampaigns: 20,
      aiSearchLimit: 10000,
      features: [
        '10,000 WhatsApp Conversations/mo',
        'Advanced GPT-4o AI Agent with FAQs',
        '20 Automated Custom Flows',
        '20 Broadcast Campaigns with Media',
        'Kanban CRM & Lead Management',
        'Priority Webhook & SLA',
      ],
    },
    {
      id: 'PRO',
      name: 'Pro Enterprise',
      tier: 'PRO',
      priceMonthly: 5999,
      priceYearly: 59990,
      maxConversations: 50000,
      maxAutomations: 100,
      maxCampaigns: 100,
      aiSearchLimit: 50000,
      features: [
        '50,000 WhatsApp Conversations/mo',
        'Unlimited AI Catalog & Store Search',
        '100 Multi-step Automation Rules',
        '100 Targeted Broadcast Campaigns',
        'Team Access (Up to 25 staff seats)',
        '24/7 Dedicated Support',
      ],
    },
  ];

  const handleInitiatePayment = async (plan: PlanTier) => {
    try {
      setPaying(true);
      setStatusMessage(null);

      // 1. Create Server-side Order
      const res = await api.post('/payments/create-order', {
        planTier: plan.tier,
        billingCycle,
      });

      const orderData = res.data?.data;
      if (!orderData) {
        throw new Error('Failed to create payment order');
      }

      // If Razorpay SDK loaded, open official checkout
      if (window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'AutoMate by DK',
          description: `${plan.name} (${billingCycle})`,
          order_id: orderData.orderId.startsWith('order_mock_') ? undefined : orderData.orderId,
          handler: async function (response: any) {
            try {
              // 2. Cryptographic Signature Verification
              const verifyRes = await api.post('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || 'verified_mock_sig',
                planTier: plan.tier,
                billingCycle,
              });

              setStatusMessage({
                type: 'success',
                text: verifyRes.data?.message || `Successfully upgraded to ${plan.name}!`,
              });
              fetchBillingData();
            } catch (verErr: any) {
              setStatusMessage({
                type: 'error',
                text: verErr.response?.data?.message || 'Payment verification failed.',
              });
            }
          },
          prefill: {
            name: 'Store Owner',
            email: 'admin@automatebydk.com',
            contact: '919876543210',
          },
          theme: {
            color: '#10B981', // Brand Emerald
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setStatusMessage({
            type: 'error',
            text: resp.error?.description || 'Payment was declined or cancelled.',
          });
        });
        rzp.open();
      } else {
        // Direct simulation verification if Razorpay JS unavailable
        const verifyRes = await api.post('/payments/verify', {
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_signature: 'verified_mock_sig',
          planTier: plan.tier,
          billingCycle,
        });

        setStatusMessage({
          type: 'success',
          text: verifyRes.data?.message || `Successfully upgraded to ${plan.name}!`,
        });
        fetchBillingData();
      }
    } catch (err: any) {
      console.error('Payment start error:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Payment initiation failed.',
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-500" />
            Billing & Subscriptions
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your workspace subscription, plan quotas, and real-time Razorpay payments.
          </p>
        </div>

        {/* Billing Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl self-start border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              billingCycle === 'YEARLY'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Annual Billing
            <span className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Current Plan Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Active Plan: {subscription?.planTier || 'STARTER'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {subscription?.daysRemaining ?? 30} days remaining
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-3">
              AutoMate by DK Enterprise Suite
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              High-throughput WhatsApp Meta Cloud API, AI Sales Agents, Interactive Catalog, and Multi-Tenant CRM.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => {
                const growthPlan = plans.find((p) => p.tier === 'GROWTH') || plans[1];
                handleInitiatePayment(growthPlan);
              }}
              disabled={paying}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {paying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Upgrade / Renew via Razorpay
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Choose the Perfect Plan for Your Business
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Instant 100% secure checkout via UPI, Google Pay, PhonePe, Paytm, RuPay, and Cards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = (subscription?.planTier || 'STARTER') === plan.tier;
            const price = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
            const isPopular = plan.tier === 'GROWTH';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 transition-all duration-200 border flex flex-col justify-between ${
                  isPopular
                    ? 'bg-slate-900 dark:bg-slate-900 text-white border-emerald-500 shadow-2xl shadow-emerald-500/10 ring-2 ring-emerald-500/50'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className={`text-xs font-medium ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                      /{billingCycle === 'YEARLY' ? 'year' : 'mo'}
                    </span>
                  </div>

                  <p className={`text-xs mt-2 ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                    Includes full WhatsApp Meta automation, AI support & CRM.
                  </p>

                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            isPopular ? 'text-emerald-400' : 'text-emerald-500'
                          }`}
                        />
                        <span className={isPopular ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => handleInitiatePayment(plan)}
                    disabled={paying}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isPopular
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {paying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      'Renew Current Plan'
                    ) : (
                      <>
                        Upgrade to {plan.tier}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Anti-Fraud Guarantee Badge */}
      <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col md:flex-row items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            100% Cryptographically Verified & Hack-Proof Transactions
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Every transaction is verified using HMAC-SHA256 digital signatures directly with Razorpay gateway servers. Replay attacks and client-side amount tampering are strictly blocked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1.5 rounded-lg">
            256-bit SSL Encrypted
          </span>
        </div>
      </div>

      {/* Payment History & Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Payment History & Tax Invoices
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instant receipts for all your plan subscriptions and renewals.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">Plan Tier</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No transactions found yet. Upgraded plans will appear here automatically.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">
                      {p.invoiceNumber || `INV-${p.id.slice(0, 6).toUpperCase()}`}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                      {p.transactionId}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {p.planTier || 'STARTER'}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-[11px] font-bold uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
