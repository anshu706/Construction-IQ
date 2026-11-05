# ADR 0003: OpenID Connect (OIDC) Authentication for CI/CD over Static AWS Access Keys

## Status
Accepted

## Context
The continuous deployment (CD) pipeline in GitHub Actions needs permission to authenticate with AWS to push Docker images to Amazon ECR, run database migration tasks in Amazon ECS, and update ECS services. Long-lived credentials (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) stored as CI secrets present severe exfiltration and credential rotation risks.

## Decision
We mandate **OpenID Connect (OIDC)** authentication via `aws-actions/configure-aws-credentials` with an IAM Role configured with a trust policy restricting access to the GitHub repository and `main` branch.

## Consequences

### Positive
- **No Long-Lived Secrets**: Zero static AWS credentials stored in GitHub repository settings or accessible to repository contributors.
- **Short-Lived STS Tokens**: Authenticated sessions receive temporary tokens valid for a maximum of 1 hour.
- **Auditable Principal Identity**: Every deployment action is attributed to the GitHub OIDC federated identity in AWS CloudTrail logs.
- **Strict Scope**: The IAM trust relationship explicitly bounds the `sub` claim to `repo:owner/Construction-IQ:ref:refs/heads/main`.

### Negative
- Requires initial out-of-band setup of the AWS IAM OIDC Identity Provider for `token.actions.githubusercontent.com`.

