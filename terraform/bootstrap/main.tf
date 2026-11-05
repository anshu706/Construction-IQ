################################################################################
# bootstrap: remote state bucket & DynamoDB lock table
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "project" {
  type    = string
  default = "constructiq"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# 1. Terraform State S3 Bucket
resource "aws_s3_bucket" "tf_state" {
  bucket        = "${var.project}-tf-state-${var.aws_region}"
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "${var.project}-tf-state"
    Environment = "bootstrap"
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. DynamoDB Table for Distributed State Locking
resource "aws_dynamodb_table" "tf_lock" {
  name         = "${var.project}-tf-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project}-tf-locks"
    Environment = "bootstrap"
  }
}

output "tf_state_bucket_name" {
  description = "Use this value for backend.tf bucket configuration"
  value       = aws_s3_bucket.tf_state.bucket
}

output "tf_lock_table_name" {
  description = "Use this value for backend.tf dynamodb_table configuration"
  value       = aws_dynamodb_table.tf_lock.name
}

