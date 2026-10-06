# Academic Project Report
## Subject: Cloud Computing
## Project Title: Serverless Communication Through Real-Time Chat

---

### 1. Abstract
Real-time communication platforms traditionally rely on monolithic, stateful servers that maintain persistent socket connections 24/7. While functional, this traditional architecture incurs continuous operational and financial overhead, requires complex auto-scaling configurations, and creates availability bottlenecks. This project presents a cloud-native, 100% serverless real-time chat application built on Amazon Web Services (AWS). By leveraging Amazon API Gateway WebSocket API to offload stateful connection management, AWS Lambda for on-demand execution, Amazon DynamoDB for low-latency persistence, Amazon Cognito for secure authentication, and Amazon S3 for media storage, the system achieves instant horizontal elasticity, high availability, zero idle operational costs, and robust least-privilege security.

---

### 2. Introduction
Cloud computing has shifted the application paradigm from Infrastructure as a Service (IaaS) toward serverless Function as a Service (FaaS) and managed cloud primitives. Real-time messaging presents unique engineering challenges because WebSockets are inherently stateful, whereas serverless compute is fundamentally stateless. This project demonstrates how stateful connection abstraction via Amazon API Gateway bridges this gap, enabling real-time, bi-directional communication on fully serverless infrastructure.

---

### 3. Problem Statement
Traditional real-time web applications suffer from:
1. **Idle Resource Waste:** Dedicated virtual machines (e.g., EC2 instances running Node.js or Python) run continuously, consuming billing units even during periods of zero traffic.
2. **Complex Scaling:** Scaling stateful socket connections across multiple instances requires Redis pub/sub backplanes, sticky sessions, and complex load-balancer rules.
3. **Operational Overhead:** System administrators must manually monitor servers, patch operating system vulnerabilities, and manage database connection pooling.

---

### 4. Existing System
The existing system relies on a monolithic Node.js/Express server utilizing the Socket.io library hosted on an AWS EC2 instance with an attached relational database (e.g., RDS MySQL):
- **Pros:** Simple to implement on a single local machine.
- **Cons:** High baseline cost ($15–$50/month), single point of failure (SPOF) if the instance crashes, manual vertical/horizontal scaling, and security exposure from custom database password management.

---

### 5. Proposed System
The proposed system replaces the monolithic server with an event-driven, multi-tier serverless cloud architecture on AWS:
- **Client Tier:** React SPA running locally or hosted on Amazon S3.
- **Identity Tier:** Amazon Cognito User Pools for SRP authentication and JWT issuance.
- **Gateway Tier:** Amazon API Gateway WebSocket and REST APIs.
- **Compute Tier:** AWS Lambda functions written in Python 3.11 with Boto3.
- **Data Tier:** Amazon DynamoDB in On-Demand capacity mode.
- **Storage Tier:** Amazon S3 with secure pre-signed URLs.

---

### 6. Objectives
1. Design and deploy a real-time bi-directional chat application without managing physical or virtual servers.
2. Implement cryptographic user authentication using Amazon Cognito and RSA-256 JWT tokens.
3. Establish persistent real-time messaging using the API Gateway WebSocket protocol (`wss://`).
4. Persist and index conversation history in Amazon DynamoDB with sub-10ms query latency.
5. Demonstrate least-privilege security policies using AWS IAM.
6. Automate cloud infrastructure deployment via AWS Serverless Application Model (SAM).

---

### 7. Requirements
#### Software Requirements:
- **Operating System:** Windows 10/11, macOS, or Linux.
- **Runtime Engines:** Node.js (v18+), Python (v3.11+).
- **Cloud Tools:** AWS CLI v2, AWS SAM CLI.
- **Cloud Platform:** Active AWS Account (Free Tier eligible).
#### Hardware Requirements:
- **CPU:** Dual-core 2.0 GHz or higher.
- **RAM:** Minimum 4 GB (8 GB recommended).
- **Disk Space:** 500 MB free local disk storage.

---

### 8. System Architecture
The application separates compute, connection state, and persistent data into decoupled micro-services:
1. Client establishes a WebSocket handshake with API Gateway over port 443.
2. API Gateway invokes the `ws_connect` Lambda function, recording the unique `connectionId` in DynamoDB.
3. When messages are sent, the `ws_send_message` Lambda queries recipient connection IDs and pushes payloads using the `ApiGatewayManagementApi`.
4. Chat history is persisted in DynamoDB and fetched on demand via API Gateway REST endpoints.

---

### 9. Cloud Architecture
Every layer uses AWS managed services:
- **Client Access:** Route 53 DNS -> CloudFront/S3 / Local Host.
- **API Management:** Regional API Gateway (REST & WebSocket v2).
- **Compute:** Ephemeral AWS Lambda execution environments.
- **Data:** Multi-AZ Amazon DynamoDB tables.
- **Monitoring:** Amazon CloudWatch Log Groups.

---

### 10. AWS Services Used
1. **Amazon Cognito:** User directory, password verification, JWT generation.
2. **API Gateway (WebSocket):** Maintains persistent TCP connections, routes frames.
3. **API Gateway (REST):** Serves user list, conversation history, and pre-signed URLs.
4. **AWS Lambda:** Ephemeral FaaS compute engine for business logic.
5. **Amazon DynamoDB:** NoSQL database for messages, connections, and user records.
6. **Amazon S3:** Object storage for avatars and static frontend assets.
7. **Amazon CloudWatch:** Real-time log capture and operational metrics.
8. **AWS IAM:** Fine-grained role-based access control.

