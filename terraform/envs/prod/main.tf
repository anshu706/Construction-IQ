################################################################################
# ConstructIQ — Environment: Production (prod)
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure via: terraform init -backend-config="key=constructiq/prod/terraform.tfstate" ...
    key     = "constructiq/prod/terraform.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}

variable "project" {
  type    = string
  default = "constructiq"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for HTTPS listener on ALB"
  default     = "arn:aws:acm:us-east-1:123456789012:certificate/prod-placeholder"
}

variable "image_uri" {
  type        = string
  description = "Container image URI in ECR"
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/constructiq-prod:latest"
}

# 1. Network
module "network" {
  source      = "../../modules/network"
  project     = var.project
  environment = var.environment
  vpc_cidr    = "10.1.0.0/16"
}

# 2. ECR
module "ecr" {
  source      = "../../modules/ecr"
  project     = var.project
  environment = var.environment
}

# 3. Secrets
module "secrets" {
  source      = "../../modules/secrets"
  project     = var.project
  environment = var.environment
}

# 4. S3 Storage
module "s3" {
  source      = "../../modules/s3"
  project     = var.project
  environment = var.environment
}

# 5. RDS PostgreSQL 16 (High Availability & Production Hardened)
module "rds" {
  source                     = "../../modules/rds"
  project                    = var.project
  environment                = var.environment
  private_subnet_ids         = module.network.private_subnet_ids
  rds_sg_id                  = module.network.rds_sg_id
  db_instance_class          = "db.t4g.small"
  deletion_protection        = true
  db_credentials_secret_arn  = module.secrets.db_credentials_arn
}

# 6. ALB
module "alb" {
  source              = "../../modules/alb"
  project             = var.project
  environment         = var.environment
  vpc_id              = module.network.vpc_id
  public_subnet_ids   = module.network.public_subnet_ids
  alb_sg_id           = module.network.alb_sg_id
  acm_certificate_arn = var.acm_certificate_arn
}

# 7. Observability
module "observability" {
  source               = "../../modules/observability"
  project              = var.project
  environment          = var.environment
  alb_arn_suffix       = module.alb.alb_arn_suffix
  target_group_suffix  = module.alb.target_group_arn_suffix
  db_instance_id       = module.rds.db_instance_id
  ecs_cluster_name     = "${var.project}-${var.environment}"
  ecs_service_name     = "${var.project}-${var.environment}-service"
}

# 8. ECS Fargate (2 replicas minimum with autoscaling up to 10)
module "ecs" {
  source             = "../../modules/ecs"
  project            = var.project
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  app_sg_id          = module.network.app_sg_id
  target_group_arn   = module.alb.target_group_arn
  image_uri          = var.image_uri
  task_cpu           = 512
  task_memory        = 1024
  app_count          = 2
  db_secret_arn      = module.secrets.database_url_arn
  session_secret_arn = module.secrets.session_secret_arn
  nvidia_key_arn     = module.secrets.nvidia_api_key_arn
  gemini_key_arn     = module.secrets.gemini_api_key_arn
  s3_bucket          = module.s3.bucket_name
  log_group_name     = module.observability.log_group_name
}

output "alb_dns_name"       { value = module.alb.alb_dns_name }
output "ecr_repository_url" { value = module.ecr.repository_url }
output "s3_bucket_name"     { value = module.s3.bucket_name }

