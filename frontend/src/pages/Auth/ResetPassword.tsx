/**
 * Reset Password Page - n8n style
 * Reset password with token from email
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '@/api/client';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
    }
  }, [token]);
  
  const validatePassword = () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) return;

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-background-light2 flex items-center justify-center p-4">
        <div className="w-full max-w-[352px] pt-16">
          <div className="bg-background-light3 rounded-lg border border-foreground shadow-light p-8 text-center">
            <AlertCircle size={48} className="text-danger mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-text-shade1 mb-2">Invalid Link</h1>
            <p className="text-sm text-text mb-6">
              This password reset link is invalid or has expired.
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="btn btn-primary"
            >
              Request new link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light2 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-[352px] pt-16 animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6 transition-transform hover:scale-105 duration-300">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="url(#gradient)" />
              <path d="M20 10L30 20L20 30L10 20L20 10Z" fill="white" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#FF6D5A" />
                  <stop offset="1" stopColor="#FF5555" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-background-light3 rounded-lg border border-foreground shadow-light p-8">
          {!success ? (
            <>
              <h1 className="text-2xl font-semibold text-text-shade1 text-center mb-2">
                Reset your password
              </h1>
              <p className="text-sm text-text text-center mb-6">
                Enter your new password below
              </p>

              {error && (
                <div className="mb-4 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
                  <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-shade">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password Input */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                               transition-all duration-200 hover:border-foreground-shade1"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint1 hover:text-text transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-text-tint1 mt-1">
                    Must be at least 8 characters
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                               transition-all duration-200 hover:border-foreground-shade1"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint1 hover:text-text transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary hover:bg-primary-shade text-text-tint3 font-medium rounded 
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm 
                           shadow-sm hover:shadow active:scale-[0.98] transform"
                >
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-tint4 rounded-full mb-4">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h1 className="text-2xl font-semibold text-text-shade1 mb-2">
                Password reset successfully
              </h1>
              <p className="text-sm text-text mb-6">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <p className="text-xs text-text-tint1">
                Redirecting to login...
              </p>
            </div>
          )}

          {/* Back to Login */}
          {!success && (
            <div className="mt-6 pt-6 border-t border-foreground text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-primary hover:text-primary-shade font-medium transition-colors"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
