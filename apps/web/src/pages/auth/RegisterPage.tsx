import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  QrCode,
  Zap,
  Check,
  Globe,
  Radio,
  Clock,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface PlanOption {
  tier: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: string;
  popular?: boolean;
  desc: string;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    tier: 'STARTER',
    name: 'Starter Pro',
    monthlyPrice: 1499,
    yearlyPrice: 14390,
    desc: 'For small boutiques, local clinics, and growing shops.',
    features: [
      '100 Catalog Products',
      '2,000 WhatsApp Conversations/mo',
      '3 Team Staff Accounts',
      'AI Product Search Engine',
      'Kanban CRM Pipeline',
      'Email Support',
    ],
  },
  {
    tier: 'GROWTH',
    name: 'Growth Business',
    monthlyPrice: 2999,
    yearlyPrice: 28790,
    popular: true,
    badge: 'MOST POPULAR',
    desc: 'Best for scaling stores, high volume retail & clinics.',
    features: [
      '500 Catalog Products',
      '10,000 WhatsApp Conversations/mo',
      '10 Team Staff Accounts',
      'OpenAI GPT-4o Business Engine',
      'Automated 24h Smart Follow-ups',
      'Broadcast Marketing Campaigns',
      'Advanced Lead Analytics',
    ],
  },
  {
    tier: 'PRO',
    name: 'Enterprise Scale',
    monthlyPrice: 5999,
    yearlyPrice: 57590,
    desc: 'For multi-outlet brands and top eCommerce stores.',
    features: [
      '5,000+ Catalog Products',
      '50,000 Conversations/mo',
      'Unlimited Team Members',
      'Meta Cloud API & QR Dual Mode',
      'Custom AI Catalog Training',
      'Dedicated Account Manager',
      '24/7 SLA Priority Support',
    ],
  },
];

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Wizard Steps: 1: Plan -> 2: Auth & OTP -> 3: Payment -> 4: Business Profile -> 5: Activated
  const [step, setStep] = useState<number>(1);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(PLANS[1]); // Default Growth

  // Step 2: Auth Data
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'GOOGLE'>('EMAIL');
  const [authData, setAuthData] = useState({
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);

  // Step 3: Payment Data
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '4242 •••• •••• 4242',
    expiry: '12/28',
    cvv: '888',
    cardName: 'Priya Sharma',
  });
  const [upiId, setUpiId] = useState('priyasharma@okhdfcbank');
  const [isPaid, setIsPaid] = useState(false);
  const [txnRef, setTxnRef] = useState('');

  // Step 4: Business Profile
  const [businessData, setBusinessData] = useState({
    businessName: '',
    category: 'Retail & E-commerce',
    currency: 'INR',
    whatsappMode: 'QR_SCAN',
    welcomeMessage: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate pricing
  const subtotal = billingCycle === 'YEARLY' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
  const gst = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gst;

  // Handle OTP request
  const handleSendOtp = async () => {
    if (!authData.email || !authData.ownerName || !authData.password) {
      setError('Please fill in your name, email and password');
      return;
    }
    if (authData.password !== authData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await sendOtp({ email: authData.email, phone: authData.phone, purpose: 'REGISTER' });
      setIsOtpSent(true);
      if (res.previewOtp) {
        setOtpPreview(res.previewOtp);
      }
      setOtpTimer(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    const fullOtp = otpCode.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await verifyOtp({ email: authData.email, otp: fullOtp });
      setStep(3); // Proceed to Payment Checkout
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Use preview code above.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Google Sign In simulation
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mockGoogle = {
        email: authData.email || 'priya.sharma@gmail.com',
        name: authData.ownerName || 'Priya Sharma',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        googleId: `google_oauth_${Date.now()}`,
        planTier: selectedPlan.tier,
        billingCycle,
        businessName: businessData.businessName || 'Priya Boutique Studio',
        phone: authData.phone || '+91 98765 43210',
      };
      await loginWithGoogle(mockGoogle);
      setStep(3); // Proceed to payment
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Process Payment
  const handleProcessPayment = () => {
    setIsLoading(true);
    setTimeout(() => {
      const generatedRef = `TXN-${paymentMethod}-${Date.now().toString().slice(-8)}`;
      setTxnRef(generatedRef);
      setIsPaid(true);
      setIsLoading(false);
      setStep(4); // Move to Business Setup
    }, 1200);
  };

  // Complete Final Account Provisioning
  const handleFinalizeAccount = async () => {
    if (!businessData.businessName) {
      setError('Please provide your business name');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await register({
        businessName: businessData.businessName,
        ownerName: authData.ownerName || 'Store Owner',
        email: authData.email || 'owner@store.com',
        phone: authData.phone || '+91 98765 43210',
        password: authData.password || 'Password@123',
        planTier: selectedPlan.tier,
        billingCycle,
        paymentMethod,
        transactionId: txnRef || `TXN-ORD-${Date.now()}`,
        businessCategory: businessData.category,
        currency: businessData.currency,
        welcomeMessage: businessData.welcomeMessage,
      });

      setStep(5); // Show success activation
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full text-center">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src="/logo.png" alt="AutoMate by DK" className="w-10 h-10 object-contain rounded-xl shadow-lg" />
          <span className="text-2xl font-black text-white tracking-tight">
            AutoMate <span className="text-emerald-400">by DK</span>
          </span>
        </Link>
        <p className="mt-2 text-xs text-slate-400">
          Already have an active account?{' '}
          <Link to="/login" className="font-bold text-emerald-400 hover:text-emerald-300">
            Sign In here
          </Link>
        </p>

        {/* Step Progress Indicators */}
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 w-full -z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-500 -z-0"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />

            {[
              { num: 1, label: 'Choose Plan' },
              { num: 2, label: 'Authentication' },
              { num: 3, label: 'Payment Checkout' },
              { num: 4, label: 'Business Profile' },
              { num: 5, label: 'Ready' },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-1.5 z-10 bg-slate-950 px-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s.num
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                      : step === s.num
                      ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                      : 'bg-slate-900 border border-slate-700 text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    step >= s.num ? 'text-emerald-400' : 'text-slate-500'
                  } hidden sm:block`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full mt-6 mb-8">
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 font-bold hover:text-white text-sm">
              ✕
            </button>
          </div>
        )}

        {/* ---------------- STEP 1: CHOOSE PLAN ---------------- */}
        {step === 1 && (
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-white">Select Your SaaS Automation Plan</h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose the subscription tier for your WhatsApp catalog, team members, and AI bots.
              </p>

              {/* Monthly vs Yearly Billing Toggle */}
              <div className="mt-5 inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    billingCycle === 'YEARLY'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Yearly Billing</span>
                  <span className="bg-emerald-400/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-black">
                    SAVE 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan.tier === plan.tier;
                const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
                const period = billingCycle === 'YEARLY' ? '/yr' : '/mo';

                return (
                  <div
                    key={plan.tier}
                    onClick={() => setSelectedPlan(plan)}
                    className={`cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                      isSelected
                        ? 'bg-gradient-to-b from-slate-900 to-emerald-950/40 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                        : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                        {plan.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">{plan.name}</h3>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">{plan.desc}</p>

                      <div className="flex items-baseline gap-1 my-3 pb-3 border-b border-slate-800">
                        <span className="text-2xl font-black text-white">₹{price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">{period}</span>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-300">
                        {plan.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(plan);
                        setStep(2);
                      }}
                      className={`mt-6 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      Choose {plan.name}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Continue with {selectedPlan.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP 2: AUTH & OTP VERIFICATION ---------------- */}
        {step === 2 && (
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change Plan ({selectedPlan.name})
              </button>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                Tier: {selectedPlan.tier}
              </span>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Create Your Account & Verify</h2>
              <p className="text-xs text-slate-400 mt-1">Sign in with Google or verify via 6-digit OTP code.</p>
            </div>

            {/* Google One-Click Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase font-semibold">
                Or Register with Email + OTP
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {!isOtpSent ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendOtp();
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={authData.ownerName}
                      onChange={(e) => setAuthData({ ...authData, ownerName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="priya@store.com"
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={authData.phone}
                      onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authData.password}
                        onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authData.confirmPassword}
                        onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP Verification Box */
              <div className="space-y-4 text-center">
                {otpPreview && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-between">
                    <span>💡 Dev OTP Code: <strong>{otpPreview}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(otpPreview.split(''))}
                      className="text-[10px] underline font-bold"
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-300">
                  Enter the 6-digit code sent to <strong className="text-white">{authData.email}</strong>
                </p>

                {/* 6 Digit Inputs */}
                <div className="flex justify-center gap-2 my-2">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newOtp = [...otpCode];
                        newOtp[idx] = val;
                        setOtpCode(newOtp);
                        if (val && idx < 5) {
                          document.getElementById(`otp-${idx + 1}`)?.focus();
                        }
                      }}
                      className="w-10 h-12 text-center text-lg font-black bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Proceed to Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <button type="button" onClick={() => setIsOtpSent(false)} className="hover:text-white">
                    Edit Email / Phone
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- STEP 3: PAYMENT CHECKOUT ---------------- */}
        {step === 3 && (
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted Checkout
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left: Payment Method Selection */}
              <div className="md:col-span-7 space-y-4">
                <h3 className="text-base font-bold text-white">Select Payment Method</h3>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                    { id: 'CARD', label: 'Credit/Debit Card', icon: CreditCard },
                    { id: 'NETBANKING', label: 'Net Banking', icon: Building2 },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                        paymentMethod === m.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <m.icon className="w-5 h-5" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* UPI Interface */}
                {paymentMethod === 'UPI' && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 bg-white p-1.5 rounded-lg shrink-0 flex items-center justify-center">
                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=automate@upi&pn=AutoMate%20by%20DK"
                          alt="UPI QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Scan &amp; Pay with Any UPI App</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Google Pay, PhonePe, Paytm, CRED or BHIM UPI.
                        </p>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                          UPI ID: automate@icici
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Or enter your VPA / UPI ID
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Card Interface */}
                {paymentMethod === 'CARD' && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Expiry</label>
                        <input
                          type="text"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">CVV</label>
                        <input
                          type="password"
                          maxLength={3}
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NetBanking Interface */}
                {paymentMethod === 'NETBANKING' && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <p className="font-semibold text-white">Select Bank:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak', 'Others'].map((b) => (
                        <div key={b} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center font-bold text-[11px] hover:border-emerald-500 cursor-pointer">
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Order Summary */}
              <div className="md:col-span-5 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Summary</h3>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-semibold">{selectedPlan.name} ({billingCycle})</span>
                      <span className="font-bold text-white">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>GST (18% Indian Tax)</span>
                      <span>₹{gst.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-white">Total Payable</span>
                      <span className="text-xl font-black text-emerald-400">₹{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
                    ⚡ Auto-renews {billingCycle.toLowerCase()}. Cancel or upgrade anytime in dashboard.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isLoading}
                  className="w-full mt-6 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Pay ₹{totalAmount.toLocaleString()} &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 4: BUSINESS SETUP ---------------- */}
        {step === 4 && (
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-xl mx-auto space-y-5">
            <div className="text-center">
              <div className="inline-flex p-2 bg-emerald-500/10 text-emerald-400 rounded-full mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Payment Confirmed! Setup Your Business</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Transaction ID: {txnRef || 'TXN-CONFIRMED'}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFinalizeAccount();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business / Brand Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Silk Boutique"
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Category / Industry</label>
                <select
                  value={businessData.category}
                  onChange={(e) => setBusinessData({ ...businessData, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Retail & E-commerce">Retail &amp; E-commerce (Fashion, Jewelry, Electronics)</option>
                  <option value="Healthcare & Clinic">Healthcare &amp; Clinic (Dentist, Dermatology, Doctor)</option>
                  <option value="Restaurant & Cafe">Restaurant, Cafe &amp; Cloud Kitchen</option>
                  <option value="Salon & Spa">Beauty, Salon &amp; Wellness Spa</option>
                  <option value="Real Estate & Property">Real Estate &amp; Construction</option>
                  <option value="Education & Coaching">Education, Coaching &amp; Training</option>
                  <option value="Professional Services">Consulting, Agency &amp; B2B Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Connection Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setBusinessData({ ...businessData, whatsappMode: 'QR_SCAN' })}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                      businessData.whatsappMode === 'QR_SCAN'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <p className="font-bold">📱 Instant QR Scan</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Link WhatsApp phone in 5s</p>
                  </div>
                  <div
                    onClick={() => setBusinessData({ ...businessData, whatsappMode: 'META_API' })}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                      businessData.whatsappMode === 'META_API'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <p className="font-bold">🌐 Meta Cloud API</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Official WABA Graph API</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default WhatsApp Greeting / Welcome Note
                </label>
                <textarea
                  rows={2}
                  placeholder={`👋 Welcome to our store! Reply with 1 to browse catalog, 2 to search products, 3 for active offers.`}
                  value={businessData.welcomeMessage}
                  onChange={(e) => setBusinessData({ ...businessData, welcomeMessage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Complete Setup &amp; Launch Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ---------------- STEP 5: ACTIVATED SCREEN ---------------- */}
        {step === 5 && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg mx-auto text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">🎉 Account Provisioned Successfully!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your business workspace and <strong className="text-emerald-400">{selectedPlan.name}</strong> subscription are now active.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Business:</span>
                <span className="font-bold text-white">{businessData.businessName || 'Your Store'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subscription Tier:</span>
                <span className="font-bold text-emerald-400">{selectedPlan.name} ({billingCycle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Super Admin Review:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified &amp; Ready
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>Go to Business Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center text-[11px] text-slate-500">
        © 2025 AutoMate by DK. Enterprise WhatsApp AI Automation Platform.
      </div>
    </div>
  );
};
