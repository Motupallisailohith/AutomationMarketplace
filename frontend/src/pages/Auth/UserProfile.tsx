/**
 * User Profile Settings Page - n8n style
 * Personal account settings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, User, Mail, Shield, Key } from 'lucide-react';
import axios from 'axios';

interface UserData {
  id: string;
  name: string;
  email: string;
  mfaEnabled: boolean;
  createdAt: string;
}

export const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/auth/profile');
      setUser(response.data);
      setName(response.data.name);
      setEmail(response.data.email);
    } catch (err: any) {
      setError('Failed to load profile');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.put('/api/auth/profile', { name, email });
      setSuccess('Profile updated successfully');
      await fetchUserData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    try {
      await axios.post('/api/auth/mfa/disable');
      setSuccess('Two-factor authentication disabled');
      await fetchUserData();
    } catch (err: any) {
      setError('Failed to disable MFA');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-foreground border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-text-shade1 mb-2">Personal Settings</h1>
      <p className="text-text mb-8">Manage your account settings and preferences</p>

      {error && (
        <div className="mb-6 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
          <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-shade">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-success-tint4 border border-success-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
          <CheckCircle size={18} className="text-success flex-shrink-0 mt-0.5" />
          <p className="text-sm text-success-shade">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-text-shade1 flex items-center">
                <User size={20} className="mr-2" />
                Profile Information
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>

          {/* Security Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-text-shade1 flex items-center">
                <Shield size={20} className="mr-2" />
                Security
              </h2>
            </div>
            <div className="card-body space-y-4">
              {/* Password */}
              <div className="flex items-center justify-between p-4 bg-background-light1 rounded-lg border border-foreground">
                <div className="flex items-center space-x-3">
                  <Key size={20} className="text-text-tint1" />
                  <div>
                    <h3 className="text-sm font-medium text-text-shade1">Password</h3>
                    <p className="text-xs text-text-tint1">Last changed 30 days ago</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/change-password')}
                  className="btn btn-outline btn-sm"
                >
                  Change
                </button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between p-4 bg-background-light1 rounded-lg border border-foreground">
                <div className="flex items-center space-x-3">
                  <Shield size={20} className={user.mfaEnabled ? 'text-success' : 'text-text-tint1'} />
                  <div>
                    <h3 className="text-sm font-medium text-text-shade1">Two-Factor Authentication</h3>
                    <p className="text-xs text-text-tint1">
                      {user.mfaEnabled ? 'Enabled' : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                {user.mfaEnabled ? (
                  <button
                    onClick={handleDisableMfa}
                    className="btn btn-outline btn-sm"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/mfa-setup')}
                    className="btn btn-primary btn-sm"
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-text-shade1">Account Details</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <p className="text-xs text-text-tint1 mb-1">User ID</p>
                <p className="text-sm text-text-shade1 font-mono">{user.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-xs text-text-tint1 mb-1">Member Since</p>
                <p className="text-sm text-text-shade1">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tint1 mb-1">Security Status</p>
                <div className="flex items-center space-x-2">
                  {user.mfaEnabled ? (
                    <span className="badge badge-success">Protected</span>
                  ) : (
                    <span className="badge badge-warning">Basic</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
