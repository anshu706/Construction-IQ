################################################################################
# module: ecs — Fargate cluster, task def, service with autoscaling
################################################################################

variable "project"               { type = string }
variable "environment"           { type = string }
variable "aws_region"            { type = string }
variable "vpc_id"                { type = string }
variable "private_subnet_ids"    { type = list(string) }
variable "app_sg_id"             { type = string }
variable "target_group_arn"      { type = string }
variable "image_uri"             { type = string }
variable "task_cpu"              { type = number; default = 512 }
variable "task_memory"           { type = number; default = 1024 }
variable "app_count"             { type = number; default = 2 }
variable "db_secret_arn"         { type = string }
variable "session_secret_arn"    { type = string }
variable "nvidia_key_arn"        { type = string; default = "" }
variable "gemini_key_arn"        { type = string; default = "" }
variable "s3_bucket"             { type = string }
variable "log_group_name"        { type = string }

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["ecs-tasks.amazonaws.com"] }
  }
}

resource "aws_iam_role" "task_exec" {
  name               = "${var.project}-${var.environment}-ecs-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "task_exec_policy" {
  role       = aws_iam_role.task_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task_role" {
  name               = "${var.project}-${var.environment}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "task_secrets" {
  name = "read-secrets"
  role = aws_iam_role.task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = compact([var.db_secret_arn, var.session_secret_arn, var.nvidia_key_arn, var.gemini_key_arn])
    }, {
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = "arn:aws:s3:::${var.s3_bucket}/uploads/*"
    }]
  })
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"
  setting { name = "containerInsights"; value = "enabled" }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project}-${var.environment}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_exec.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = var.image_uri
    essential = true

    portMappings = [{ containerPort = 3001; protocol = "tcp" }]

    readonlyRootFilesystem = false  # app writes to /app/uploads in dev fallback

    # Secrets injected from Secrets Manager – never in env plaintext
    secrets = [
      { name = "DATABASE_URL",    valueFrom = var.db_secret_arn },
      { name = "SESSION_SECRET",  valueFrom = var.session_secret_arn },
    ]

    environment = [
      { name = "NODE_ENV",    value = "production" },
      { name = "PORT",        value = "3001" },
      { name = "S3_BUCKET",   value = var.s3_bucket },
      { name = "AWS_REGION",  value = var.aws_region },
      { name = "DEMO_MODE",   value = "false" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "app"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))\""]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 15
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "${var.project}-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "app"
    container_port   = 3001
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  lifecycle { ignore_changes = [desired_count] }
}

# Autoscaling
resource "aws_appautoscaling_target" "app" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.project}-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# One-off migration task definition
resource "aws_ecs_task_definition" "migrate" {
  family                   = "${var.project}-${var.environment}-migrate"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_exec.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name      = "migrate"
    image     = var.image_uri
    essential = true
    command   = ["npx", "prisma", "migrate", "deploy"]
    secrets   = [{ name = "DATABASE_URL"; valueFrom = var.db_secret_arn }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "migrate"
      }
    }
  }])
}

output "cluster_name"          { value = aws_ecs_cluster.main.name }
output "service_name"          { value = aws_ecs_service.app.name }
output "task_def_family"       { value = aws_ecs_task_definition.app.family }
output "migrate_task_def_family" { value = aws_ecs_task_definition.migrate.family }

