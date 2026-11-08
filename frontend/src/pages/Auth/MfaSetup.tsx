/**
 * MFA Setup Page - n8n style
 * Set up two-factor authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Copy, Check, Shield } from 'lucide-react';
import axios from 'axios';

interface MfaSecret {
  secret: string;
  qrCode: string;
  recoveryCodes: string[];
}

export const MfaSetup: React.FC = () => {
  const navigate = useNavigate();
  const [mfaSecret, setMfaSecret] = useState<MfaSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');

  useEffect(() => {
    fetchMfaSecret();
  }, []);

  const fetchMfaSecret = async () => {
    try {
      const response = await axios.post('/api/auth/mfa/setup');
      setMfaSecret(response.data);
    } catch (err: any) {
      setError('Failed to generate MFA secret');
    }
  };

  const handleCopySecret = () => {
    if (mfaSecret) {
      navigator.clipboard.writeText(mfaSecret.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/auth/mfa/verify', {
        code: verificationCode,
        secret: mfaSecret?.secret,
      });
      setStep('complete');
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRecoveryCodes = () => {
    if (!mfaSecret) return;
    const content = `Automation Marketplace - MFA Recovery Codes\n\n${mfaSecret.recoveryCodes.join('\n')}\n\nStore these codes securely. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-recovery-codes.txt';
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]">
        <div className="bg-background-light3 rounded-lg border border-foreground shadow-light p-8">
          {step === 'setup' && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-secondary-tint2 rounded-full flex items-center justify-center">
                  <Shield size={24} className="text-secondary" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-text-shade1 text-center mb-2">
                Set up Two-Factor Authentication
              </h1>
              <p className="text-sm text-text text-center mb-6">
                Secure your account with an extra layer of protection
              </p>

              {error && (
                <div className="mb-4 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2">
                  <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-shade">{error}</p>
                </div>
              )}

              {mfaSecret && (
                <div className="space-y-6">
                  {/* Step 1: Scan QR Code */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-shade1 mb-3">
                      1. Scan QR code with your authenticator app
                    </h3>
                    <div className="flex justify-center p-4 bg-background-light1 rounded-lg border border-foreground">
                      <img src={mfaSecret.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-text-tint1 text-center mt-2">
                      Use Google Authenticator, Authy, or similar app
                    </p>
                  </div>

                  {/* Step 2: Manual Entry */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-shade1 mb-3">
                      2. Or enter this code manually
                    </h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={mfaSecret.secret}
                        readOnly
                        className="flex-1 px-3 py-2 bg-background-light1 border border-foreground rounded text-sm text-text-shade1 font-mono"
                      />
                      <button
                        onClick={handleCopySecret}
                        className="p-2 bg-background-light1 hover:bg-background-light2 border border-foreground rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check size={18} className="text-success" /> : <Copy size={18} className="text-text" />}
                      </button>
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <button
                    onClick={() => setStep('verify')}
                    className="w-full py-2.5 bg-primary hover:bg-primary-shade text-text-tint3 font-medium rounded 
                             transition-all duration-200 text-sm shadow-sm hover:shadow active:scale-[0.98] transform"
                  >
                    Continue to verification
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'verify' && (
            <>
              <h1 className="text-2xl font-semibold text-text-shade1 text-center mb-2">
                Verify Your Setup
              </h1>
              <p className="text-sm text-text text-center mb-6">
                Enter the 6-digit code from your authenticator app
              </p>

              {error && (
                <div className="mb-4 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
                  <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-shade">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                             transition-all duration-200 hover:border-foreground-shade1 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    required
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('setup')}
                    className="flex-1 py-2.5 bg-background-light1 hover:bg-background-light2 text-text-shade1 font-medium rounded 
                             transition-all duration-200 text-sm border border-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-shade text-text-tint3 font-medium rounded 
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm 
                             shadow-sm hover:shadow active:scale-[0.98] transform"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'complete' && mfaSecret && (
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-tint4 rounded-full mb-4">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h1 className="text-2xl font-semibold text-text-shade1 mb-2">
                Two-Factor Authentication Enabled
              </h1>
              <p className="text-sm text-text mb-6">
                Your account is now protected with 2FA
              </p>

              {/* Recovery Codes */}
              <div className="bg-warning-tint2 border border-warning rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-text-shade1 mb-2">
                  Save Your Recovery Codes
                </h3>
                <p className="text-xs text-text mb-3">
                  Store these codes securely. Each can only be used once if you lose access to your authenticator app.
                </p>
                <div className="bg-background-light3 rounded p-3 mb-3 font-mono text-xs space-y-1">
                  {mfaSecret.recoveryCodes.map((code, idx) => (
                    <div key={idx} className="text-text-shade1">{code}</div>
                  ))}
                </div>
                <button
                  onClick={handleDownloadRecoveryCodes}
                  className="w-full py-2 bg-background-light3 hover:bg-background-light1 text-text-shade1 text-sm font-medium rounded border border-foreground transition-colors"
                >
                  Download Recovery Codes
                </button>
              </div>

              <button
                onClick={() => navigate('/settings')}
                className="w-full py-2.5 bg-primary hover:bg-primary-shade text-text-tint3 font-medium rounded 
                         transition-all duration-200 text-sm shadow-sm hover:shadow active:scale-[0.98] transform"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaSetup;
