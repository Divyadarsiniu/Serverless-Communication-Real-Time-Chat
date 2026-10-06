import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { X, Upload, User as UserIcon, Check } from 'lucide-react';

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG/JPG/WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be under 2MB.');
      return;
    }

    setError('');
    setUploading(true);
    setSuccess(false);

    try {
      const avatarUrl = await apiService.uploadAvatar(user.userId, file, user.token);
      updateUser({ avatarUrl });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem'
      }}
    >
      <div
        className="auth-card"
        style={{ maxWidth: '420px', position: 'relative' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          User Profile
        </h3>

        {/* Avatar Display */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '0.75rem',
              border: '2px solid var(--accent-primary)'
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <UserIcon size={36} color="var(--text-secondary)" />
            )}
          </div>

          <label
            className="btn btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '0.45rem 1rem',
              width: 'auto',
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            <Upload size={14} />
            <span>{uploading ? 'Uploading to S3...' : 'Upload Avatar'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          {success && (
            <span style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Check size={14} /> Avatar updated successfully!
            </span>
          )}
          {error && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
              {error}
            </span>
          )}
        </div>

        {/* Profile Info Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <div className="form-label" style={{ fontSize: '0.75rem' }}>Username</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.username}</div>
          </div>
          <div>
            <div className="form-label" style={{ fontSize: '0.75rem' }}>Email</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
          </div>
          <div>
            <div className="form-label" style={{ fontSize: '0.75rem' }}>User ID (Cognito Sub)</div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              {user?.userId}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ marginTop: '1.5rem' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
