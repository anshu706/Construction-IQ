# ADR 0001: AWS ECS Fargate over EKS for Container Orchestration

## Status
Accepted

## Context
ConstructIQ is an enterprise construction project intelligence application comprising a Node.js Express API backend and a React Vite frontend served from a single container, backed by PostgreSQL. The operations team requires high reliability, automated rollouts, zero control plane maintenance overhead, and predictable infrastructure costs.

## Decision
We select **AWS ECS on AWS Fargate** rather than Amazon Elastic Kubernetes Service (EKS).

## Consequences

### Positive
- **Zero Cluster Management**: Fargate abstracts node provisioning, patching, AMI upgrades, and worker node scaling.
- **Cost Efficiency**: No fixed control plane hourly charge ($73/month for EKS cluster), paying only for container vCPU and RAM seconds consumed.
- **Seamless IAM Integration**: Task Execution Role and Task Role provide granular least-privilege access to AWS Secrets Manager and S3 without configuring OIDC identity providers or Kubernetes service accounts (IRSA).
- **Simpler CD Pipeline**: Deployments update the ECS service task definition with native blue/green or rolling updates and built-in rollback.

### Negative
- Less flexibility for complex multi-cloud mesh topologies compared to Kubernetes manifests.
- DaemonSet patterns are replaced by sidecar containers in task definitions.

