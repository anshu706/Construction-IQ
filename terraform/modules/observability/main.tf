################################################################################
# module: observability — CloudWatch log groups, metric alarms, and dashboard
################################################################################

variable "project"             { type = string }
variable "environment"         { type = string }
variable "alb_arn_suffix"      { type = string }
variable "target_group_suffix" { type = string }
variable "db_instance_id"      { type = string }
variable "ecs_cluster_name"    { type = string }
variable "ecs_service_name"    { type = string }
variable "alarm_action_arns"   { type = list(string); default = [] }

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project}-${var.environment}"
  retention_in_days = 30
  tags = {
    Name        = "${var.project}-${var.environment}-logs"
    Environment = var.environment
  }
}

# 1. ALB 5XX Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project}-${var.environment}-alb-high-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High 5XX rate detected from app targets on ALB"
  alarm_actions       = var.alarm_action_arns

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_suffix
  }
}

# 2. ALB Target Response Time (p95 latency) Alarm
resource "aws_cloudwatch_metric_alarm" "p95_latency" {
  alarm_name          = "${var.project}-${var.environment}-high-p95-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p95"
  threshold           = 1.5 # 1.5 seconds
  alarm_description   = "p95 latency exceeded 1.5s for 3 consecutive minutes"
  alarm_actions       = var.alarm_action_arns

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_suffix
  }
}

# 3. Unhealthy Host Count Alarm
resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  alarm_name          = "${var.project}-${var.environment}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "At least one target container is failing ALB health checks"
  alarm_actions       = var.alarm_action_arns

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_suffix
  }
}

# 4. RDS High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # 80%
  alarm_description   = "RDS instance CPU utilization exceeded 80% for 15 minutes"
  alarm_actions       = var.alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}

# 5. RDS Low Free Storage Space Alarm
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.project}-${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  alarm_description   = "RDS free disk space is less than 5 GB"
  alarm_actions       = var.alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}

# CloudWatch Operations Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-${var.environment}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "ALB Requests & HTTP Status Codes"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p95" }],
            ["...", { stat = "p50" }]
          ]
          period = 60
          region = "us-east-1"
          title  = "ALB Response Time (p95 and p50)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 60
          stat   = "Average"
          region = "us-east-1"
          title  = "ECS Fargate CPU & Memory Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.db_instance_id],
            [".", "FreeStorageSpace", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "RDS PostgreSQL 16 Health"
        }
      }
    ]
  })
}

output "log_group_name" { value = aws_cloudwatch_log_group.app.name }
output "log_group_arn"  { value = aws_cloudwatch_log_group.app.arn }

