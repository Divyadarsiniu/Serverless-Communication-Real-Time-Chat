# System Architecture & Real-Time Production Message Flow

## 1. High-Level Architecture Overview

The **Serverless Communication Through Real-Time Chat** platform is engineered using a 100% serverless, event-driven architecture on Amazon Web Services (AWS). It replaces traditional stateful servers (such as an Express/Socket.io or Django server on EC2) with managed cloud primitives that automatically scale to zero when idle and scale instantaneously under load.

```
                    +-----------------------+
                    |       User            |
                    | Web Browser / Client  |
                    +-----------+-----------+
                                |
                         HTTPS / WSS (Port 443)
                                |
                    +-----------v-----------+
                    | Frontend Application  |
                    | React SPA (Vite)      |
                    +-----+-----------+-----+
                          |           |
               Cognito    |           | REST & WebSocket
               Auth (SRP) |           |
                    +-----v-----+   +-v------------------+
                    |  Cognito  |   |   API Gateway      |
                    | User Pool |   |  REST & WebSocket  |
                    +-----------+   +---------+----------+
                                              |
                                      +-------v-------+
                                      |  AWS Lambda   |
                                      +-------+-------+
                                              |
                          +-------------------+-------------------+
                          |                   |                   |
                    +-----v-----+       +-----v-----+       +-----v-----+
                    | DynamoDB  |       | DynamoDB  |       |    S3     |
                    | Messages  |       |Connections|       |  Storage  |
                    +-----------+       +-----------+       +-----------+
```

---

## 2. Modes of Operation: LIVE AWS vs. LOCAL DEMO

To eliminate ambiguity during academic evaluation and viva voce demonstrations, the application enforces two explicit, strictly separated modes:

| Feature | 🟢 LIVE AWS MODE | 🟡 LOCAL DEMO MODE |
| :--- | :--- | :--- |
| **Authentication** | Amazon Cognito User Pool (SRP / RS256 JWT) | Local in-memory / browser user sessions |
| **Real-Time Transport** | AWS API Gateway WebSocket API (`wss://`) | Browser `BroadcastChannel` real-time bus |
| **Data Persistence** | Amazon DynamoDB (`chat_messages`, `chat_connections`) | Browser `localStorage` cache |
| **Media Storage** | Amazon S3 via Pre-Signed PUT URLs | Local Data URL conversion |
| **Silent Fallback?** | **STRICTLY FORBIDDEN.** Displays `"Unable to connect to AWS real-time service"` if AWS is down. | N/A (Runs entirely client-side for rapid development) |
| **UI Indicator** | `🟢 LIVE AWS` badge in Navbar & Dev Panel | `🟡 LOCAL DEMO` badge in Navbar & Dev Panel |

---

## 3. Production Real-Time Message Path (ZERO POLLING)

Real-time message delivery is achieved with **zero HTTP polling** (`setInterval` is never used for messaging). The exact production message lifecycle is:

```
Client A (Alice)
   │
   ▼ [1. WSS Frame: {"action":"sendMessage", "recipientId":"B", "message":"Hello Bob"}]
Amazon API Gateway (WebSocket API)
   │
   ▼ [2. Routes action 'sendMessage' via AWS_PROXY integration]
AWS Lambda (ws_send_message)
   │
   ├──▶ [3. Validates sender authentication & payload bounds (max 4,000 chars)]
   │
   ├──▶ [4. Persists message record in Amazon DynamoDB (chat_messages) as Authoritative Store]
   │
   ├──▶ [5. Queries DynamoDB (chat_connections) via GSI 'UserIdIndex' to locate ALL active Bob connections]
   │
   ▼ [6. Calls ApiGatewayManagementApi.post_to_connection(ConnectionId=B)]
Amazon API Gateway Management API
   │
   ▼ [7. Pushes message payload down active WSS socket]
Client B (Bob) ──▶ [8. WebSocket onmessage event triggers instant React state update without page refresh]
   │
   ▼ [9. Lambda echoes delivery confirmation back to Client A]
Client A (Alice) ──▶ [10. UI updates message checkmark to 'Delivered']
```

---

## 4. Multi-Device / Multi-Connection Support

A real-world chat application must support a single user being connected simultaneously from multiple browser tabs or devices (e.g., Bob's laptop and Bob's phone).

### Architectural Implementation:
1. When Bob opens Tab 1, `$connect` saves `connectionId_1` with `userId = Bob` in `chat_connections`.
2. When Bob opens Tab 2, `$connect` saves `connectionId_2` with `userId = Bob` in `chat_connections`.
3. When Alice sends a message to Bob, `ws_send_message` queries `UserIdIndex` on `chat_connections`.
4. The query returns **both** `connectionId_1` and `connectionId_2`.
5. Lambda iterates through the list and invokes `post_to_connection` on **every active connection**, ensuring all Bob devices receive the message simultaneously.

---

## 5. Stale Connection Handling (`GoneException` 410)

If a user abruptly loses connection or closes their browser without completing the clean WebSocket TCP close handshake:
1. `post_to_connection` returns a `GoneException` (HTTP 410 Gone).
2. The Lambda function catches `GoneException` in an exception block.
3. It immediately executes `delete_item` against `chat_connections` for that specific stale connection ID.
4. It logs `[STALE_CONNECTION] connectionId=...` in Amazon CloudWatch.
5. It continues delivering to any other active connections for the recipient without failing the message.

---

## 6. Real-Time Presence Mechanics

User presence (`isOnline`) is strictly synchronized with real WebSocket sessions:
1. **On `$connect`:** User is marked `isOnline = True` in `chat_users`.
2. **On `$disconnect`:**
   - The dropping `connectionId` is deleted from `chat_connections`.
   - Lambda queries `chat_connections` for any remaining connections belonging to that `userId`.
   - **If remaining == 0:** User is set to `isOnline = False` and `lastSeen` timestamp is updated.
   - **If remaining > 0:** User is still active on another tab or device; `isOnline` remains `True`.

---

## 7. Functional Read Receipt Lifecycle (SENT → DELIVERED → SEEN)

The application enforces an end-to-end status lifecycle with zero client-side simulation:

```
[User A Sends] ──▶ DynamoDB (deliveryStatus = 'SENT') ──▶ [✓ Sent]
                      │
                      ▼
[Socket Reached] ──▶ API Gateway post_to_connection ──▶ DynamoDB ('DELIVERED') ──▶ [✓✓ Delivered]
                      │
                      ▼
[User B Observes in Viewport] ──▶ IntersectionObserver triggers action 'markSeen'
                                         │
                                         ▼
                                   AWS Lambda ws_mark_seen
                                   - Validates caller is authentic recipient (receiverId == callerId)
                                   - Updates DynamoDB ('SEEN', seenAt = now())
                                   - Pushes 'message_status_update' to User A
                                         │
                                         ▼
                                   User A receives WebSocket event ──▶ [✓✓ Seen (Glowing Accent)]
```
