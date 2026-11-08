/**
 * Login Page Component - n8n style
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@app/stores/userStore';
import { AlertCircle } from 'lucide-react';

export const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const navigate = useNavigate();
    const { login, signup } = useUserStore();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted', { isLogin, email, password: '***' });
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, name);
            }

            console.log('Auth successful, calling callback');
            onLoginSuccess();
            
            console.log('Navigating to dashboard...');
            navigate('/workflow/new');
        } catch (err: any) {
            console.error('Auth error:', err);
            const errorMessage = err.message || 'Authentication failed';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const enterSandbox = () => {
        const user = {
            id: 'sandbox-presenter',
            email: 'presenter@automationmarketplace.local',
            firstName: 'Research',
            lastName: 'Presenter',
            role: 'user',
        };
        localStorage.setItem('auth_token', 'sandbox-presentation-session');
        localStorage.setItem('auth_user', JSON.stringify(user));
        onLoginSuccess();
        navigate('/workflow/new');
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
                    <h1 className="text-2xl font-semibold text-text-shade1 text-center mb-6">
                        {isLogin ? 'Sign in' : 'Create account'}
                    </h1>

                    {error && (
                        <div className="mb-4 p-3 bg-danger-tint4 border border-danger-tint2 rounded-lg flex items-start space-x-2 animate-slide-in">
                            <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-danger-shade">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="animate-slide-in">
                                <label className="block text-sm font-medium text-text mb-1.5">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                                             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                                             transition-all duration-200 hover:border-foreground-shade1"
                                    placeholder="Your name"
                                    required={!isLogin}
                                />
                            </div>
                        )}

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
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-background-light3 border border-foreground rounded text-sm text-text-shade1 
                                         focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary 
                                         transition-all duration-200 hover:border-foreground-shade1"
                                placeholder="••••••••"
                                required
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
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
                                    Please wait...
                                </span>
                            ) : (
                                isLogin ? 'Sign in' : 'Create account'
                            )}
                        </button>

                        {isLogin && (
                            <button
                                type="button"
                                onClick={enterSandbox}
                                className="w-full py-2.5 border border-n8n-primary text-n8n-primary hover:bg-orange-50 font-medium rounded transition-all duration-200 text-sm"
                            >
                                Enter presentation sandbox
                            </button>
                        )}

                        {/* Forgot Password Link (only for login) */}
                        {isLogin && (
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    className="text-sm text-primary hover:text-primary-shade font-medium transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Toggle Between Login/Signup */}
                    <div className="mt-6 pt-6 border-t border-foreground text-center">
                        <p className="text-sm text-text">
                            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                }}
                                className="text-primary hover:text-primary-shade font-medium transition-colors"
                            >
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center space-y-2">
                    <p className="text-xs text-text-tint1">
                        By signing in you agree to our{' '}
                        <a href="#" className="text-[#FF6D5A] hover:text-[#FF5544] transition-colors">
                            Terms of Service
                        </a>
                        {' and '}
                        <a href="#" className="text-[#FF6D5A] hover:text-[#FF5544] transition-colors">
                            Privacy Policy
                        </a>
                    </p>
                    <p className="text-xs text-gray-400">
                        Version 1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
};
