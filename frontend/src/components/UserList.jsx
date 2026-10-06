import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import UserListItem from './UserListItem';
import { Search, RotateCw, Users } from 'lucide-react';

export default function UserList() {
  const { users, refreshUsers, activeRecipient, setActiveRecipient } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUsers();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

  return (
    <aside className="sidebar">
      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1rem 0.75rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Available Users</h2>
          <span
            style={{
              fontSize: '0.75rem',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '0.1rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-secondary)'
            }}
          >
            {users.length}
          </span>
        </div>

        <button
          onClick={handleRefresh}
          title="Refresh user list"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <RotateCw size={16} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '0.75rem 1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '10px' }}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
        {filteredUsers.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}
          >
            {searchTerm ? 'No users matching search.' : 'No other registered users yet.'}
          </div>
        ) : (
          filteredUsers.map((u) => (
            <UserListItem
              key={u.userId}
              user={u}
              isSelected={activeRecipient?.userId === u.userId}
              onClick={() => setActiveRecipient(u)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
