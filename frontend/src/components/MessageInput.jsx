import React, { useState } from 'react';
import { Send, Zap } from 'lucide-react';

export default function MessageInput({ onSendMessage, disabled }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(trimmed);
      setText('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-dock">
      <div className="dock-field-wrap">
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-primary)', paddingLeft: '0.25rem' }}>
          <Zap size={16} />
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Select a user connection to begin chatting...' : 'Type a message... (Press Enter to transmit)'}
          disabled={disabled || isSending}
          maxLength={4000}
          className="dock-input"
        />

        <button
          type="submit"
          disabled={disabled || !text.trim() || isSending}
          className="btn btn-primary"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            opacity: disabled || !text.trim() || isSending ? 0.45 : 1,
            cursor: disabled || !text.trim() || isSending ? 'not-allowed' : 'pointer',
            flexShrink: 0
          }}
        >
          <Send size={15} />
          <span>Transmit</span>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>Direct WebSocket Transmission • Stored in DynamoDB</span>
        {text.length > 2500 && (
          <span>{text.length} / 4000 characters</span>
        )}
      </div>
    </form>
  );
}
