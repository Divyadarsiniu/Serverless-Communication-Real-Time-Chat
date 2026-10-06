import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { config } from '../config';
import { LogIn, AlertCircle, Cloud, Server, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage({ onNavigateRegister, onNavigateHome }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAws = config.isLiveAws;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to authenticate with Amazon Cognito.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass-strong)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <button
          onClick={onNavigateHome}
          className="btn btn-ghost"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Overview</span>
        </button>

        <Logo size="sm" />

        <ThemeToggle />
      </header>

      {/* Main Auth View */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {/* Mode Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <div className={`mode-badge ${isAws ? 'mode-aws' : 'mode-mock'}`}>
              {isAws ? <Cloud size={13} /> : <Server size={13} />}
              <span>{isAws ? '🟢 LIVE AWS MODE' : '🟡 LOCAL DEMO MODE'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Sign In to Yapper
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {isAws ? 'Authenticate via Amazon Cognito User Pool' : 'Connect to the local serverless simulation'}
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
            >
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo 1-Click Accounts */}
          {config.isLocalDemo && (
            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-color)',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Local Demo 1-Click Users:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@example.com')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Alice
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('bob@example.com')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Bob
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('charlie@example.com')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Charlie
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}
          >
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onNavigateRegister}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
