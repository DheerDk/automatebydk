import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  ShieldAlert,
  Phone,
  KeyRound,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [loginMode, setLoginMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // OTP Login State
  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(formData);
      // If superadmin, route to /super-admin, else /dashboard
      if (formData.email.toLowerCase().includes('admin@chatflow.ai')) {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtpLogin = async () => {
    if (!otpTarget) {
      setError('Please enter your registered email or phone');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await sendOtp({ email: otpTarget, purpose: 'LOGIN' });
      setIsOtpSent(true);
      if (res.previewOtp) {
        setOtpPreview(res.previewOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpLogin = async () => {
    const fullOtp = otpCode.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await verifyOtp({ email: otpTarget, otp: fullOtp });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle({
        email: formData.email || 'priya.sharma@gmail.com',
        name: 'Priya Sharma',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        googleId: 'google_oauth_priya_demo',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Account Auto-Fill
  const handleQuickDemoLogin = async (email: string, pass: string, isSuperAdmin: boolean = false) => {
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, password: pass });
      if (isSuperAdmin) {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src="/logo.png" alt="AutoMate by DK" className="w-11 h-11 object-contain rounded-xl shadow-lg" />
          <span className="text-2xl font-black text-white tracking-tight">
            AutoMate <span className="text-emerald-400">by DK</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-400">
          New business?{' '}
          <Link to="/register" className="font-bold text-emerald-400 hover:text-emerald-300">
            Create account &amp; select plan
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 py-7 px-6 shadow-2xl rounded-2xl border border-slate-800 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
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
            <span>Sign in with Google</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase font-semibold">Or continue with</span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Tab: Email Password vs OTP */}
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLoginMode('PASSWORD')}
              className={`py-1.5 rounded-lg transition-all ${
                loginMode === 'PASSWORD' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('OTP')}
              className={`py-1.5 rounded-lg transition-all ${
                loginMode === 'OTP' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              OTP Login
            </button>
          </div>

          {/* Form: Password Login */}
          {loginMode === 'PASSWORD' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="owner@stylehub.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* OTP Login */
            <div className="space-y-4">
              {!isOtpSent ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Email or Phone</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="owner@stylehub.com"
                        value={otpTarget}
                        onChange={(e) => setOtpTarget(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtpLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Get 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  {otpPreview && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-between">
                      <span>💡 Dev OTP: <strong>{otpPreview}</strong></span>
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
                    Enter the code sent to <strong className="text-white">{otpTarget}</strong>
                  </p>

                  <div className="flex justify-center gap-2 my-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`login-otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newOtp = [...otpCode];
                          newOtp[idx] = val;
                          setOtpCode(newOtp);
                          if (val && idx < 5) {
                            document.getElementById(`login-otp-${idx + 1}`)?.focus();
                          }
                        }}
                        className="w-9 h-11 text-center text-base font-black bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtpLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify &amp; Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Demo Switcher Panel */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block text-center">
              ⚡ Quick 1-Click Demo Accounts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@chatflow.ai', 'Admin@123456', true)}
                className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-left transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldAlert className="w-3.5 h-3.5" /> Super Admin
                </div>
                <span className="text-[10px] text-amber-400/80 block mt-0.5">Platform Console</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('owner@stylehub.com', 'Password@123')}
                className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-left transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Building2 className="w-3.5 h-3.5" /> Active Store
                </div>
                <span className="text-[10px] text-emerald-400/80 block mt-0.5">StyleHub (Growth)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('pending@luxurydental.com', 'Password@123')}
                className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-left transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5" /> Pending Store
                </div>
                <span className="text-[10px] text-blue-400/80 block mt-0.5">Dental Clinic (Pro)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
