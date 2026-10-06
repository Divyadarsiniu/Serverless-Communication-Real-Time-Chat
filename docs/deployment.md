# AWS Deployment & Operational Guide

This document contains step-by-step instructions for deploying the Serverless Real-Time Chat platform to Amazon Web Services using Infrastructure as Code (AWS SAM).

---

## 1. Prerequisites & Tool Installation

### 1.1 Development Environment
- **Node.js:** v18.0.0 or higher (Installed: v24.16.0)
- **Python:** v3.11 or higher (Installed: v3.11.1)

### 1.2 Required AWS CLI Tools
1. **AWS CLI v2:**
   - Download installer: [AWS CLI MSI Installer](https://awscli.amazonaws.com/AWSCLIV2.msi)
   - Verify installation in PowerShell:
     ```powershell
     aws --version
     ```
2. **AWS SAM CLI:**
   - Download installer: [AWS SAM CLI 64-bit MSI](https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi)
   - Verify installation in PowerShell:
     ```powershell
     sam --version
     ```

---

## 2. AWS Account Configuration

1. Create an IAM User in the AWS Management Console with programmatic access (Access Key ID and Secret Access Key).
2. Attach necessary deployment permissions (AdministratorAccess or CloudFormation/Lambda/APIGateway/DynamoDB/Cognito/S3 access policies).
3. Configure credentials locally:
   ```powershell
   aws configure
   ```
   - **AWS Access Key ID:** `YOUR_ACCESS_KEY`
   - **AWS Secret Access Key:** `YOUR_SECRET_KEY`
   - **Default region name:** `us-east-1` (or your preferred region)
   - **Default output format:** `json`

4. Verify identity:
   ```powershell
   aws sts get-caller-identity
   ```

---

## 3. Automated One-Command Deployment

We provide an automated deployment script `infrastructure/deploy.ps1` that builds the SAM template, deploys all cloud resources, extracts outputs, and automatically updates the frontend environment configuration.

Run in PowerShell:
```powershell
cd C:\Users\admin\Desktop\Serverless-Communication-Real-Time-Chat\infrastructure
.\deploy.ps1 -Region us-east-1 -EnvironmentName dev
```

---

## 4. Manual SAM Deployment Walkthrough

If deploying manually using AWS SAM commands:

### Step 1: Build the SAM Template
```powershell
cd C:\Users\admin\Desktop\Serverless-Communication-Real-Time-Chat\infrastructure
sam build --template-file template.yaml
```

### Step 2: Deploy Guided
```powershell
sam deploy --guided
```
Prompt responses:
- **Stack Name:** `serverless-realtime-chat`
- **AWS Region:** `us-east-1`
- **Parameter EnvironmentName:** `dev`
- **Confirm changes before deploy:** `Y`
- **Allow SAM CLI IAM role creation:** `Y`
- **Disable rollback:** `N`
- **Save arguments to configuration file:** `Y`

### Step 3: View Stack Outputs
Once CloudFormation finishes provisioning, it prints:
- `CognitoUserPoolId`
- `CognitoClientId`
- `WebSocketApiUrl` (`wss://...`)
- `RestApiUrl` (`https://...`)
- `UserAssetsBucketName`

Copy these values into `frontend/.env`:
```env
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_WS_API_URL=wss://xxxxxx.execute-api.us-east-1.amazonaws.com/dev
VITE_REST_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev
VITE_S3_BUCKET_NAME=serverless-chat-assets-xxxxxx-dev
VITE_USE_MOCK=false
```

---

## 5. Frontend Local Startup & Static Hosting

### 5.1 Local Startup
```powershell
cd C:\Users\admin\Desktop\Serverless-Communication-Real-Time-Chat\frontend
npm install
npm run dev
```
Open `http://localhost:3000` in two separate browser windows (or one normal and one incognito window) to test real-time communication.

### 5.2 Deploying Frontend to Amazon S3
To host the frontend in the cloud on S3:
1. Build the production bundle:
   ```powershell
   npm run build
   ```
2. Sync the `dist/` directory to an S3 hosting bucket:
   ```powershell
   aws s3 sync dist/ s3://YOUR_WEBSITE_BUCKET_NAME --delete
   ```

---

## 6. CloudWatch Logs Inspection

To monitor Lambda function executions and troubleshoot live messages:

### Option A: AWS SAM CLI
```powershell
sam logs -n WsSendMessageFunction --stack-name serverless-realtime-chat --tail
```

### Option B: AWS Management Console
1. Open the **Amazon CloudWatch** console.
2. Navigate to **Logs** -> **Log groups**.
3. Select `/aws/lambda/serverless-realtime-chat-WsSendMessageFunction-...`.
4. Inspect execution logs, latency metrics, and payload dumps.

---

## 7. Cost Management & Resource Teardown

All deployed resources run in **On-Demand** mode and qualify for the AWS Free Tier. When you finish your project demonstration or semester exams, you can cleanly tear down all cloud resources with a single command to guarantee $0 future charges:

```powershell
sam delete --stack-name serverless-realtime-chat --region us-east-1
```
Confirm deletion by typing `y`.
