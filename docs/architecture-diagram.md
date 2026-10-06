# System Architecture Diagram
### Serverless Communication Through Real-Time Chat

```
======================================================================================================================
                                              1. CLIENT LAYER
======================================================================================================================
                                         [ Web Browser / End User ]
                                                     |
                                   +-----------------+-----------------+
                                   |  React Single Page Application    |
                                   |  - Amazon Cognito Auth SDK        |
                                   |  - Native WebSocket (WSS) Client  |
                                   |  - REST API Client                |
                                   +-----------------+-----------------+
                                                     |
                                         HTTPS (443) | WSS (443)
                                                     |
======================================================================================================================
                                        2. CLOUD GATEWAY & AUTH LAYER
======================================================================================================================
         +-------------------------------------------+-------------------------------------------+
         |                                           |                                           |
+--------v--------+                        +---------v---------+                       +---------v---------+
| Amazon Cognito  |                        |   API Gateway     |                       |   API Gateway     |
|   User Pool     |                        |    (REST API)     |                       |  (WebSocket API)  |
| - SRP Auth      |                        | - GET /users      |                       | - $connect        |
| - JWT Issuance  |                        | - GET /messages   |                       | - $disconnect     |
| - Identity Pool |                        | - POST /avatar-url|                       | - sendMessage     |
+-----------------+                        +---------+---------+                       +---------+---------+
                                                     |                                           |
======================================================================================================================
                                           3. COMPUTE LAYER (FaaS)
======================================================================================================================
                                                     |                                           |
                                      +--------------v-------------------------------------------v--------------+
                                      |                                AWS Lambda                               |
                                      |                 (Python 3.11 Runtime / Stateless Workers)               |
                                      |                                                                         |
                                      |  [rest_get_users]      [ws_connect]         [ws_send_message]           |
                                      |  [rest_get_messages]   [ws_disconnect]      [ws_default]                |
                                      |  [rest_upload_avatar]                                                   |
                                      +-------------------------------------+-----------------------------------+
                                                                            |
======================================================================================================================
                                       4. DATABASE & STORAGE LAYER
======================================================================================================================
                                         +----------------------------------+----------------------------------+
                                         |                                  |                                  |
                              +----------v----------+            +----------v----------+            +----------v----------+
                              |   Amazon DynamoDB   |            |   Amazon DynamoDB   |            |      Amazon S3      |
                              |  (chat_connections) |            |   (chat_messages)   |            |  (User Assets Bucket|
                              | - PK: connectionId  |            | - PK: conversationId|            | - Avatars           |
                              | - GSI: UserIdIndex  |            | - SK: timestamp#UUID|            | - Pre-signed PUTs   |
                              +---------------------+            +---------------------+            +---------------------+
                                         |                                  |                                  |
======================================================================================================================
                                     5. SECURITY & OBSERVABILITY LAYER
======================================================================================================================
         +----------------------------------------------------------+-------------------------------------------------+
         |                          AWS IAM                         |                Amazon CloudWatch                |
         | - Least-privilege function execution roles               | - Centralized logs (/aws/lambda/*)              |
         | - Resource-level ARNs & SigV4 encryption                 | - Real-time metrics & error telemetry           |
         +----------------------------------------------------------+-------------------------------------------------+
```

---

## Interactive Mermaid Diagram

```mermaid
graph TD
    classDef client fill:#1e293b,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef auth fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#fff;
    classDef gateway fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef compute fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef data fill:#701a75,stroke:#ec4899,stroke-width:2px,color:#fff;
    classDef ops fill:#374151,stroke:#9ca3af,stroke-width:2px,color:#fff;

    subgraph Layer1["1. Client Layer"]
        Browser["User Browser (React SPA)"]:::client
    end

    subgraph Layer2["2. Cloud / Gateway / Auth Layer"]
        Cognito["Amazon Cognito User Pool"]:::auth
        RestGW["API Gateway (REST API)"]:::gateway
        WsGW["API Gateway (WebSocket API)"]:::gateway
    end

    subgraph Layer3["3. Serverless Compute Layer (AWS Lambda)"]
        L_AuthRest["Lambda: REST Handlers\n(get_users, get_messages, upload_avatar)"]:::compute
        L_WS["Lambda: WebSocket Handlers\n(ws_connect, ws_disconnect, ws_send_message)"]:::compute
    end

    subgraph Layer4["4. Database & Storage Layer"]
        DB_Conn[("DynamoDB:\nchat_connections")]:::data
        DB_Msg[("DynamoDB:\nchat_messages")]:::data
        DB_User[("DynamoDB:\nchat_users")]:::data
        S3[("Amazon S3:\nUser Assets Bucket")]:::data
    end

    subgraph Layer5["5. Security & Observability Layer"]
        IAM["AWS IAM Least-Privilege Roles"]:::ops
        CW["Amazon CloudWatch Logs & Metrics"]:::ops
    end

    Browser -->|"1. Authenticate (SRP)"| Cognito
    Cognito -.->|"2. Return JWT"| Browser
    Browser -->|"3. HTTPS Requests"| RestGW
    Browser <-->|"4. Persistent WSS"| WsGW

    RestGW --> L_AuthRest
    WsGW --> L_WS

    L_AuthRest --> DB_User
    L_AuthRest --> DB_Msg
    L_AuthRest --> S3

    L_WS --> DB_Conn
    L_WS --> DB_Msg
    L_WS -.->|"Push payload (@connections)"| WsGW

    L_AuthRest --- IAM
    L_WS --- IAM
    L_AuthRest -.-> CW
    L_WS -.-> CW
```
