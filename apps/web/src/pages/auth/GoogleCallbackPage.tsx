import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Google authorization was declined: ${errorParam}`);
      return;
    }

    if (!code) {
      setError('No authorization code was returned from Google.');
      return;
    }

    const processGoogleAuth = async () => {
      try {
        await loginWithGoogle({ code, redirectUri: window.location.origin + '/auth/google/callback' });
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Google authentication failed.');
      }
    };

    processGoogleAuth();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
        {!error ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <h2 className="text-lg font-bold text-white">Verifying Google Account...</h2>
            <p className="text-xs text-slate-400">
              Connecting your verified Google identity and loading your workspace.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Authentication Failed</h2>
            <p className="text-xs text-red-400">{error}</p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
