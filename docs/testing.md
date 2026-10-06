# Comprehensive Testing Strategy & Verification Report

This document describes the test matrix, multi-device verification procedures, stale connection testing, and honest test status tracking.

---

## 1. Automated Testing Execution

### 1.1 Backend Unit Tests
The backend test suite ([`backend/test_local.py`](file:///C:/Users/admin/Desktop/Serverless-Communication-Real-Time-Chat/backend/test_local.py)) verifies:
- Deterministic conversation key computation (`min(A, B) + '#' + max(A, B)`).
- Decimal serialization and CORS response structuring.
- JWT decoding and structure checks.

Execute from terminal:
```powershell
cd C:\Users\admin\Desktop\Serverless-Communication-Real-Time-Chat\backend
python test_local.py
```
**Actual Result: PASS** (All tests passed cleanly).

### 1.2 Frontend Build & Lint Verification
Execute from terminal:
```powershell
cd C:\Users\admin\Desktop\Serverless-Communication-Real-Time-Chat\frontend
npm run build
```
**Actual Result: PASS** (Built in 20.04s, 0 syntax/bundling errors).

---

## 2. End-to-End Verification Test Matrix

In accordance with strict verification rules, test cases that require active live AWS account deployment are clearly classified.

| ID | Test Scenario | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :--- |
| **TEST-01** | **Backend Unit Hashing & Serializers** | Deterministic conversationId computation and decimal serialization | **PASS** (Locally executed & verified) |
| **TEST-02** | **Frontend Production Compilation** | React 18 / Vite bundles with zero syntax errors | **PASS** (Locally compiled & verified) |
| **TEST-03** | **Mode Separation (No Silent Fallback)** | UI displays `🟢 LIVE AWS` vs `🟡 LOCAL DEMO`; error shown if AWS fails | **PASS** (Locally verified in UI) |
| **TEST-04** | **Local Demo Multi-Window Real-Time** | Two browser windows communicate in real-time over local bus | **PASS** (Locally tested across tabs) |
| **TEST-05** | **Zero Polling Verification** | No `setInterval` calling `/messages` in codebase | **PASS** (Verified by code audit) |
| **TEST-06** | **Live Cognito Authentication** | User registers and logs in via live Cognito User Pool | **NOT VERIFIED** — AWS deployment required |
| **TEST-07** | **Live AWS API Gateway WebSocket Connect** | Live client connects to `wss://` endpoint; `$connect` records in DynamoDB | **NOT VERIFIED** — AWS deployment required |
| **TEST-08** | **Live AWS Real-Time Delivery** | User A sends to User B via Lambda `post_to_connection` in real-time | **NOT VERIFIED** — AWS deployment required |
| **TEST-09** | **Multi-Device / Multi-Tab Delivery** | User B has 2 active tabs; Lambda pushes message to both tabs simultaneously | **NOT VERIFIED** — AWS deployment required |
| **TEST-10** | **Stale Connection Handling** | Dropped connection returns 410 Gone; Lambda deletes it from DynamoDB | **NOT VERIFIED** — AWS deployment required |
| **TEST-11** | **Live DynamoDB Message Persistence** | Messages persistently stored in DynamoDB table `chat_messages` | **NOT VERIFIED** — AWS deployment required |

---

## 3. Live AWS Cross-Browser / Multi-Device Test Procedure

When AWS deployment is completed (`.\deploy.ps1`):

### Scenario 1: Standard Real-Time Chat (Zero Polling)
1. **Window 1 (Chrome Regular):** Log in as **Alice**.
2. **Window 2 (Chrome Incognito):** Log in as **Bob**.
3. In Window 1, select **Bob** and type: `"Hello Bob"`.
4. **Observe Window 2:** Message appears immediately without page refresh.
5. In Window 2, reply: `"Hello Alice"`.
6. **Observe Window 1:** Alice receives the reply immediately.

### Scenario 2: Offline Recipient History Verification
1. In Window 2, log out **Bob** and close the window.
2. In Window 1, Alice sends: `"Are you offline, Bob?"`.
3. Check CloudWatch: `[OFFLINE] recipientId=Bob has no active connections. Message persisted.`
4. In Window 1, message bubble displays single checkmark: **Sent (Offline)**.
5. Re-open Window 2, log in as **Bob**, and select **Alice**.
6. **Observe Window 2:** Bob's client executes `GET /messages/{convId}` and retrieves the historical message from DynamoDB.

### Scenario 3: Multi-Device / Multi-Connection Verification
1. Log in as **Bob** in **Window 2 (Tab 1)**.
2. Open **Window 3 (Tab 2)** and also log in as **Bob**.
3. In Window 1, Alice sends: `"Testing multi-device broadcast"`.
4. **Observe:** **Both** Tab 1 and Tab 2 receive the message simultaneously via their respective connection IDs.
5. Close Tab 1. Alice sends another message.
6. **Observe:** Tab 2 still receives the message. CloudWatch logs eviction of the stale Tab 1 connection via `GoneException`.
