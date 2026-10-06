# Serverless Communication Through Real-Time Chat

A complete, production-grade cloud computing project demonstrating full-duplex, bi-directional real-time communication on Amazon Web Services (AWS) using 100% serverless, event-driven architecture.

![Architecture Overview](https://img.shields.io/badge/Architecture-Serverless-orange?style=flat-square)
![AWS Lambda](https://img.shields.io/badge/Compute-AWS%20Lambda-blue?style=flat-square)
![DynamoDB](https://img.shields.io/badge/Database-Amazon%20DynamoDB-purple?style=flat-square)
![Cognito](https://img.shields.io/badge/Auth-Amazon%20Cognito-red?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 1. Project Overview

Traditional real-time web chat systems require persistent backend servers (such as Node.js/Express with Socket.io or Django Channels) running 24/7 on virtual machines (EC2). These architectures incur continuous idle costs, require complex auto-scaling configurations, and introduce single-point-of-failure vulnerabilities.

This project demonstrates how traditional stateful chat servers can be entirely replaced by **serverless cloud primitives**. By offloading stateful WebSocket connection management to **Amazon API Gateway WebSocket API**, execution to **AWS Lambda**, data persistence to **Amazon DynamoDB**, identity management to **Amazon Cognito**, and binary storage to **Amazon S3**, the platform achieves:
- **Zero Idle Server Costs:** Incurs $0.00 when traffic is idle.
- **Infinite Elasticity:** Scales automatically from 0 to thousands of concurrent users.
- **High Availability:** Built on AWS managed multi-Availability Zone services.
- **Dual-Mode Demonstration:** Built-in instant local multi-user preview mode alongside live AWS cloud deployment.

---

## 2. Objectives

- Demonstrate real-world **Serverless Computing** and **Function as a Service (FaaS)**.
- Implement stateful real-time WebSockets over a serverless backend.
- Design partition-key optimized NoSQL schemas in Amazon DynamoDB.
- Enforce cloud identity and access management using Amazon Cognito and RSA-256 JWTs.
- Implement least-privilege cloud security boundaries with AWS IAM.
- Automate complete cloud infrastructure deployment via AWS SAM (Infrastructure as Code).

---

## 3. Features

- **Secure Registration & Authentication:** Amazon Cognito User Pool integration with SRP cryptographic verification.
- **Instant Real-Time Messaging:** Sub-100ms message delivery between online users without page refreshes.
- **Persistent Conversation History:** Sub-10ms chronological history queries in DynamoDB.
- **Presence Tracking:** Online/offline status indicators for active users.
- **Graceful Stale Session Eviction:** Automatic removal of abruptly dropped socket connections (`GoneException` handling).
- **Direct-to-S3 Avatar Uploads:** Fast profile picture uploads via time-limited pre-signed PUT URLs.
- **Responsive Modern Interface:** Sleek dark-theme UI with responsive drawer support.

---

## 4. Architecture

```
                    +-----------------------+
                    |       User            |
                    | Web Browser / Client  |
                    +-----------+-----------+
                                |
                         HTTPS / WSS
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

## 5. Technologies Used

- **Frontend:** React 18, Vite, Lucide Icons, Modern CSS Variables.
- **Backend Compute:** AWS Lambda (Python 3.11 Runtime, AWS Boto3 SDK).
- **APIs:** Amazon API Gateway (WebSocket API v2 & REST API).
- **Database:** Amazon DynamoDB (On-Demand capacity).
- **Identity & Auth:** Amazon Cognito User Pools (JWT tokens).
- **Object Storage:** Amazon S3 (Encrypted private bucket).
- **Monitoring:** Amazon CloudWatch (Logs & Metrics).
- **Infrastructure as Code:** AWS SAM (Serverless Application Model) & CloudFormation.

---

## 6. AWS Services Summary

| AWS Service | Architectural Role |
| :--- | :--- |
| **Amazon Cognito** | User identity directory, SRP password authentication, JWT token issuance. |
| **API Gateway (WebSocket)** | Maintains persistent TCP/WSS connections on behalf of Lambda. |
| **API Gateway (REST)** | Stateless HTTP routing for user lists, history, and pre-signed URLs. |
| **AWS Lambda** | Stateless Python business logic executed strictly on-demand. |
| **Amazon DynamoDB** | Single-digit millisecond NoSQL storage for connections, messages, and users. |
| **Amazon S3** | Object storage for avatars via secure pre-signed PUT URLs. |
| **Amazon CloudWatch** | Aggregated execution logs and operational metrics. |
| **AWS IAM** | Least-privilege role policies and resource-level ARNs. |

---

## 7. Prerequisites

- **Node.js:** v18.0.0 or higher (v24.16.0 verified).
- **Python:** v3.11 or higher (v3.11.1 verified).
- **AWS CLI v2:** Required for AWS deployment ([Download MSI](https://awscli.amazonaws.com/AWSCLIV2.msi)).
- **AWS SAM CLI:** Required for AWS deployment ([Download MSI](https://github.com/aws/aws-sam-cli/releases)).

---

## 8. Local Setup & Quick Demonstration

The project includes an intelligent dual-mode frontend. You can immediately launch, test, and demonstrate the entire real-time chat application locally **before deploying to AWS**:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Launch local development server
npm run dev
```

Open `http://localhost:3000` in two separate browser windows (or one standard window and one incognito window):
1. Sign in as **Alice** in Window 1 (using the quick demo pill).
2. Sign in as **Bob** in Window 2 (using the quick demo pill).
3. Select each other and send messages in real-time without refreshing.
4. Refresh the page: Conversation history persists across refreshes and logouts.

---

## 9. AWS Configuration

Configure your AWS credentials locally:
```powershell
aws configure
```
Enter your AWS Access Key ID, Secret Access Key, and target region (e.g. `us-east-1`).

Verify your identity:
```powershell
aws sts get-caller-identity
```

---

## 10. Cloud Deployment (AWS SAM)

### Automated Deployment
Run our automated PowerShell deployment script:
```powershell
cd infrastructure
.\deploy.ps1 -Region us-east-1 -EnvironmentName dev
```

This script:
1. Validates AWS credentials.
2. Builds the SAM template (`sam build`).
3. Provisions all CloudFormation resources (`sam deploy`).
4. Extracts stack outputs and automatically writes them to `frontend/.env`.

### Manual Deployment
```powershell
cd infrastructure
sam build
sam deploy --guided
```

---

## 11. Database Design

### Table: `chat_connections`
- **PK:** `connectionId` (String)
- **GSI:** `UserIdIndex` (PK: `userId`)
- **TTL:** 2-hour epoch expiration.

### Table: `chat_messages`
- **PK:** `conversationId` (`min(userA, userB) + "#" + max(userA, userB)`)
- **SK:** `timestamp_messageId` (`{ISO8601}#{UUID}`)

### Table: `chat_users`
- **PK:** `userId` (String)

---

## 12. API Documentation

### REST API Endpoints
- `GET /users`: Returns directory of registered users and online status.
- `GET /messages/{conversationId}`: Retrieves chronological message history.
- `POST /profile/avatar-url`: Generates S3 pre-signed upload URL.

### WebSocket API Routes
- `$connect`: Triggered on initial WSS connection. Validates JWT and registers `connectionId`.
- `$disconnect`: Triggered on connection close. Deletes `connectionId` from DynamoDB.
- `sendMessage`: Validates text, saves to DynamoDB, pushes payload to recipient's connection ID.
- `$default`: Fallback handler for unmapped routes.

---

## 13. Security & Networking

- **TLS 1.3 / WSS Encryption:** All traffic is encrypted in transit over port 443.
- **Least-Privilege IAM:** Each Lambda role is scoped to specific DynamoDB tables and API Gateway ARNs.
- **No Hardcoded Secrets:** AWS temporary STS credentials manage service-to-service access.
- **VPC Elimination:** Lambda functions run outside a VPC to eliminate expensive NAT Gateway costs ($32.40/month) while maintaining AWS internal fiber security.

---

## 14. Testing

### Run Backend Unit Tests:
```powershell
cd backend
python test_local.py
```
Output:
```text
Running backend local unit tests...
PASS: test_conversation_id_symmetry
PASS: test_response_serializers
PASS: test_jwt_decoder

ALL BACKEND UNIT TESTS PASSED SUCCESSFULLY!
```

---

## 15. Documentation Index

Detailed academic documentation is available in the `docs/` folder:
- [System Architecture](docs/architecture.md)
- [Architecture Diagram](docs/architecture-diagram.md)
- [Cloud Services Guide](docs/cloud-services.md)
- [AWS Deployment Guide](docs/deployment.md)
- [Security & Threat Model](docs/security.md)
- [Networking & VPC Guide](docs/networking.md)
- [Database Schema & Queries](docs/database.md)
- [Testing Matrix](docs/testing.md)
- [36 Viva Questions & Answers](docs/viva-questions.md)
- [Academic Project Report](docs/project-report.md)

---

## 16. Teardown / Cost Cleanup

To delete all provisioned AWS resources and guarantee zero ongoing charges:
```powershell
sam delete --stack-name serverless-realtime-chat --region us-east-1
```
