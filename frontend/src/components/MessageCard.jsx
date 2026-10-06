import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck, Eye, Clock } from 'lucide-react';

export default function MessageCard({ message, isSent, onSeen }) {
  const cardRef = useRef(null);

  // Read receipt viewport detection via IntersectionObserver
  // Only triggers if current user is the recipient AND status is not already SEEN
  useEffect(() => {
    if (isSent) return;
    if (message.deliveryStatus === 'SEEN') return;
    if (!cardRef.current || !onSeen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            onSeen(message.messageId);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [message.messageId, message.deliveryStatus, isSent, onSeen]);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const status = message.deliveryStatus || (message.status === 'delivered' ? 'DELIVERED' : 'SENT');
  const isDelivered = status === 'DELIVERED' || status === 'SEEN';
  const isSeen = status === 'SEEN';

  return (
    <div
      ref={cardRef}
      className={`message-card-wrapper ${isSent ? 'sent' : 'received'}`}
      data-msg-id={message.messageId}
    >
      <div className={`message-card ${isSent ? 'sent' : 'received'}`}>
        {!isSent && (
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--accent-primary)',
              marginBottom: '0.35rem',
              letterSpacing: '0.02em'
            }}
          >
            {message.senderUsername || 'Contact'}
          </div>
        )}

        <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {message.message}
        </div>

        <div className="message-meta" style={{ justifyContent: isSent ? 'flex-end' : 'flex-start' }}>
          <span>{formatTime(message.timestamp || message.sentAt)}</span>

          {isSent && (
            <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.25rem' }}>
              {isSeen ? (
                <span
                  className="delivery-badge seen"
                  title={`Seen: Observed by recipient at ${message.seenAt ? new Date(message.seenAt).toLocaleTimeString() : 'now'}`}
                >
                  <Eye size={12} strokeWidth={2.5} />
                  <span>Seen</span>
                </span>
              ) : isDelivered ? (
                <span
                  className="delivery-badge delivered"
                  title="Delivered: Active API Gateway WebSocket connection reached"
                >
                  <CheckCheck size={12} strokeWidth={2.5} />
                  <span>Delivered</span>
                </span>
              ) : (
                <span
                  className="delivery-badge sent"
                  title="Sent: Persisted in DynamoDB (Recipient offline)"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Sent</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
