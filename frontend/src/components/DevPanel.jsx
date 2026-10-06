import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { websocketService } from '../services/websocketService';
import { config } from '../config';
import { Terminal, ChevronUp, ChevronDown, Radio, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function DevPanel() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState(websocketService.debugInfo);

  useEffect(() => {
    const unsub = websocketService.subscribeDebug((info) => {
      setDebugInfo(info);
    });
    return unsub;
  }, []);

  const isConnected = debugInfo.status === 'Connected';
  const isAws = config.isLiveAws;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: '24px',
        zIndex: 40,
        width: isOpen ? '420px' : 'auto',
        maxWidth: 'calc(100vw - 48px)',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderBottom: 'none',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'monospace'
      }}
    >
      {/* Header / Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          fontWeight: 600
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={15} color="var(--accent-primary)" />
          <span>Cloud Telemetry Panel</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              backgroundColor: isAws ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: isAws ? '#34d399' : '#fbbf24',
              fontWeight: 700
            }}
          >
            {isAws ? '🟢 LIVE AWS' : '🟡 LOCAL DEMO'}
          </span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Expanded Panel Details */}
      {isOpen && (
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          {/* Connection Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Connection Status:</span>
            <span
              style={{
                color: isConnected ? 'var(--success)' : 'var(--danger)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)'
                }}
              />
              {debugInfo.status.toUpperCase()}
            </span>
          </div>

          {/* Mode Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Architecture Mode:</span>
            <span style={{ fontWeight: 600, color: isAws ? '#34d399' : '#fbbf24' }}>
              {isAws ? 'LIVE AWS SERVERLESS' : 'LOCAL DEMO (DEVELOPMENT)'}
            </span>
          </div>

          {/* Real-Time Transport */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Message Transport:</span>
            <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>
              {debugInfo.transport}
            </span>
          </div>

          {/* WebSocket Endpoint */}
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>WebSocket Endpoint:</div>
            <div
              style={{
                padding: '0.35rem 0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                wordBreak: 'break-all',
                color: isAws ? 'var(--accent-hover)' : 'var(--text-muted)'
              }}
            >
              {debugInfo.endpoint}
            </div>
          </div>

          {/* Authenticated User */}
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Authenticated Cognito User:</div>
            <div
              style={{
                padding: '0.35rem 0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                color: 'var(--text-primary)'
              }}
            >
              {user ? `${user.username} (sub: ${user.userId})` : 'Not Authenticated'}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Connected At:</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {debugInfo.connectedAt ? new Date(debugInfo.connectedAt).toLocaleTimeString() : 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Event:</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {debugInfo.lastEventAt ? new Date(debugInfo.lastEventAt).toLocaleTimeString() : 'None'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Event Type:</span>
            <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
              {debugInfo.lastEventType}
            </span>
          </div>

          {/* Security Notice */}
          <div
            style={{
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Shield size={12} color="var(--success)" />
            <span>Zero-Secret UI: Tokens and AWS keys are strictly hidden.</span>
          </div>
        </div>
      )}
    </div>
  );
}
