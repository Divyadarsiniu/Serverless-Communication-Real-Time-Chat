import { config } from '../config';

const MESSAGES_STORAGE_PREFIX = 'serverless_chat_msgs_';

export const apiService = {
  /**
   * Fetch registered users
   */
  async getUsers(token) {
    if (config.isLiveAws) {
      if (!config.restApiUrl) {
        throw new Error('VITE_REST_API_URL is not configured in .env for Live AWS Mode.');
      }

      const response = await fetch(`${config.restApiUrl}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`AWS API Gateway failed to fetch users (HTTP ${response.status})`);
      }
      const result = await response.json();
      return result.data || [];
    }

    // LOCAL DEMO MODE
    const mockUsers = JSON.parse(localStorage.getItem('serverless_chat_mock_users') || '[]');
    return mockUsers.map(u => ({
      userId: u.userId,
      username: u.username,
      email: u.email,
      avatarUrl: u.avatarUrl || '',
      isOnline: true,
      lastSeen: new Date().toISOString()
    }));
  },

  /**
   * Fetch historical messages for a conversation (Authoritative DynamoDB in AWS Mode)
   */
  async getMessages(conversationId, token) {
    if (config.isLiveAws) {
      if (!config.restApiUrl) {
        throw new Error('VITE_REST_API_URL is not configured in .env for Live AWS Mode.');
      }

      const response = await fetch(`${config.restApiUrl}/messages/${encodeURIComponent(conversationId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`AWS API Gateway failed to query DynamoDB history (HTTP ${response.status})`);
      }
      const result = await response.json();
      return result.data?.messages || [];
    }

    // LOCAL DEMO MODE
    const localData = localStorage.getItem(MESSAGES_STORAGE_PREFIX + conversationId);
    return localData ? JSON.parse(localData) : [];
  },

  /**
   * Cache message to localStorage for client-side UI convenience
   */
  saveMessageLocally(conversationId, message) {
    try {
      const key = MESSAGES_STORAGE_PREFIX + conversationId;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.some(m => m.messageId === message.messageId)) {
        existing.push(message);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (e) {
      console.warn('Local cache warning:', e);
    }
  },

  /**
   * Upload user profile avatar via S3 pre-signed URL
   */
  async uploadAvatar(userId, file, token) {
    if (config.isLiveAws) {
      if (!config.restApiUrl) {
        throw new Error('VITE_REST_API_URL is not configured for Live AWS Mode.');
      }

      // 1. Request pre-signed S3 upload URL from API Gateway Lambda
      const presignedResponse = await fetch(`${config.restApiUrl}/profile/avatar-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          contentType: file.type || 'image/jpeg'
        })
      });

      if (!presignedResponse.ok) {
        throw new Error(`Failed to obtain S3 pre-signed URL from API Gateway (HTTP ${presignedResponse.status})`);
      }

      const { data } = await presignedResponse.json();
      const { uploadUrl, avatarUrl } = data;

      // 2. Upload raw binary file directly to Amazon S3
      const s3Upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/jpeg'
        },
        body: file
      });

      if (!s3Upload.ok) {
        throw new Error(`Failed to upload file directly to Amazon S3 bucket (HTTP ${s3Upload.status})`);
      }

      return avatarUrl;
    }

    // LOCAL DEMO MODE
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const users = JSON.parse(localStorage.getItem('serverless_chat_mock_users') || '[]');
        const idx = users.findIndex(u => u.userId === userId);
        if (idx !== -1) {
          users[idx].avatarUrl = dataUrl;
          localStorage.setItem('serverless_chat_mock_users', JSON.stringify(users));
        }
        resolve(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }
};
