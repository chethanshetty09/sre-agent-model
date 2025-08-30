provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "sre_agent_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sre-agent-vpc"
  }
}

# Subnets
resource "aws_subnet" "public_subnet" {
  count             = 2
  vpc_id            = aws_vpc.sre_agent_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "sre-agent-public-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "private_subnet" {
  count             = 2
  vpc_id            = aws_vpc.sre_agent_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sre-agent-private-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "database_subnet" {
  count             = 2
  vpc_id            = aws_vpc.sre_agent_vpc.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sre-agent-database-subnet-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "sre_agent_igw" {
  vpc_id = aws_vpc.sre_agent_vpc.id

  tags = {
    Name = "sre-agent-igw"
  }
}

# NAT Gateway
resource "aws_eip" "nat_eip" {
  domain = "vpc"
}

resource "aws_nat_gateway" "sre_agent_nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet[0].id

  tags = {
    Name = "sre-agent-nat"
  }
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.sre_agent_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sre_agent_igw.id
  }

  tags = {
    Name = "sre-agent-public-rt"
  }
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.sre_agent_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.sre_agent_nat.id
  }

  tags = {
    Name = "sre-agent-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_rta" {
  count          = 2
  subnet_id      = aws_subnet.public_subnet[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_rta" {
  count          = 2
  subnet_id      = aws_subnet.private_subnet[count.index].id
  route_table_id = aws_route_table.private_rt.id
}

# Security Groups
resource "aws_security_group" "alb_sg" {
  name        = "sre-agent-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.sre_agent_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sre-agent-alb-sg"
  }
}

resource "aws_security_group" "app_sg" {
  name        = "sre-agent-app-sg"
  description = "Security group for SRE Agent application"
  vpc_id      = aws_vpc.sre_agent_vpc.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sre-agent-app-sg"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "sre-agent-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.sre_agent_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  tags = {
    Name = "sre-agent-rds-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "sre_agent_alb" {
  name               = "${var.resource_prefix}sre-agent-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnet[*].id

  enable_deletion_protection = false

  tags = {
    Name = "sre-agent-alb"
  }
}

# Target Group
resource "aws_lb_target_group" "sre_agent_tg" {
  name     = "${var.resource_prefix}sre-agent-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = aws_vpc.sre_agent_vpc.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/v1/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "sre-agent-tg"
  }
}

# Listener
resource "aws_lb_listener" "sre_agent_listener" {
  load_balancer_arn = aws_lb.sre_agent_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sre_agent_tg.arn
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "sre_agent_cluster" {
  name = "sre-agent-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "sre-agent-cluster"
  }
}

# RDS Database
resource "aws_db_subnet_group" "sre_agent_db_subnet_group" {
  name       = "${var.resource_prefix}sre-agent-db-subnet-group"
  subnet_ids = aws_subnet.database_subnet[*].id

  tags = {
    Name = "sre-agent-db-subnet-group"
  }
}

resource "aws_db_instance" "sre_agent_db" {
  identifier     = "${var.resource_prefix}sre-agent-db"
  engine         = "postgres"
  # Let AWS pick a supported default minor engine version for PostgreSQL 14
  # (removing a hard-coded unsupported minor version like 14.9 avoids
  # InvalidParameterCombination errors). If you need a specific minor
  # version, run `aws rds describe-db-engine-versions --engine postgres --query 'DBEngineVersions[].EngineVersion'` to list available versions
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name  = "sreagent"
  username = "sreagent"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.sre_agent_db_subnet_group.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot = true

  tags = {
    Name = "sre-agent-db"
  }
}

# S3 Bucket for ML Models
resource "aws_s3_bucket" "sre_agent_models" {
  bucket = "${var.resource_prefix}sre-agent-models-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.force_destroy_s3

  tags = {
    Name = "sre-agent-models"
  }
}

resource "aws_s3_bucket_versioning" "sre_agent_models" {
  bucket = aws_s3_bucket.sre_agent_models.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sre_agent_models" {
  bucket = aws_s3_bucket.sre_agent_models.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "sre_agent_alerts" {
  name = "sre-agent-alerts"

  tags = {
    Name = "sre-agent-alerts"
  }
}

# SQS Queue for Processing
resource "aws_sqs_queue" "sre_agent_processing" {
  name = "sre-agent-processing"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 345600

  tags = {
    Name = "sre-agent-processing"
  }
}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "resource_prefix" {
  description = "Optional prefix to apply to resource names to avoid collisions"
  type        = string
  default     = ""
}

variable "force_destroy_s3" {
  description = "When true, S3 bucket will be force deleted when running terraform destroy (use with caution)"
  type        = bool
  default     = false
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Outputs
output "load_balancer_dns" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.sre_agent_alb.dns_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.sre_agent_db.endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket for ML models"
  value       = aws_s3_bucket.sre_agent_models.bucket
}

output "sns_topic_arn" {
  description = "SNS topic for alerts"
  value       = aws_sns_topic.sre_agent_alerts.arn
}
