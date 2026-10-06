# Comprehensive Viva Voce Examination Questions & Answers
### Project: Serverless Communication Through Real-Time Chat

This guide provides 38 in-depth questions and precise technical answers covering cloud computing theory, AWS services, and project-specific implementation details.

---

### Q1. What is serverless computing?
**Answer:** Serverless computing is a cloud execution model where the cloud provider (AWS) manages machine resource allocation, physical server provisioning, operating system maintenance, runtime patching, and scaling. Developers write application code organized into functions or configure managed services without paying for idle server capacity.

---

### Q2. What is Function-as-a-Service (FaaS)?
**Answer:** FaaS is the compute category of serverless where modular blocks of business logic are executed on demand in response to events. In this project, AWS Lambda serves as the FaaS platform. Functions are ephemeral, stateless, and billed down to the millisecond of active execution.

---

### Q3. Why did you use AWS Lambda instead of a traditional EC2 server?
**Answer:**
1. **Cost Efficiency:** An EC2 instance incurs costs 24/7 even if no users are chatting. Lambda incurs $0.00 during idle periods.
2. **Elastic Scaling:** If 500 users send messages simultaneously, Lambda automatically instantiates 500 execution environments in parallel.
3. **Operational Overhead:** With EC2, we must manage operating system patches, security updates, load balancers, and auto-scaling groups. Lambda abstracts all server management.

---

### Q4. Why did you choose Amazon DynamoDB?
**Answer:** DynamoDB is a fully managed, serverless NoSQL key-value and document database. It delivers single-digit millisecond latency at any scale and offers a `PAY_PER_REQUEST` billing mode, making it ideal for chat applications where fast read/write throughput and cost predictability are essential.

---

### Q5. Why is Amazon API Gateway necessary for WebSockets in a serverless architecture?
**Answer:** AWS Lambda functions are stateless and ephemeral; they cannot maintain a persistent, open TCP connection with a client browser. Amazon API Gateway acts as the stateful proxy that keeps the persistent WebSocket connection open with the client and only invokes Lambda when lifecycle events (`$connect`, `$disconnect`) or message frames arrive.

---

### Q6. What is the exact production message flow when User A sends a message to User B?
**Answer:**
1. User A's React client formats a JSON payload `{action: "sendMessage", recipientId: "B", message: "Hello"}` and transmits it over the existing `wss://` socket.
2. API Gateway inspects the action route key and invokes the `ws_send_message` Lambda function.
3. The Lambda function computes a deterministic `conversationId` and persists the message record into the DynamoDB `chat_messages` table.
4. The Lambda queries the `chat_connections` table using the GSI `UserIdIndex` to retrieve User B's active `connectionId`(s).
5. The Lambda calls the AWS `ApiGatewayManagementApi.post_to_connection` endpoint, pushing the message payload to User B's socket.
6. User B's browser receives the payload and updates the chat interface immediately without page refresh.
7. The Lambda echoes a delivery acknowledgment back to User A.

---

### Q7. How does the application handle multiple active devices or browser tabs for the same recipient?
**Answer:** In `chat_connections`, every open socket has its own unique `connectionId`, but all connections belonging to the same user share the same `userId`. When User A sends a message to User B, Lambda queries the Global Secondary Index `UserIdIndex` where `userId = B`. This query returns ALL active connection records for Bob. Lambda loops through the entire list and calls `post_to_connection` on every active connection, ensuring Bob receives the message on both his laptop and phone simultaneously.

---

### Q8. How do you handle stale/abruptly dropped WebSocket connections?
**Answer:** If User B closes their browser without completing a clean WebSocket close handshake, their `connectionId` remains in DynamoDB temporarily. When `ws_send_message` attempts to send a message to that ID via `post_to_connection`, API Gateway returns a `GoneException` (HTTP 410). The Lambda catches this exception, deletes that specific connection record from `chat_connections`, logs `[STALE_CONNECTION]` in CloudWatch, and continues delivering to Bob's remaining active connections without failing the message.

---

### Q9. What happens if the recipient (User B) is offline when the message is sent?
**Answer:**
1. The `ws_send_message` Lambda queries `chat_connections` and finds zero active connections for User B.
2. The message is still safely saved into the DynamoDB `chat_messages` table with status `"sent"`.
3. The sender receives an acknowledgment indicating the recipient was offline.
4. When User B logs in later, their client invokes `GET /messages/{conversationId}` via the REST API to load the complete message history from DynamoDB.

