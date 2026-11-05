################################################################################
# module: alb — HTTPS ALB with HTTP redirect, /metrics blocked from internet
################################################################################

variable "project"            { type = string }
variable "environment"        { type = string }
variable "vpc_id"             { type = string }
variable "public_subnet_ids"  { type = list(string) }
variable "alb_sg_id"          { type = string }
variable "acm_certificate_arn"{ type = string }
variable "target_group_port"  { type = number; default = 3001 }

resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  security_groups    = [var.alb_sg_id]

  access_logs {
    bucket  = "${var.project}-${var.environment}-alb-logs"
    enabled = false  # enable when log bucket exists
  }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project}-${var.environment}-app-tg"
  port        = var.target_group_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/ready"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30
}

# HTTP → HTTPS redirect
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Block /metrics from reaching the app through the public ALB
resource "aws_lb_listener_rule" "block_metrics" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"error\":\"Not found\"}"
      status_code  = "404"
    }
  }

  condition {
    path_pattern { values = ["/metrics", "/metrics/*"] }
  }
}

output "alb_dns_name"          { value = aws_lb.main.dns_name }
output "alb_arn"               { value = aws_lb.main.arn }
output "alb_arn_suffix"        { value = aws_lb.main.arn_suffix }
output "target_group_arn"      { value = aws_lb_target_group.app.arn }
output "target_group_arn_suffix" { value = aws_lb_target_group.app.arn_suffix }

