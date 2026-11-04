################################################################################
# module: secrets — Secrets Manager entries (placeholders; values supplied out-of-band)
################################################################################

variable "project"     { type = string }
variable "environment" { type = string }

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project}/${var.environment}/DATABASE_URL"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "session_secret" {
  name                    = "${var.project}/${var.environment}/SESSION_SECRET"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "nvidia_api_key" {
  name                    = "${var.project}/${var.environment}/NVIDIA_API_KEY"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "gemini_api_key" {
  name                    = "${var.project}/${var.environment}/GEMINI_API_KEY"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project}/${var.environment}/db_credentials"
  recovery_window_in_days = 0
}

output "database_url_arn"    { value = aws_secretsmanager_secret.database_url.arn }
output "session_secret_arn" { value = aws_secretsmanager_secret.session_secret.arn }
output "nvidia_api_key_arn"  { value = aws_secretsmanager_secret.nvidia_api_key.arn }
output "gemini_api_key_arn"  { value = aws_secretsmanager_secret.gemini_api_key.arn }
output "db_credentials_arn"  { value = aws_secretsmanager_secret.db_credentials.arn }
