################################################################################
# module: rds — PostgreSQL 16, private subnets, encrypted, automated backups
################################################################################

variable "project"            { type = string }
variable "environment"        { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "rds_sg_id"          { type = string }
variable "db_name"            { type = string; default = "constructiq" }
variable "db_instance_class"  { type = string; default = "db.t4g.micro" }
variable "deletion_protection"{ type = bool;   default = true }
variable "db_credentials_secret_arn" { type = string }

data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = var.db_credentials_secret_arn
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-rds-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_parameter_group" "pg16" {
  name   = "${var.project}-${var.environment}-pg16"
  family = "postgres16"

  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # log queries > 1 s
  }
}

resource "aws_db_instance" "main" {
  identifier              = "${var.project}-${var.environment}-postgres"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = var.db_instance_class
  db_name                 = var.db_name
  username                = local.db_creds.username
  password                = local.db_creds.password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [var.rds_sg_id]
  parameter_group_name    = aws_db_parameter_group.pg16.name

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot   = true

  # Protection
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-${var.environment}-final-snapshot"

  # Monitoring
  performance_insights_enabled = true
  monitoring_interval          = 60
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # No public access
  publicly_accessible = false

  tags = { Name = "${var.project}-${var.environment}-postgres" }
}

output "db_endpoint" { value = aws_db_instance.main.endpoint }
output "db_name"     { value = aws_db_instance.main.db_name }
output "db_port"     { value = aws_db_instance.main.port }

