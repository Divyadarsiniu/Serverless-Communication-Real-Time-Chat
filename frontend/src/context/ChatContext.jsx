import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { websocketService } from '../services/websocketService';
import { apiService } from '../services/apiService';

const ChatContext = createContext(null);

export const computeConversationId = (userA, userB) => {
  return [String(userA), String(userB)].sort().join('#');
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [conversations, setConversations] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sendError, setSendError] = useState('');

  // 1. WebSocket Real-Time Connection Lifecycle
  useEffect(() => {
    if (!user) {
      websocketService.disconnect();
      return;
    }

    websocketService.connect(user);

    const unsubStatus = websocketService.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    // Real-Time Incoming Message & Delivery Ack & Read Receipt Handler (ZERO POLLING)
    const unsubMessages = websocketService.subscribe((payload) => {
      if (payload.type === 'message' || payload.type === 'message_sent_ack') {
        const msg = payload.data;
        if (!msg) return;

        const convId = msg.conversationId || computeConversationId(msg.senderId, msg.receiverId);

        setConversations((prev) => {
          const list = prev[convId] ? [...prev[convId]] : [];
          const idx = list.findIndex((m) => m.messageId === msg.messageId);

          if (idx !== -1) {
            // Update status (e.g. from sent -> delivered)
            list[idx] = { ...list[idx], ...msg };
          } else {
            // New message arrived in real-time
            list.push(msg);
          }
          return { ...prev, [convId]: list };
        });

        // Cache for offline inspection
        apiService.saveMessageLocally(convId, msg);
      } else if (payload.type === 'message_status_update') {
        // True Read Lifecycle: Message marked as SEEN by recipient
        const { conversationId, messageIds, status, seenAt } = payload.data || {};
        if (!conversationId || !messageIds) return;

        setConversations((prev) => {
          const list = prev[conversationId] ? [...prev[conversationId]] : [];
          let changed = false;
          const nextList = list.map((m) => {
            if (messageIds.includes(m.messageId)) {
              changed = true;
              return {
                ...m,
                deliveryStatus: status || 'SEEN',
                seenAt: seenAt || m.seenAt
              };
            }
            return m;
          });
          return changed ? { ...prev, [conversationId]: nextList } : prev;
        });
      }
    });

    return () => {
      unsubStatus();
      unsubMessages();
      websocketService.disconnect();
    };
  }, [user]);

  // 2. Fetch Users List (REST on mount or refresh only)
  const refreshUsers = useCallback(async () => {
    if (!user) return;
    try {
      const allUsers = await apiService.getUsers(user.token);
      const others = allUsers.filter((u) => u.userId !== user.userId);
      setUsers(others);
    } catch (err) {
      console.warn('Error loading users:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  // 3. Load Conversation History when activeRecipient changes (REST on selection only)
  useEffect(() => {
    if (!user || !activeRecipient) return;

    const convId = computeConversationId(user.userId, activeRecipient.userId);

    if (!conversations[convId]) {
      setLoadingHistory(true);
      apiService.getMessages(convId, user.token)
        .then((fetched) => {
          setConversations((prev) => ({
            ...prev,
            [convId]: fetched
          }));
        })
        .catch((err) => {
          console.warn('Error loading messages history:', err);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [user, activeRecipient, conversations]);

  // 4. Send Real-Time Message Handler (Dispatches over WebSocket)
  const sendMessage = async (text) => {
    if (!user || !activeRecipient || !text.trim()) return;

    setSendError('');
    try {
      await websocketService.sendMessage({
        recipientId: activeRecipient.userId,
        recipientUsername: activeRecipient.username,
        messageText: text.trim()
      });
    } catch (err) {
      console.error('[SEND_ERROR]', err);
      setSendError(err.message || 'Failed to send message over AWS WebSocket');
      throw err;
    }
  };

  // 5. Mark Messages As Seen (Triggers Read Lifecycle: SENT -> DELIVERED -> SEEN)
  const seenQueueRef = useRef(new Set());
  const seenTimerRef = useRef(null);

  const markMessagesAsSeen = useCallback((messageIds) => {
    if (!user || !activeRecipient || !messageIds || messageIds.length === 0) return;

    const convId = computeConversationId(user.userId, activeRecipient.userId);
    const toAdd = messageIds.filter(id => !seenQueueRef.current.has(id));
    if (toAdd.length === 0) return;

    toAdd.forEach(id => seenQueueRef.current.add(id));

    if (seenTimerRef.current) clearTimeout(seenTimerRef.current);
    seenTimerRef.current = setTimeout(() => {
      const batch = Array.from(seenQueueRef.current);
      seenQueueRef.current.clear();
      if (batch.length > 0) {
        websocketService.markSeen({
          conversationId: convId,
          messageIds: batch,
          callerId: user.userId
        });

        // Fast optimistic UI update for reader
        setConversations((prev) => {
          const list = prev[convId] ? [...prev[convId]] : [];
          let changed = false;
          const nextList = list.map((m) => {
            if (batch.includes(m.messageId) && m.deliveryStatus !== 'SEEN') {
              changed = true;
              return { ...m, deliveryStatus: 'SEEN', seenAt: new Date().toISOString() };
            }
            return m;
          });
          return changed ? { ...prev, [convId]: nextList } : prev;
        });
      }
    }, 120);
  }, [user, activeRecipient]);

  const activeConversationId = user && activeRecipient
    ? computeConversationId(user.userId, activeRecipient.userId)
    : null;

  const currentMessages = activeConversationId && conversations[activeConversationId]
    ? conversations[activeConversationId]
    : [];

  return (
    <ChatContext.Provider
      value={{
        users,
        refreshUsers,
        activeRecipient,
        setActiveRecipient,
        messages: currentMessages,
        sendMessage,
        markMessagesAsSeen,
        connectionStatus,
        loadingHistory,
        sendError,
        clearSendError: () => setSendError('')
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
};
