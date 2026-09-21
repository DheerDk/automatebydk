import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Briefcase } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('owner@stylehub.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (type: 'owner' | 'staff' | 'admin') => {
    if (type === 'owner') {
      setEmail('owner@stylehub.com');
      setPassword('Password@123');
    } else if (type === 'staff') {
      setEmail('staff@stylehub.com');
      setPassword('Password@123');
    } else if (type === 'admin') {
      setEmail('admin@chatflow.ai');
      setPassword('Admin@123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src="/logo.png" alt="AutoMate by DK" className="w-11 h-11 object-contain rounded-xl shadow-lg" />
          <span className="text-2xl font-extrabold text-white tracking-tight">AutoMate <span className="text-emerald-400">by DK</span></span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign in to your dashboard</h2>
        <p className="mt-1 text-xs text-slate-400">
          Or{' '}
          <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300">
            create a new store account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Demo Logins Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
            1-Click Demo Logins
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <button
              type="button"
              onClick={() => fillCredentials('owner')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-400 border border-slate-700/60 transition-colors flex flex-col items-center gap-1"
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-[11px]">Store Owner</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('staff')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-blue-500/20 hover:text-blue-400 border border-slate-700/60 transition-colors flex flex-col items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-[11px]">Staff Agent</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-700/60 transition-colors flex flex-col items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-[11px]">Super Admin</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="owner@stylehub.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
