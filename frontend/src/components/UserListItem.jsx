import React from 'react';
import { User as UserIcon } from 'lucide-react';

export default function UserListItem({ user, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`user-item ${isSelected ? 'active' : ''}`}
    >
      {/* Avatar with Status indicator */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '1px solid var(--border-light)'
          }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <UserIcon size={20} color="var(--text-secondary)" />
          )}
        </div>
        <span
          className={`status-dot ${user.isOnline ? 'status-online' : 'status-offline'}`}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            border: '2px solid var(--bg-secondary)'
          }}
        />
      </div>

      {/* User Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2px'
          }}
        >
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {user.username}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {user.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {user.email || 'Cloud User'}
        </div>
      </div>
    </div>
  );
}
