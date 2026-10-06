# Cloud Security Architecture & Threat Model

Security is a foundational tenet of cloud computing. This document details the security layers, least-privilege policies, authentication mechanisms, and vulnerability mitigation implemented across the application.

---

## 1. Authentication Architecture (Zero Password Storage)

### Traditional Risk
Traditional web apps maintain custom database tables storing user passwords (e.g., using bcrypt or Argon2). If the database is compromised, password hashes can be subjected to rainbow-table or brute-force attacks.

### Serverless Mitigation
Authentication is fully delegated to **Amazon Cognito User Pools**:
1. **Secure Remote Password (SRP) Protocol:** Password verifiers are computed client-side. Raw passwords never traverse the wire in plaintext.
2. **Cryptographically Signed JWTs:** Cognito signs issued tokens using an asymmetric RSA key pair (RS256).
3. **Public JWKS Verification:** Lambda and API Gateway fetch Cognito's public JSON Web Key Set (`.well-known/jwks.json`) to verify token authenticity without sharing secret keys.
4. **Token Expiration:** Access and ID tokens expire in 60 minutes, limiting the window of opportunity if a token is intercepted.

---

## 2. Least-Privilege IAM Policies

Every AWS Lambda function executes under an isolated, minimal IAM role. No function has administrative or wildcard (`*`) permissions across AWS resources.

| Function | Allowed Actions | Restricted Resource ARN |
| :--- | :--- | :--- |
| `WsConnectFunction` | `dynamodb:PutItem`, `dynamodb:UpdateItem` | `chat_connections`, `chat_users` |
| `WsDisconnectFunction` | `dynamodb:DeleteItem`, `dynamodb:GetItem` | `chat_connections`, `chat_users` |
| `WsSendMessageFunction` | `dynamodb:PutItem`<br>`dynamodb:Query`<br>`execute-api:ManageConnections` | `chat_messages`<br>`chat_connections/index/UserIdIndex`<br>`@connections/*` |
| `RestGetUsersFunction` | `dynamodb:Scan`, `dynamodb:GetItem` | `chat_users`, `chat_connections` |
| `RestGetMessagesFunction` | `dynamodb:Query` | `chat_messages` |
| `RestUploadAvatarFunction` | `s3:PutObject`<br>`dynamodb:UpdateItem` | `serverless-chat-assets/*`<br>`chat_users` |

---

## 3. Storage Security (Amazon S3)

1. **Block Public Access Enabled:**
   - The S3 bucket strictly enables `BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, and `RestrictPublicBuckets`.
   - Direct anonymous browser reads or writes to the S3 bucket root are rejected with HTTP 403.
2. **Time-Limited Pre-Signed URLs:**
   - Instead of making the bucket public or passing binary uploads through Lambda, Lambda signs a temporary `PUT` URL with a **5-minute (300-second) expiration**.
   - The pre-signed URL enforces strict content-type constraints (`image/jpeg`, `image/png`, `image/webp`).

---

## 4. Web Application Security Mitigations

### 4.1 Cross-Site Scripting (XSS)
- **Vulnerability:** Malicious users injecting `<script>alert('pwned')</script>` or malicious HTML into chat messages.
- **Mitigation:** React automatically escapes all string expressions embedded within JSX before rendering to the DOM. User messages are treated strictly as text nodes, eliminating DOM-based and stored XSS vulnerabilities.

### 4.2 Denial of Service (DoS) / Payload Bombing
- **Vulnerability:** Sending multi-megabyte payloads through WebSocket frames.
- **Mitigation:** The `ws_send_message` Lambda performs input validation before any database interaction:
  ```python
  if len(text) > 4000:
      return {"statusCode": 400, "body": "Message exceeds maximum length"}
  ```
  Empty strings or whitespace-only messages are rejected immediately.

### 4.3 Stale Session Hijacking
- **Vulnerability:** A disconnected user’s `connectionId` remaining active and receiving another user's private messages.
- **Mitigation:** If API Gateway returns a `GoneException` (HTTP 410) upon message delivery, the Lambda automatically triggers a `delete_item` against `chat_connections`, instantly revoking the stale mapping.

### 4.4 Hardcoded Secrets & Credential Exposure
- No AWS access keys, secret keys, or database credentials exist anywhere in the frontend or backend codebase.
- Configuration is injected via environment variables (`template.yaml` and `.env`).
- In AWS production, Lambda relies entirely on temporary IAM role credentials rotated automatically by AWS Security Token Service (STS).
