import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'login' | 'register'

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
          gap: '0.75rem'
        }}
      >
        <div className="status-dot status-online" />
        <span>Initializing Yapper Serverless Session...</span>
      </div>
    );
  }

  // Unauthenticated user routing
  if (!user) {
    if (authView === 'login') {
      return (
        <LoginPage
          onNavigateRegister={() => setAuthView('register')}
          onNavigateHome={() => setAuthView('landing')}
        />
      );
    }

    if (authView === 'register') {
      return (
        <RegisterPage
          onNavigateLogin={() => setAuthView('login')}
          onNavigateHome={() => setAuthView('landing')}
        />
      );
    }

    // Default to Landing Page
    return (
      <LandingPage
        onNavigateLogin={() => setAuthView('login')}
        onNavigateRegister={() => setAuthView('register')}
      />
    );
  }

  // Authenticated user: Live Communication Canvas
  return (
    <ChatProvider>
      <ChatPage />
    </ChatProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
