import { create } from 'zustand';
import { api } from '@api/client';
import { store } from './index';
import { loginSuccess } from './slices/authSlice';

interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
}

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        set({ loading: false, isAuthenticated: false });
        return;
      }

      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: 'Authentication failed',
      });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await api.post('/auth/login', { email, password });
      
      // API returns: { token, user: { id, email, firstName, lastName, role, createdAt, updatedAt } }
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      
      // Dispatch to Redux auth slice
      store.dispatch(loginSuccess({ user, token }));
      
      set({
        user: { ...user, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || 'Login failed',
      });
      throw error;
    }
  },

  signup: async (email: string, password: string, name?: string) => {
    try {
      set({ loading: true, error: null });
      const response = await api.post('/auth/signup', { email, password, name });
      
      // API returns: { token, user: { id, email, firstName, lastName, role, createdAt, updatedAt } }
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      
      // Dispatch to Redux auth slice
      store.dispatch(loginSuccess({ user, token }));
      
      set({
        user: { ...user, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || 'Signup failed',
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
