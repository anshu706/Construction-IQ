################################################################################
# ConstructIQ — Remote State Backend Configuration
# Uses S3 for encrypted state storage and DynamoDB for state locking.
#
# Usage:
#   terraform init \
#     -backend-config="bucket=<STATE_BUCKET_NAME>" \
#     -backend-config="key=constructiq/<ENV>/terraform.tfstate" \
#     -backend-config="region=us-east-1" \
#     -backend-config="dynamodb_table=constructiq-tf-locks"
################################################################################

terraform {
  backend "s3" {
    bucket         = "constructiq-tf-state-us-east-1"
    dynamodb_table = "constructiq-tf-locks"
    region         = "us-east-1"
    encrypt        = true
  }
}

