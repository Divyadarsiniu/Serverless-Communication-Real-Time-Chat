import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import MessageCard from './MessageCard';
import MessageInput from './MessageInput';
import { MessageSquare, User as UserIcon, ShieldCheck, AlertCircle, X, Zap, Activity } from 'lucide-react';

export default function ChatWindow() {
  const { user } = useAuth();
  const {
    activeRecipient,
    messages,
    sendMessage,
    markMessagesAsSeen,
    loadingHistory,
    sendError,
    clearSendError
  } = useChat();
  const messagesEndRef = useRef(null);

  // Auto scroll to latest message smoothly
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeRecipient) {
    return (
      <main className="chat-pane">
        <div className="empty-state">
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, var(--accent-light) 0%, rgba(6, 182, 212, 0.15) 100%)',
              border: '1px solid var(--border-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px -4px var(--accent-glow)'
            }}
          >
            <MessageSquare size={34} color="var(--accent-primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Select a Communication Node
            </h3>
            <p style={{ maxWidth: '420px', marginTop: '0.65rem', fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Select an available user from the constellation on the left to establish a real-time event-driven link.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              padding: '0.55rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            <span>Encrypted in transit via AWS API Gateway WSS & TLS</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-pane">
      {/* Live Connection Arena Header: You ──── ⚡ ──── Recipient */}
      <div className="arena-header">
        {/* Recipient Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid var(--border-light)'
              }}
            >
              {activeRecipient.avatarUrl ? (
                <img
                  src={activeRecipient.avatarUrl}
                  alt={activeRecipient.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <UserIcon size={22} color="var(--text-secondary)" />
              )}
            </div>
            <span
              className={`status-dot ${
                activeRecipient.isOnline ? 'status-online' : 'status-offline'
              }`}
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                border: '2px solid var(--bg-secondary)'
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
              {activeRecipient.username}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: activeRecipient.isOnline ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Activity size={12} />
              <span>{activeRecipient.isOnline ? 'Live Presence' : 'Offline • DynamoDB Buffer'}</span>
            </div>
          </div>
        </div>

        {/* Central Conduit: You ──── ⚡ ──── Recipient */}
        <div className="connection-conduit">
          <div className="conduit-node" style={{ color: 'var(--text-secondary)' }}>
            <span>You</span>
          </div>
          <div className="conduit-line">
            <div className="conduit-line-bar" />
            <Zap size={13} color="var(--accent-primary)" style={{ animation: 'spin 4s linear infinite' }} />
            <div className="conduit-line-bar" />
          </div>
          <div className="conduit-node" style={{ color: 'var(--accent-primary)' }}>
            <span>{activeRecipient.username}</span>
          </div>
        </div>

        {/* Message count & Security info */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          <div>{messages.length} message{messages.length === 1 ? '' : 's'}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)' }}>Serverless Real-Time</div>
        </div>
      </div>

      {/* Messages Feed with Asymmetric Cards */}
      <div className="messages-feed">
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Retrieving conversation history from DynamoDB...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No transmissions yet</p>
            <p style={{ fontSize: '0.8rem' }}>Type below to dispatch your first message over WebSocket.</p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageCard
              key={m.messageId}
              message={m}
              isSent={m.senderId === user?.userId}
              onSeen={(id) => markMessagesAsSeen([id])}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Error Alert (No Silent Failure) */}
      {sendError && (
        <div
          style={{
            margin: '0 2rem 1rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '14px',
            color: '#f87171',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{sendError}</span>
          </div>
          <button
            onClick={clearSendError}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dock Input */}
      <MessageInput onSendMessage={sendMessage} disabled={!activeRecipient} />
    </main>
  );
}
