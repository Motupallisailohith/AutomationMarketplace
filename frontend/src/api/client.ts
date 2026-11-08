import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if this is an auth endpoint or if token is definitely invalid
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const hasToken = localStorage.getItem('auth_token');
      
      // If this is an auth endpoint failure or we have no token, redirect to login
      if (isAuthEndpoint || !hasToken) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      // Otherwise, just log the error but don't logout - might be a backend issue
      else {
        console.error('API 401 error (not logging out):', error.config?.url);
      }
    }
    return Promise.reject(error);
  }
);
