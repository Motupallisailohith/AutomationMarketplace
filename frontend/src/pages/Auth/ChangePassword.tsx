/**
 * Change Password Page - n8n style
 * For authenticated users to change their password
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import axios from 'axios';

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
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
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/settings'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <div className="bg-background-light3 rounded-lg border border-foreground shadow-light p-8">
          {!success ? (
            <>
              <div className="flex items-center mb-6">
                <button
                  onClick={() => navigate(-1)}
                  className="mr-4 p-2 hover:bg-background-light1 rounded transition-colors"
                >
                  <ArrowLeft size={20} className="text-text" />
                </button>
                <h1 className="text-2xl font-semibold text-text-shade1">
                  Change Password
                </h1>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
                  <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-shade">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                               transition-all duration-200 hover:border-foreground-shade1"
                      placeholder="••••••••"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint1 hover:text-text transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                               transition-all duration-200 hover:border-foreground-shade1"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint1 hover:text-text transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-text-tint1 mt-1">
                    Must be at least 8 characters
                  </p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Confirm New Password
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

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 py-2.5 bg-background-light1 hover:bg-background-light2 text-text-shade1 font-medium rounded 
                             transition-all duration-200 text-sm border border-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-shade text-text-tint3 font-medium rounded 
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm 
                             shadow-sm hover:shadow active:scale-[0.98] transform"
                  >
                    {loading ? 'Changing...' : 'Change password'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-8 animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-tint4 rounded-full mb-4">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h1 className="text-2xl font-semibold text-text-shade1 mb-2">
                Password changed successfully
              </h1>
              <p className="text-sm text-text">
                Your password has been updated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
