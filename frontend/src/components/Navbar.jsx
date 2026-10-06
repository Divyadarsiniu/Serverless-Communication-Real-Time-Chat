import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { config } from '../config';
import { LogOut, User as UserIcon, Cloud, Server, AlertTriangle } from 'lucide-react';
import ProfileModal from './ProfileModal';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connectionStatus } = useChat();
  const [showProfile, setShowProfile] = useState(false);

  const isAws = config.isLiveAws;
  const isError = connectionStatus.includes('Unable') || connectionStatus === 'Disconnected';

  return (
    <>
      <header className="navbar">
        {/* Brand with enhanced Yapper vector logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo size="md" />
        </div>

        {/* Center / Mode indicator & Connection state */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Explicit Mode Badge */}
          <div
            className={`mode-badge ${isAws ? 'mode-aws' : 'mode-mock'}`}
            style={{ fontWeight: 700 }}
          >
            {isAws ? <Cloud size={14} /> : <Server size={14} />}
            <span>{isAws ? '🟢 LIVE AWS' : '🟡 LOCAL DEMO'}</span>
          </div>

          {/* Connection Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              color: isError ? '#f87171' : 'var(--text-secondary)',
              backgroundColor: isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`
            }}
          >
            {isError ? (
              <AlertTriangle size={13} color="#f87171" />
            ) : (
              <span
                className={`status-dot ${
                  connectionStatus === 'Connected' ? 'status-online' : 'status-offline'
                }`}
              />
            )}
            <span style={{ fontWeight: 600 }}>{connectionStatus}</span>
          </div>
        </div>

        {/* Right side: Day/Night Toggle, User & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Global Day / Night Theme Toggle */}
          <ThemeToggle />

          {/* User Profile trigger */}
          <button
            onClick={() => setShowProfile(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.35rem 0.85rem 0.35rem 0.45rem',
              borderRadius: '9999px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'all 0.2s ease'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid var(--border-light)'
              }}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <UserIcon size={16} color="var(--text-secondary)" />
              )}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.username}</span>
          </button>

          {/* Log Out */}
          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.55rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease'
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