---

### 11. Serverless Architecture
- **Stateless Execution:** Lambda functions spin up on invocation and terminate after completion.
- **Externalized State:** Connection IDs and timestamps are stored in DynamoDB.
- **Event-Driven Invocation:** Functions execute strictly when triggered by API Gateway route keys (`$connect`, `$disconnect`, `sendMessage`).
- **Pay-per-Use:** Costs scale strictly with active message traffic down to the millisecond.

---

### 12. Database Design
- **Table 1 (`chat_connections`):**
  - PK: `connectionId` (String).
  - GSI: `UserIdIndex` with PK `userId` (String).
  - TTL: 2-hour epoch expiration.
- **Table 2 (`chat_messages`):**
  - PK: `conversationId` (`min(userA, userB) + "#" + max(userA, userB)`).
  - SK: `timestamp_messageId` (`{ISO8601}#{UUID}`).
- **Table 3 (`chat_users`):**
  - PK: `userId` (String).

---

### 13. Networking
- **HTTPS & WSS Protocols:** Transport layer security (TLS 1.2/1.3) protects all traffic over port 443.
- **VPC Elimination:** Lambda functions run outside a VPC, accessing DynamoDB, Cognito, and S3 directly over AWS internal fiber. This avoids the cost of an AWS NAT Gateway ($32.40/month) while maintaining SigV4 security.

---

### 14. Security
- **Authentication:** Amazon Cognito Secure Remote Password (SRP) protocol.
- **Authorization:** JWT validation on REST and WebSocket endpoints.
- **IAM Policies:** Explicit resource-level ARNs for DynamoDB, S3, and API Gateway.
- **Input Sanitization:** Boundary enforcement (max 4,000 characters) and React JSX string auto-escaping to eliminate XSS vulnerabilities.

---

### 15. Implementation
- **Backend:** 7 Python Lambda functions utilizing the AWS Boto3 SDK.
- **Frontend:** Modular React SPA with centralized state contexts (`AuthContext`, `ChatContext`) and dual-mode connectivity for real-time demonstrations.
- **Infrastructure as Code:** 300+ line declarative `template.yaml` for AWS SAM deployment.

---

### 16. Deployment
Deployment is automated through AWS SAM:
1. `sam build` bundles Python runtimes and resolves CloudFormation mappings.
2. `sam deploy --guided` packages Lambda artifacts to S3, provisions CloudFormation stacks, and exposes output URLs.
3. `deploy.ps1` extracts API Gateway URLs and configures frontend environment variables.

---

### 17. Testing
The application underwent automated and manual testing:
1. **Automated Unit Tests:** `backend/test_local.py` verified conversation ID symmetry, JWT decoding, and response serialization.
2. **Frontend Compilation:** `npm run build` confirmed zero syntax errors and production asset bundling.
3. **Multi-Window Real-Time Validation:** Tested between two isolated browser sessions (Normal & Incognito) confirming instant bi-directional messaging, database persistence, and page refresh history retention.

---

### 18. Results
- **Latency:** Message dispatch to delivery latency measured under 150ms.
- **Persistence:** Chat history reliably persists across refreshes and logouts.
- **Zero Idle Cost:** Complete platform consumes 0 paid capacity when idle, running entirely within AWS Free Tier limits.

---

### 19. Advantages
1. **Zero Server Maintenance:** No operating systems to patch or configure.
2. **Cost Efficiency:** True pay-per-request billing with zero idle expenses.
3. **Infinite Elasticity:** Scales automatically from 1 to thousands of concurrent users.
4. **High Availability:** Multi-AZ redundancy built into all AWS managed services.

---

### 20. Limitations
1. **Cold Starts:** Python Lambda functions experience a 200–300ms initial initialization latency when idle.
2. **API Gateway Limits:** AWS enforces a 10-minute idle connection timeout and a 2-hour maximum connection duration (mitigated via 4-minute keep-alive pings and automatic reconnection).
3. **Execution Limits:** Lambda has a 15-minute maximum runtime limit (not an issue for chat messages which execute in <100ms).

---

### 21. Future Enhancements
1. **Group Chat Fan-Out:** Introduce Amazon SQS or Amazon EventBridge for asynchronous multi-user broadcasting.
2. **Push Notifications:** Integrate Amazon SNS for browser web push notifications when users are offline.
3. **AI Chat Assistant:** Integrate Amazon Bedrock for conversational AI within the chat stream.
4. **End-to-End Encryption (E2EE):** Implement client-side Web Crypto API encryption keys.

---

### 22. Conclusion
The "Serverless Communication Through Real-Time Chat" project successfully demonstrates the transition from traditional, expensive server-based architectures to modern cloud-native serverless systems. By combining API Gateway WebSockets, AWS Lambda, DynamoDB, and Amazon Cognito, the platform achieves instant real-time messaging, zero idle cost, and enterprise-grade security, making it a compelling reference implementation for academic study and production deployments.

---

### 23. References
1. Amazon Web Services. *AWS Lambda Developer Guide.* AWS Documentation, 2024.
2. Amazon Web Services. *Amazon API Gateway WebSocket API Guide.* AWS Documentation, 2024.
3. Amazon Web Services. *Amazon DynamoDB Developer Guide.* AWS Documentation, 2024.
4. IETF. *The WebSocket Protocol (RFC 6455).* Internet Engineering Task Force, 2011.
5. Martin Fowler. *Serverless Architectures.* martinfowler.com, 2018.
