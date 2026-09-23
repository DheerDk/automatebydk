import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifyEmail, resendVerificationEmail, user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setError('No verification token provided. Please click the link in your email.');
      return;
    }

    const processVerification = async () => {
      try {
        await verifyEmail(token);
        setIsSuccess(true);
      } catch (err: any) {
        setError(err.message || 'Verification link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };

    processVerification();
  }, [token]);

  const handleResend = async () => {
    setResendStatus(null);
    try {
      await resendVerificationEmail();
      setResendStatus('A new verification email has been sent! Check your inbox.');
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to resend verification email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <h2 className="text-lg font-bold text-white">Verifying your email...</h2>
            <p className="text-xs text-slate-400">Validating your security token with our servers.</p>
          </div>
        ) : isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Email Address Verified! 🎉</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your email has been verified. Your WhatsApp Automation workspace is fully activated.
            </p>
            <Link
              to="/dashboard"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Verification Failed</h2>
            <p className="text-xs text-red-400">{error}</p>

            {resendStatus && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                {resendStatus}
              </p>
            )}

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                type="button"
                onClick={handleResend}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Resend Verification Email</span>
              </button>

              <Link
                to="/login"
                className="text-xs text-slate-400 hover:text-white py-2"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
