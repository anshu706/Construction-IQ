<div align="center">

# 🏗️ ConstructIQ Enterprise
### **Autonomous Construction Project Intelligence, Telemetry & Financial Console**

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Terraform](https://img.shields.io/badge/Terraform-AWS_IaC-844FBA?style=for-the-badge&logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-F59E0B?style=for-the-badge)](./LICENSE)

<p align="center">
  <b>Mission-control telemetry and scheduling ledger for enterprise construction execution.</b><br>
  Role-governed RBAC, Earned Value Management (EVM), Critical Path Method (CPM), verifiable safety streak auditing, binary-validated evidence storage, and hot-swappable AI Copilot.
</p>

[🏗️ Cloud Architecture](#-cloud-architecture) • [⚡ Local Development](#-local-development-with-docker-compose) • [🔐 Environment Variables](#-environment-variables) • [🚀 Cloud Deployment](#-deployment-guide) • [📖 Runbook](#-operations-runbook) • [💰 AWS Cost Model](#-estimated-monthly-aws-cost)

---

</div>

## 📸 Interface Gallery

<table width="100%">
  <tr>
    <td width="33%" align="center" valign="top">
      <b>Command Center & KPI Telemetry</b>
      <br><br>
      <img src="assets/dashboard-overview.png" alt="Command Center Dashboard" width="100%" style="border-radius: 8px; border: 1px solid #D1CEC6;" />
      <br>
      <sub><i>Unclamped CPI/SPI, BAC, EV, AC, and real-time sensor telematics</i></sub>
    </td>
    <td width="33%" align="center" valign="top">
      <b>Interactive Gantt Engine</b>
      <br><br>
      <img src="assets/gantt-schedule.png" alt="Interactive Gantt Engine" width="100%" style="border-radius: 8px; border: 1px solid #D1CEC6;" />
      <br>
      <sub><i>CPM forward/backward pass, total float, and cycle-rejected dependencies</i></sub>
    </td>
    <td width="33%" align="center" valign="top">
      <b>Automated Hazard Telemetry</b>
      <br><br>
      <img src="assets/hazard-alert.png" alt="Safety Telemetry & Alert" width="100%" style="border-radius: 8px; border: 1px solid #D1CEC6;" />
      <br>
      <sub><i>Wind speed sensors triggering non-auto-clearing crane halt interlocks</i></sub>
    </td>
  </tr>
</table>

---

## 🏗️ Cloud Architecture

ConstructIQ runs on AWS as an enterprise-grade, containerized application with strict network isolation, automated scaling, and zero static secrets.

```mermaid
flowchart TB
    subgraph CI_CD ["CI / CD & Image Registry"]
        GH["GitHub Actions\n(OIDC AWS Auth)"]
        ECR["Amazon ECR\n(Vulnerability Scanning · 20-Image Retention)"]
        GH -->|npm test · Hadolint · Trivy| GH
        GH -->|Push Container Image| ECR
        GH -->|Run One-Off Task: prisma migrate deploy| ECS_Migrate["ECS Migration Task\n(Prisma Deploy)"]
    end

    subgraph Internet ["Public Internet"]
        Users["Client Browser\n(React 19 SPA)"]
        Users -->|HTTPS :443| ALB
    end

    subgraph AWS_VPC ["AWS VPC (10.0.0.0/16 or 10.1.0.0/16)"]
        subgraph Public_Subnets ["Public Subnets (Multi-AZ)"]
            ALB["Application Load Balancer\n(HTTPS TLS 1.3 · /metrics Blocked)"]
            NAT["NAT Gateway"]
        end

        subgraph Private_Subnets ["Private App & Data Subnets (No Public IP)"]
            subgraph ECS_Cluster ["ECS Fargate Cluster (Autoscaling 2–10 Tasks)"]
                AppTask1["ConstructIQ Node 20 Runtime\n(Non-Root 'node' User)"]
                AppTask2["ConstructIQ Node 20 Runtime\n(Non-Root 'node' User)"]
            end

            RDS[("Amazon RDS PostgreSQL 16\n(Encrypted gp3 · 7-Day Backups)")]
            Secrets["AWS Secrets Manager\n(DATABASE_URL · SESSION_SECRET · API Keys)"]
        end
    end

    subgraph Storage_Observability ["Storage & Observability"]
        S3["Amazon S3 Private Bucket\n(Uploads · 5-Min Presigned URLs)"]
        CW["Amazon CloudWatch\n(Pino JSON Logs · 5 Metric Alarms · Dashboard)"]
        NIM["NVIDIA NIM Cloud\n(Llama 3.2 Vision)"]
        GEMINI["Google Gemini Cloud\n(2.0 Flash Fallback)"]
    end

    ALB -->|Forward :3001| AppTask1
    ALB -->|Forward :3001| AppTask2
    AppTask1 -->|Prisma Pool :5432| RDS
    AppTask2 -->|Prisma Pool :5432| RDS
    ECS_Migrate -->|Apply Migrations :5432| RDS
    AppTask1 -.->|IAM Secrets Access| Secrets
    AppTask1 -->|Presigned Read / Write| S3
    AppTask1 -->|Pino Structured JSON| CW
    AppTask1 -->|AI Context Telemetry| NIM
    NIM -.->|Failover| GEMINI
```

---

## ⚡ Local Development with Docker Compose

Running ConstructIQ locally requires a single command. Docker Compose spins up PostgreSQL 16 with health checks, runs one-off database migrations, and boots the production-grade application container.

### 1. Prerequisites
- Docker Engine 24+ and Docker Compose v2+
- Node.js 20 LTS (if running outside Docker)

### 2. Configure Environment
Create your local environment file from the template:
```bash
cp .env.example .env
```
Ensure `.env` contains valid development values:
```ini
POSTGRES_USER=constructiq
POSTGRES_PASSWORD=local_secure_dev_password_123
SESSION_SECRET=local_development_session_secret_32_characters_minimum
DEMO_MODE=true
DEMO_PASSWORD=DemoPass123!
```

### 3. Launch the Stack
```bash
# Build containers and run detached
npm run docker:up

# Or directly with Docker Compose:
docker compose up --build -d
```

### 4. Verify Local Health
```bash
# Check service health
curl -s http://localhost:3001/api/health | jq .
# Expected: {"status":"ok","version":"0.1.0","demoMode":true,...}

# Check database readiness
curl -s http://localhost:3001/api/ready | jq .
# Expected: {"status":"ready","database":"connected"}
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser. Quick-login demo profiles are pre-populated on the login interface (`pm@constructiq.demo`, `supervisor@constructiq.demo`, etc.).

To shut down the local environment:
```bash
npm run docker:down
```

---

## 🔐 Environment Variables

The application enforces strict startup validation via Zod in `server/config.ts`. Missing required variables will cause the server process or container to fail fast with an actionable diagnostic message.

| Variable | Description | Required? | Secret? | Default Value |
| :--- | :--- | :---: | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection URL with pooling parameters | **Yes** | **Yes** | `postgresql://user:pass@localhost:5432/constructiq` |
| `SESSION_SECRET` | 32+ character key used to sign and encrypt session cookies | **Yes** | **Yes** | *None* |
| `NODE_ENV` | Environment target (`development`, `production`, `test`) | No | No | `development` |
| `PORT` | HTTP server binding port | No | No | `3001` |
| `DEMO_MODE` | Opt-in switch for demo triggers and scenario seeding | No | No | `false` |
| `DEMO_PASSWORD` | Password applied to seeded demo user accounts | No | **Yes** | `DemoPass123!` |
| `S3_BUCKET` | AWS S3 bucket for construction photo evidence storage | Prod Only | No | `""` (uses local `./uploads` in dev) |
| `AWS_REGION` | AWS Region for S3 and Secrets Manager integration | No | No | `us-east-1` |
| `UPLOAD_DIR` | Local fallback directory for photo storage in dev | No | No | `./uploads` |
| `NVIDIA_API_KEY` | NVIDIA NIM Cloud API authentication token | Optional | **Yes** | `""` |
| `NVIDIA_MODEL` | Target NIM foundation model | No | No | `meta/llama-3.2-11b-vision-instruct` |
| `GEMINI_API_KEY` | Google Gemini API key used for secondary AI failover | Optional | **Yes** | `""` |

---

## 🚀 Deployment Guide

ConstructIQ uses Terraform infrastructure as code organized into modular layers with independent bootstrap, development, and production environments.

### Phase 1: Bootstrap (State Bucket & Lock Table)
The S3 state bucket and DynamoDB locking table must exist prior to applying environment infrastructure:
```bash
cd terraform/bootstrap
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan
```
*Note the output `tf_state_bucket_name` and `tf_lock_table_name`.*

### Phase 2: Deploy Development Environment (`dev`)
```bash
cd ../envs/dev
terraform init \
  -backend-config="bucket=constructiq-tf-state-us-east-1" \
  -backend-config="key=constructiq/dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=constructiq-tf-locks"

terraform plan -out=dev.tfplan
# Request confirmation before applying billable cloud resources
terraform apply dev.tfplan
```

### Phase 3: Deploy Production Environment (`prod`)
Production provisions a Multi-AZ VPC, PostgreSQL 16 RDS instance with deletion protection and automated snapshots, dual-replica ECS Fargate tasks with autoscaling up to 10 instances, and CloudWatch alarm triggers:
```bash
cd ../envs/prod
terraform init \
  -backend-config="bucket=constructiq-tf-state-us-east-1" \
  -backend-config="key=constructiq/prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=constructiq-tf-locks"

terraform plan -out=prod.tfplan
terraform apply prod.tfplan
```

### Phase 4: Populate AWS Secrets Manager Out-of-Band
Never commit secrets to Terraform. Inject values directly via the AWS CLI:
```bash
# Database URL
aws secretsmanager put-secret-value \
  --secret-id "constructiq/prod/DATABASE_URL" \
  --secret-string "postgresql://app_user:PROD_PASSWORD@rds-endpoint:5432/constructiq?schema=public&sslmode=require"

# Session Secret (32+ bytes)
aws secretsmanager put-secret-value \
  --secret-id "constructiq/prod/SESSION_SECRET" \
  --secret-string "$(openssl rand -hex 32)"

# AI API Keys
aws secretsmanager put-secret-value \
  --secret-id "constructiq/prod/NVIDIA_API_KEY" \
  --secret-string "nvapi-prod-key-goes-here"
```

---

## 📖 Operations Runbook

### 1. Rolling Deployment Rollback
If a deployment fails smoke tests or introduces runtime regressions, trigger immediate rollback to the previous task definition:
```bash
# 1. Identify previous stable task definition revision
aws ecs list-task-definitions --family-prefix constructiq-prod-app --sort DESC --max-items 5

# 2. Update service to previous revision
aws ecs update-service \
  --cluster constructiq-prod \
  --service constructiq-prod-service \
  --task-definition constructiq-prod-app:<PREVIOUS_REVISION> \
  --force-new-deployment

# 3. Wait for stability
aws ecs wait services-stable \
  --cluster constructiq-prod \
  --service constructiq-prod-service
```

### 2. Restoring RDS from a Snapshot
In case of catastrophic database corruption:
```bash
# 1. Identify target automated snapshot
aws rds describe-db-snapshots \
  --db-instance-identifier constructiq-prod-postgres \
  --snapshot-type automated \
  --query "DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]" --output table

# 2. Restore to a new instance identifier
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier constructiq-prod-postgres-restored \
  --db-snapshot-identifier <SNAPSHOT_IDENTIFIER> \
  --db-subnet-group-name constructiq-prod-rds-subnets \
  --vpc-security-group-ids <RDS_SG_ID>

# 3. Update DATABASE_URL in Secrets Manager with the new endpoint once available
```

### 3. Rotating `SESSION_SECRET`
Rotating `SESSION_SECRET` invalidates all existing active browser sessions, forcing users to re-authenticate:
1. Generate a new cryptographically random secret:
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```
2. Update Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id "constructiq/prod/SESSION_SECRET" \
     --secret-string "$NEW_SECRET"
   ```
3. Restart ECS tasks to pick up the revised secret:
   ```bash
   aws ecs update-service \
     --cluster constructiq-prod \
     --service constructiq-prod-service \
     --force-new-deployment
   ```

### 4. Reading Application & System Logs
ConstructIQ logs in structured JSON format via Pino. To stream real-time logs filtered by severity:
```bash
# Stream error-level logs from CloudWatch
aws logs tail /ecs/constructiq-prod --follow --filter-pattern '{ $.level >= 50 }'

# Query by request ID trace
aws logs filter-log-events \
  --log-group-name /ecs/constructiq-prod \
  --filter-pattern '{ $.req.id = "specific-request-uuid" }'
```

---

## 💰 Estimated Monthly AWS Cost

*Estimated baseline running costs for the `prod` environment in `us-east-1`:*

| AWS Service | Specifications / Sizing | Monthly Estimate (USD) |
| :--- | :--- | :---: |
| **ECS on AWS Fargate** | 2 tasks × 0.5 vCPU, 1 GB RAM (24/7 baseline) | ~$30.00 |
| **Amazon RDS (PostgreSQL 16)** | `db.t4g.small` Multi-AZ, 20 GB gp3 storage | ~$52.00 |
| **Application Load Balancer (ALB)** | 1 ALB, ~15 LCU (traffic and connection processing) | ~$22.50 |
| **Amazon S3 & Data Transfer** | 100 GB standard storage, 50k presigned GET requests | ~$3.50 |
| **NAT Gateway** | 1 NAT Gateway in primary AZ (~$32.40 base + data processing) | ~$36.00 |
| **CloudWatch & Secrets Manager** | Log group retention (30 days), 5 metric alarms, 5 secrets | ~$7.50 |
| **Total Estimated Monthly Spend** | **Standard High-Availability Production Baseline** | **~$151.50** |

*Assumptions: us-east-1 pricing; single NAT Gateway configured for private subnets; modest dev/staging workloads running on `db.t4g.micro` with 1 task reduce dev environment costs to under ~$45.00/month.*

---

## 📁 Repository Structure

```
Construction-IQ/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Automated lint, Vitest against Postgres, and Trivy scans
│   │   └── cd.yml                    # OIDC deployment to ECR, ECS Fargate, with rollback
│   ├── dependabot.yml                # Dependency automation (npm, docker, actions, terraform)
│   └── pull_request_template.md      # Standardized PR review checklist
├── docs/
│   └── adr/                          # Architecture Decision Records
│       ├── 0001-ecs-fargate-over-eks.md
│       ├── 0002-prisma-over-raw-sql.md
│       ├── 0003-oidc-over-access-keys.md
│       └── 0004-s3-presigned-urls-over-public-uploads.md
├── prisma/
│   ├── migrations/                   # Committed versioned SQL migrations
│   ├── schema.prisma                 # 13 core relational models & PostgreSQL enums
│   └── seed.ts                       # Database seeder with demo accounts & project data
├── server/                           # Express 4 + TypeScript Application Server
│   ├── auth/
│   │   ├── middleware.ts             # Role-based access control & rate limiting
│   │   └── session.ts                # Session management & cookie signing
│   ├── routes/
│   │   ├── auth.ts                   # Login, logout, session verification
│   │   ├── copilot.ts                # AI Copilot endpoint with server context hydration
│   │   ├── incidents.ts              # Safety incident reporting and EHS resolution
│   │   ├── invoices.ts               # Vendor invoices & financial approvals
│   │   ├── logs.ts                   # Append-only site operations feed
│   │   ├── milestones.ts             # Project schedule milestones
│   │   ├── photos.ts                 # Multipart upload with magic-byte verification
│   │   ├── projects.ts               # Project metrics, EVM, and crane halt clearing
│   │   ├── punchItems.ts             # QA/QC defect punchlist items
│   │   ├── risks.ts                  # Risk mitigation matrix
│   │   ├── tasks.ts                  # Task schedule & CPM dependency checks
│   │   └── weather.ts                # Cached Open-Meteo telemetry
│   ├── services/
│   │   ├── cpm.ts                    # Critical Path Method calculation engine
│   │   ├── evm.ts                    # Earned Value Management (EVM) calculation engine
│   │   ├── safety.ts                 # Verifiable safety streak calculator
│   │   └── weather.ts                # Open-Meteo client with 15-minute TTL cache
│   ├── config.ts                     # Zod-validated environment configuration
│   ├── db.ts                         # Singleton Prisma client
│   ├── index.ts                      # Express entry point, helmet, Pino, and /metrics
│   └── logger.ts                     # Pino structured logger instance
├── shared/                           # Shared schemas & utilities (frontend + backend)
│   ├── currency.ts                   # INR formatting & currency conversion
│   ├── evmConfig.ts                  # EVM thresholds & health status evaluation
│   ├── permissions.ts                # 5-role x 26-action permission matrix
│   └── schemas.ts                    # Zod validation schemas with .strict() enforcement
├── src/                              # React 19 Frontend (Vite + Tailwind CSS v4)
│   ├── api/
│   │   ├── client.ts                 # Fetch wrapper with automatic credentials handling
│   │   └── queries.ts                # TanStack Query hooks & mutations
│   ├── components/                   # Modular UI views & drawers
│   │   ├── AICopilotDrawer.tsx
│   │   ├── ExecutiveReportModal.tsx
│   │   ├── ExecutiveView.tsx
│   │   ├── FinancialView.tsx
│   │   ├── GanttChart.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MetricCard.tsx
│   │   ├── ProjectSettingsModal.tsx
│   │   ├── PunchlistView.tsx
│   │   ├── RoleViewSelector.tsx
│   │   ├── SafetyView.tsx
│   │   ├── SimulatorControl.tsx
│   │   └── SupervisorView.tsx
│   ├── App.tsx                       # Authenticated shell layout & tab routing
│   ├── index.css                     # Tailwind CSS styling
│   └── main.tsx                      # QueryClientProvider & React DOM root
├── terraform/                        # Infrastructure as Code (AWS)
│   ├── bootstrap/                    # Remote S3 state & DynamoDB lock table
│   ├── envs/
│   │   ├── dev/                      # Development environment definition
│   │   └── prod/                     # Production environment definition
│   ├── modules/                      # Reusable infrastructure modules
│   │   ├── alb/                      # Application Load Balancer & /metrics blocking rule
│   │   ├── ecr/                      # Elastic Container Registry & lifecycle policy
│   │   ├── ecs/                      # Fargate cluster, task definition, and autoscaling
│   │   ├── network/                  # VPC, public/private subnets, NAT, and security groups
│   │   ├── observability/            # CloudWatch log group, 5 alarms, and dashboard
│   │   ├── rds/                      # PostgreSQL 16 instance with automated snapshots
│   │   ├── s3/                       # Private bucket for uploaded photos
│   │   └── secrets/                  # Secrets Manager parameter placeholders
│   └── backend.tf                    # Remote S3 backend specification
├── docker-compose.yml                # Multi-service local development stack
├── Dockerfile                        # Multi-stage production container definition
├── package.json                      # Build scripts, test runners, and dependencies
├── vite.config.ts                    # Vite build configuration with manualChunks code splitting
└── vitest.config.ts                  # Vitest runner configuration
```
