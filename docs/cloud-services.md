# AWS Cloud Services Reference Guide

This document details the 8 core AWS managed services utilized in the production serverless architecture, their interaction mechanisms, and their operational responsibilities.

---

## 1. Amazon Cognito (User Directory & SRP Authentication)
- **Service Type:** Managed Identity Provider (IdP).
- **Production Responsibilities:**
  - Manages secure user registration and login via the Secure Remote Password (SRP) protocol.
  - Generates asymmetric RSA-256 signed JSON Web Tokens (`IdToken`, `AccessToken`, `RefreshToken`).
  - Protects passwords client-side; zero plaintext passwords or custom password hashes are stored in DynamoDB.
- **LIVE AWS vs. LOCAL DEMO:**
  - In `LIVE AWS MODE`: All authentication goes directly through the Cognito User Pool.
  - In `LOCAL DEMO MODE`: Uses browser session storage to simulate multiple accounts.

---

## 2. Amazon API Gateway (WebSocket API v2)
- **Service Type:** Managed Real-Time Connection Gateway (`AWS::ApiGatewayV2::Api`).
- **Production Responsibilities:**
  - Maintains persistent TCP/TLS WebSocket (`wss://`) connections on behalf of the application.
  - Route selection: `$request.body.action`.
  - Integrations:
    - `$connect`: Authenticates user JWT, records active `connectionId` in DynamoDB.
    - `$disconnect`: Cleans up disconnected sessions.
    - `sendMessage`: Routes incoming chat frames to the `ws_send_message` Lambda.
    - `$default`: Fallback handler for unrecognized actions.
- **Bi-directional Push:** Provides the `ApiGatewayManagementApi` endpoint (`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>`), allowing Lambda functions to push real-time payloads down specific client sockets without polling.

---

## 3. Amazon API Gateway (REST API)
- **Service Type:** Stateless HTTP Gateway (`AWS::Serverless::Api`).
- **Production Responsibilities:**
  - `GET /users`: Retrieves registered users and current presence.
  - `GET /messages/{conversationId}`: Retrieves chronological message history.
  - `POST /profile/avatar-url`: Generates S3 pre-signed upload URLs.
- **Authorizer:** Cognito User Pool JWT Authorizer validates the incoming `Authorization: Bearer <token>` header before invoking Lambda.

---

## 4. AWS Lambda (Function as a Service - Compute Engine)
- **Runtime:** Python 3.11 with Boto3 SDK.
- **Production Responsibilities:**
  - Ephemeral, stateless compute executing business logic strictly when triggered by events.
  - Validates payloads and applies boundary checks (max 4,000 characters).
  - Queries `chat_connections` and loops over multi-device recipient connections.
  - Evicts stale sessions upon receiving `GoneException` (HTTP 410).
- **Least-Privilege IAM:** Scoped strictly to necessary tables and `execute-api:ManageConnections`. No administrative permissions.

---

## 5. Amazon DynamoDB (Authoritative Cloud Database)
- **Billing Mode:** `PAY_PER_REQUEST` (On-Demand capacity).
- **Tables:**
  1. `chat_connections`: Primary key `connectionId`, Global Secondary Index `UserIdIndex` on `userId`, TTL enabled (2 hours).
  2. `chat_messages`: Partition key `conversationId`, Sort key `timestamp_messageId` for chronological ordering. Authoritative message history store.
  3. `chat_users`: Primary key `userId`. Tracks user discovery profiles and online status.

---

## 6. Amazon Simple Storage Service (S3)
- **Service Type:** Object Storage.
- **Production Responsibilities:**
  - Securely stores user profile pictures (avatars).
  - Private bucket with Block Public Access enabled.
  - Bypasses API Gateway and Lambda binary overhead by using time-limited (5-minute) pre-signed PUT URLs.

---

## 7. Amazon CloudWatch (Observability & Logging)
- **Service Type:** Centralized Monitoring & Telemetry.
- **Production Responsibilities:**
  - Automatically captures structured execution logs:
    - `[CONNECT_INIT]`, `[CONNECTED]`, `[AUTH_VERIFIED]`, `[AUTH_FAILED]`
    - `[MESSAGE]`, `[PERSISTED]`, `[CONNECTIONS_LOOKUP]`, `[DELIVERED]`, `[OFFLINE]`
    - `[STALE_CONNECTION]`, `[DISCONNECT]`, `[PRESENCE]`
  - Real-time invocation metrics, duration graphs, and error alarms.

---

## 8. AWS Identity and Access Management (IAM)
- **Service Type:** Cloud Security & Access Control.
- **Production Responsibilities:**
  - Enforces least-privilege execution roles for all Lambda functions.
  - Zero hardcoded credentials: all internal operations use temporary STS credentials rotated automatically by AWS.
