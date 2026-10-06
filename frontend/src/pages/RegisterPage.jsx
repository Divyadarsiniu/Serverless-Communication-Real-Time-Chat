import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { config } from '../config';
import { UserPlus, AlertCircle, CheckCircle2, Cloud, Server, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

export default function RegisterPage({ onNavigateLogin, onNavigateHome }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAws = config.isLiveAws;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(username, email, password);
      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        onNavigateLogin();
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
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
            maxWidth: '480px',
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
              Join Yapper
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {isAws ? 'Create a new Amazon Cognito identity' : 'Create your local simulated identity'}
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

          {success && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: '#34d399',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Display Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Alice"
                required
              />
            </div>

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
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              <UserPlus size={18} />
              <span>{loading ? 'Creating Identity...' : 'Create Account'}</span>
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}
          >
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
