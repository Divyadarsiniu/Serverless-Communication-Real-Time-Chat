import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

export default function MessageBubble({ message, isSent }) {
  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isDelivered = message.status === 'delivered';

  return (
    <div className={`message-row ${isSent ? 'sent' : 'received'}`}>
      <div className={`bubble ${isSent ? 'sent' : 'received'}`}>
        {message.message}
      </div>
      <div className="message-meta">
        <span>{formatTime(message.timestamp)}</span>
        {isSent && (
          <span
            title={
              isDelivered
                ? 'Delivered: Active WebSocket connection received payload'
                : 'Sent: Stored in DynamoDB (Recipient was offline)'
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
          >
            {isDelivered ? (
              <>
                <CheckCheck size={13} color="var(--accent-hover)" />
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-hover)' }}>Delivered</span>
              </>
            ) : (
              <>
                <Check size={13} color="var(--text-muted)" />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sent (Offline)</span>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
