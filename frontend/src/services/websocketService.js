import { config } from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.debugListeners = new Set();
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.currentUser = null;
    this.isConnected = false;
    this.broadcastChannel = null;

    // Telemetry state for developer/debug inspector
    this.debugInfo = {
      mode: config.mode,
      status: 'Disconnected',
      endpoint: config.isLiveAws ? config.wsApiUrl : 'N/A (Local Demo Bus)',
      connectedAt: null,
      lastEventAt: null,
      lastEventType: 'None',
      transport: config.isLiveAws ? 'AWS API Gateway WebSocket (WSS)' : 'Local BroadcastChannel (Demo)',
      reconnectAttempts: 0
    };

    // ONLY initialize BroadcastChannel if in LOCAL DEMO mode
    if (config.isLocalDemo && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('serverless_chat_local_demo_bus');
        this.broadcastChannel.onmessage = (event) => {
          this.recordDebugEvent('incoming_message', 'Local BroadcastChannel');
          this.handleIncomingData(event.data);
        };
      } catch (err) {
        console.warn('[LOCAL_DEMO] BroadcastChannel unavailable:', err);
      }
    }
  }

  recordDebugEvent(type, detail) {
    this.debugInfo.lastEventAt = new Date().toISOString();
    this.debugInfo.lastEventType = `${type} (${detail || ''})`;
    this.notifyDebugChange();
  }

  /**
   * Establish real-time connection
   */
  connect(user) {
    this.currentUser = user;
    if (!user) return;

    // =========================================================
    // LOCAL DEMO MODE: Dedicated local simulation path
    // =========================================================
    if (config.isLocalDemo) {
      this.isConnected = true;
      this.debugInfo.status = 'Connected';
      this.debugInfo.connectedAt = new Date().toISOString();
      this.debugInfo.transport = 'Local BroadcastChannel (Demo)';
      this.notifyStatusChange('Connected');
      this.recordDebugEvent('connect', 'Local Demo Bus Established');
      return;
    }

    // =========================================================
    // LIVE AWS MODE: Strictly AWS API Gateway WebSocket
    // =========================================================
    const cleanUrl = config.wsApiUrl.replace(/\/$/, '');
    const wsUrl = `${cleanUrl}?token=${encodeURIComponent(user.token || '')}&userId=${encodeURIComponent(user.userId)}&username=${encodeURIComponent(user.username)}`;

    this.notifyStatusChange('Connecting...');
    this.debugInfo.status = 'Connecting...';
    this.debugInfo.endpoint = cleanUrl;
    this.notifyDebugChange();

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[AWS_WEBSOCKET] Successfully connected to API Gateway:', cleanUrl);
        this.isConnected = true;
        this.debugInfo.reconnectAttempts = 0;
        this.debugInfo.status = 'Connected';
        this.debugInfo.connectedAt = new Date().toISOString();
        this.notifyStatusChange('Connected');
        this.recordDebugEvent('connected', 'AWS API Gateway WSS Handshake OK');
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.recordDebugEvent('incoming_message', payload.type || 'payload');
          this.handleIncomingData(payload);
        } catch (err) {
          console.warn('[AWS_WEBSOCKET] Non-JSON payload received:', event.data);
        }
      };

      this.socket.onerror = (err) => {
        console.error('[AWS_WEBSOCKET] Socket connection error:', err);
        this.isConnected = false;
        this.debugInfo.status = 'Unable to connect to AWS real-time service';
        this.notifyStatusChange('Unable to connect to AWS real-time service');
        this.recordDebugEvent('error', 'WebSocket Handshake/Transport Error');
      };

      this.socket.onclose = (event) => {
        console.log(`[AWS_WEBSOCKET] Connection closed: Code=${event.code}, Reason=${event.reason || 'None'}`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.debugInfo.status = 'Disconnected';
        this.notifyStatusChange('Disconnected');
        this.recordDebugEvent('disconnect', `Code ${event.code}`);

        // Reconnect automatically with exponential backoff (unless intentional logout)
        if (this.currentUser && config.isLiveAws) {
          this.debugInfo.reconnectAttempts += 1;
          const delay = Math.min(1000 * Math.pow(1.5, this.debugInfo.reconnectAttempts), 10000);
          this.notifyStatusChange('Reconnecting...');
          this.debugInfo.status = 'Reconnecting...';
          this.notifyDebugChange();

          this.reconnectTimer = setTimeout(() => {
            console.log(`[AWS_WEBSOCKET] Reconnecting attempt #${this.debugInfo.reconnectAttempts}...`);
            this.connect(this.currentUser);
          }, delay);
        }
      };
    } catch (err) {
      console.error('[AWS_WEBSOCKET] Fatal connection initialization error:', err);
      this.isConnected = false;
      this.debugInfo.status = 'Unable to connect to AWS real-time service';
      this.notifyStatusChange('Unable to connect to AWS real-time service');
      this.notifyDebugChange();
    }
  }

  handleIncomingData(payload) {
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (e) {
        console.error('Error in message listener:', e);
      }
    });
  }

  /**
   * Send a real-time message
   */
  sendMessage({ recipientId, recipientUsername, messageText }) {
    if (!this.currentUser) {
      throw new Error('Cannot send message: User is not authenticated');
    }

    // =========================================================
    // LOCAL DEMO MODE: Dispatches to local bus for offline testing
    // =========================================================
    if (config.isLocalDemo) {
      const mockRecord = {
        type: 'message',
        data: {
          conversationId: [this.currentUser.userId, recipientId].sort().join('#'),
          messageId: 'mock-msg-' + Math.random().toString(36).substring(2, 9),
          senderId: this.currentUser.userId,
          senderUsername: this.currentUser.username,
          receiverId: recipientId,
          receiverUsername: recipientUsername,
          message: messageText,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }
      };

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(mockRecord);
      }
      this.handleIncomingData(mockRecord);
      this.recordDebugEvent('sendMessage', 'Dispatched via Local Demo Bus');
      return Promise.resolve(mockRecord.data);
    }

    // =========================================================
    // LIVE AWS MODE: Must use real AWS API Gateway WebSocket
    // =========================================================
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.recordDebugEvent('send_failed', 'WebSocket Not Open');
      throw new Error('Unable to send message: AWS real-time WebSocket is disconnected.');
    }

    const payload = {
      action: 'sendMessage',
      senderId: this.currentUser.userId,
      senderUsername: this.currentUser.username,
      recipientId: recipientId,
      recipientUsername: recipientUsername,
      message: messageText
    };

    this.socket.send(JSON.stringify(payload));
    this.recordDebugEvent('sendMessage', `Dispatched to API Gateway for ${recipientId}`);
    return Promise.resolve();
  }

  /**
   * Mark messages as seen by the recipient (triggers true SENT -> DELIVERED -> SEEN lifecycle)
   */
  markSeen({ conversationId, messageIds, callerId }) {
    if (!messageIds || messageIds.length === 0) return Promise.resolve();

    const targetCallerId = callerId || this.currentUser?.userId;

    // LOCAL DEMO MODE: Broadcast to local channel
    if (config.isLocalDemo) {
      const statusPayload = {
        type: 'message_status_update',
        data: {
          conversationId,
          messageIds,
          status: 'SEEN',
          seenAt: new Date().toISOString(),
          seenBy: targetCallerId
        }
      };
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(statusPayload);
      }
      this.handleIncomingData(statusPayload);
      this.recordDebugEvent('markSeen', `Locally marked ${messageIds.length} msgs as SEEN`);
      return Promise.resolve();
    }

    // LIVE AWS MODE: Send over WebSocket to WsMarkSeenFunction
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.resolve();
    }

    const payload = {
      action: 'markSeen',
      conversationId,
      messageIds,
      callerId: targetCallerId
    };

    this.socket.send(JSON.stringify(payload));
    this.recordDebugEvent('markSeen', `Dispatched markSeen for ${messageIds.length} msgs`);
    return Promise.resolve();
  }

  /**
   * Heartbeat to prevent API Gateway 10-minute idle connection timeout
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ action: 'ping' }));
          this.recordDebugEvent('ping', 'Heartbeat keep-alive sent');
        } catch (e) {
          console.warn('[AWS_WEBSOCKET] Heartbeat failed:', e);
        }
      }
    }, 240000); // 4 minutes
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.currentUser = null;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.debugInfo.status = 'Disconnected';
    this.notifyStatusChange('Disconnected');
    this.recordDebugEvent('disconnect', 'Manual disconnect');
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  notifyStatusChange(status) {
    this.statusListeners.forEach((fn) => fn(status));
  }

  subscribeDebug(callback) {
    this.debugListeners.add(callback);
    callback(this.debugInfo);
    return () => this.debugListeners.delete(callback);
  }

  notifyDebugChange() {
    this.debugListeners.forEach((fn) => fn({ ...this.debugInfo }));
  }
}

export const websocketService = new WebSocketService();
