import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    const existing = authService.getCurrentUser();
    if (existing) {
      setUser(existing);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const session = await authService.signIn(email, password);
    setUser(session);
    return session;
  };

  const register = async (username, email, password) => {
    return await authService.signUp(username, email, password);
  };

  const logout = () => {
    authService.signOut();
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      sessionStorage.setItem('serverless_chat_session', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
