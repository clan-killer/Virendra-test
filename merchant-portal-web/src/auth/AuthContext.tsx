// src/auth/AuthContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api';

type AuthState = { token: string | null; email: string | null };

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Keep basename consistent with BrowserRouter
//const BASENAME = '/merchantPortal';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));

  const value = useMemo(
    () => ({
      token,
      email,

      // Calls /api/auth/login via Nginx; stores token/email
      async login(emailInput: string, password: string) {
        const { data } = await api.post('/auth/login', { email: emailInput, password });

        // Adjust to your backend's response shape:
        const accessToken: string | undefined = data?.access_token ?? data?.accessToken ?? data?.token;
        const userEmail: string = data?.user?.email ?? emailInput;

        if (!accessToken) {
          throw new Error('Login response missing access token');
        }

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('email', userEmail);
        setToken(accessToken);
        setEmail(userEmail);
      },

      // Optional: /api/auth/register (adjust to your API as needed)
      async register(name: string, emailInput: string, password: string) {
        const { data } = await api.post('/auth/register', { name, email: emailInput, password });

        // If your API auto-logs in on register:
        const accessToken: string | undefined = data?.access_token ?? data?.accessToken ?? data?.token;
        const userEmail: string = data?.user?.email ?? emailInput;

        if (accessToken) {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('email', userEmail);
          setToken(accessToken);
          setEmail(userEmail);
        }
      },

      logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('email');
        setToken(null);
        setEmail(null);
        // Respect basename
        window.location.href = '/login';
      },
    }),
    [token, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};