---

### Q10. Why is HTTP polling strictly rejected in this architecture?
**Answer:** HTTP polling (e.g. `setInterval(() => fetchMessages(), 1000)`) floods the backend with hundreds of redundant requests per minute, wastes mobile battery and bandwidth, incurs unnecessary Lambda invocation and DynamoDB read fees, and introduces latency equal to the polling interval. Full-duplex WebSockets over API Gateway provide instant event-driven push delivery with zero wasted requests.

---

### Q11. What is the difference between LIVE AWS MODE and LOCAL DEMO MODE in this project?
**Answer:**
- **LIVE AWS MODE:** Connects directly to Amazon Cognito for SRP authentication, Amazon API Gateway WebSocket (`wss://`) for message delivery, Amazon DynamoDB for persistence, and Amazon S3 for avatars. It never falls back silently to mock mode; if AWS is down, it displays an error alert.
- **LOCAL DEMO MODE:** An isolated development mode using browser `localStorage` and `BroadcastChannel` to facilitate rapid multi-user testing on a developer machine when AWS credentials are not yet configured.

---

### Q12. How is real-time user presence (online/offline) tracked accurately?
**Answer:** Presence is managed in the `$connect` and `$disconnect` Lambdas:
- When a user establishes a connection, `$connect` sets `isOnline = True` in `chat_users`.
- When a connection drops, `$disconnect` removes that `connectionId`, then queries `chat_connections` for any remaining connections belonging to that user. Only if remaining active connections equal zero does it set `isOnline = False`. If the user is still connected on another device, they remain marked as online.

---

### Q13. Why are Lambda functions NOT placed in an AWS VPC?
**Answer:** DynamoDB, Cognito, S3, and API Gateway Management API are all AWS Regional Public Zone managed services. Placing Lambda inside a VPC would isolate it from the internet, requiring an AWS NAT Gateway to reach these services, which costs ~$32.40/month per Availability Zone. Keeping Lambda outside the VPC eliminates this cost, prevents cold-start ENI overhead, and maintains security via AWS IAM SigV4 and TLS 1.3 encryption over AWS internal fiber.

---

### Q14. What is Amazon CloudWatch and what structured logs does this project emit?
**Answer:** CloudWatch is AWS's monitoring and observability service. This project emits structured operational logs including:
- `[CONNECT_INIT]`, `[CONNECTED]`, `[AUTH_VERIFIED]`, `[AUTH_FAILED]`
- `[MESSAGE]`, `[PERSISTED]`, `[CONNECTIONS_LOOKUP]`, `[DELIVERED]`, `[OFFLINE]`
- `[STALE_CONNECTION]`, `[DISCONNECT]`, `[PRESENCE]`
Full passwords, JWT tokens, and secret keys are strictly omitted from logs.

---

### Q15. How does the frontend prevent API Gateway's 10-minute idle WebSocket timeout?
**Answer:** The frontend runs a background heartbeat timer that sends a lightweight `{ action: "ping" }` frame every 4 minutes. This resets API Gateway's idle timer, keeping the connection alive indefinitely.

---

### Q16. How is the read receipt (SENT → DELIVERED → SEEN) state machine implemented without faking?
**Answer:** The status follows a strict three-phase cloud state machine:
1. **SENT (`✓`):** Assigned when the message is successfully inserted into DynamoDB (`chat_messages`). If the recipient's socket is not currently found in `chat_connections`, it remains at `SENT`.
2. **DELIVERED (`✓✓`):** Updated in DynamoDB and pushed to the sender when `ApiGatewayManagementApi.post_to_connection` successfully reaches the recipient's active WebSocket connection.
3. **SEEN (`✓✓ Seen`):** The recipient's client mounts an `IntersectionObserver` on the message card. When the message enters the recipient's visible viewport, the client dispatches an `{ action: "markSeen", messageIds: [...] }` WebSocket frame. The `ws_mark_seen` Lambda updates DynamoDB to `SEEN` and pushes a `message_status_update` event back to the original sender's active WebSocket connection.

---

### Q17. How does the system prevent unauthorized users from marking other users' messages as SEEN?
**Answer:** In `ws_mark_seen`, AWS Lambda does not blindly trust the client payload. It inspects the connection mapping in `chat_connections` or verifies the authenticated caller's identity against the item's `receiverId`. The DynamoDB update is executed with a condition expression ensuring that only the authentic designated receiver can mutate the delivery state to `SEEN`.

