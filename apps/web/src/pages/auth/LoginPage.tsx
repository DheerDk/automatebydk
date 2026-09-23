import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldAlert,
  Phone,
  KeyRound,
  CheckCircle2,
  Clock,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, getGoogleAuthUrl, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loginMode, setLoginMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  // OTP Login State
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
    const verifiedParam = searchParams.get('verified');
    if (verifiedParam) {
      setInfoMessage('Your email has been verified successfully! You can now log in.');
    }
  }, [searchParams]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(formData);
      if (formData.email.toLowerCase().includes('admin@chatflow.ai')) {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtpLogin = async () => {
    if (!phoneInput.trim()) {
      setError('Please enter your phone number with country code (e.g. +919876543210)');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await sendOtp({ phone: phoneInput.trim(), purpose: 'LOGIN' });
      setIsOtpSent(true);
      setMaskedPhone(res.phone || phoneInput);
      setCooldown(res.cooldownSeconds || 60);
      setInfoMessage(`A 6-digit verification code was sent to ${res.phone || phoneInput}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your phone number.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const newCode = [...otpCode];
    newCode[index] = cleaned.slice(-1);
    setOtpCode(newCode);

    // Auto-focus next input
    if (cleaned && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpCode.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await verifyOtp({ phone: phoneInput.trim(), otp: fullOtp, purpose: 'LOGIN' });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfficialGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const authInfo = await getGoogleAuthUrl();
      if (!authInfo.isConfigured || !authInfo.url) {
        setError(authInfo.message || 'Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID in your backend environment.');
        setIsGoogleLoading(false);
        return;
      }
      // Redirect browser to official Google OAuth 2.0 endpoint
      window.location.href = authInfo.url;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google authentication.');
      setIsGoogleLoading(false);
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
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Official Google OAuth Sign-In */}
          <button
            type="button"
            onClick={handleOfficialGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-700 hover:border-slate-600 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-sm font-semibold text-white transition-all shadow-xs disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
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
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Or sign in with
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginMode('PASSWORD');
                setError(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'PASSWORD'
                  ? 'bg-slate-800 text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('OTP');
                setError(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'OTP'
                  ? 'bg-slate-800 text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Phone SMS OTP
            </button>
          </div>

          {/* PASSWORD LOGIN FORM */}
          {loginMode === 'PASSWORD' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-400"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400">
                  Remember this device for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REAL PHONE OTP LOGIN FORM */}
          {loginMode === 'OTP' && (
            <div className="space-y-4">
              {!isOtpSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone Number (E.164 Format)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+919876543210"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Include your country code (e.g. +91 for India, +1 for US/Canada).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtpLogin}
                    disabled={isLoading || !phoneInput.trim()}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Send Verification SMS</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">
                      Enter the 6-digit code sent via SMS to <span className="text-white font-bold">{maskedPhone}</span>
                    </p>
                  </div>

                  <div className="flex justify-between gap-2">
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-input-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-12 text-center text-lg font-bold bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.join('').length < 6}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Verify &amp; Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                        setOtpCode(['', '', '', '', '', '']);
                      }}
                      className="hover:text-white"
                    >
                      Change Number
                    </button>

                    {cooldown > 0 ? (
                      <span className="text-slate-500">Resend in {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtpLogin}
                        disabled={isLoading}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
