/**
 * Forgot Password Page - n8n style
 * Request password reset email
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
                Forgot your password?
              </h1>
              <p className="text-sm text-text text-center mb-6">
                Enter your email and we'll send you a reset link
              </p>

              {error && (
                <div className="mb-4 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
                  <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-shade">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                             transition-all duration-200 hover:border-foreground-shade1"
                    placeholder="name@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary hover:bg-primary-shade text-text-tint3 font-medium rounded 
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm 
                           shadow-sm hover:shadow active:scale-[0.98] transform"
                >
                  {loading ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-tint4 rounded-full mb-4">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h1 className="text-2xl font-semibold text-text-shade1 mb-2">
                Check your email
              </h1>
              <p className="text-sm text-text mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-text-tint1 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-foreground text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center space-x-2 text-sm text-primary hover:text-primary-shade font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to sign in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
