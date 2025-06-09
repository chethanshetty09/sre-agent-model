# SRE Agent - Complete Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [AWS Environment Setup](#aws-environment-setup)
4. [Azure Environment Setup](#azure-environment-setup)
5. [Configuration Guide](#configuration-guide)
6. [Testing & Validation](#testing--validation)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)

## Overview

The SRE Agent is an AI-powered Site Reliability Engineering platform that provides:
- Real-time infrastructure monitoring
- AI-based anomaly detection using Hugging Face transformers
- Automated incident response
- Configuration analysis and recommendations
- Predictive failure detection

### Architecture Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Python API    │    │   ML Models     │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (HuggingFace) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Database      │    │   Metrics Store │
│   (ALB/App GW)  │    │   (RDS/SQL DB)  │    │   (CloudWatch/  │
│                 │    │                 │    │    Azure Mon)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### System Requirements
- **CPU**: 4+ cores (8+ recommended for ML workloads)
- **Memory**: 16GB+ RAM (32GB+ recommended)
- **Storage**: 100GB+ SSD
- **Network**: Stable internet connection for model downloads

### Software Dependencies
- **Python**: 3.9+
- **Node.js**: 18+
- **Docker**: 20.10+
- **Git**: Latest version

### Cloud Account Requirements
- **AWS**: Account with appropriate IAM permissions
- **Azure**: Subscription with contributor access
- **Hugging Face**: Account for model access (optional for custom models)

## AWS Environment Setup

### 1. IAM Permissions Setup

Create an IAM policy with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "rds:*",
                "cloudwatch:*",
                "logs:*",
                "s3:*",
                "iam:ListRoles",
                "iam:PassRole",
                "elasticloadbalancing:*",
                "autoscaling:*",
                "sns:*",
                "sqs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2. Infrastructure Deployment

#### Option A: Using AWS CDK (Recommended)

```bash
# Install AWS CDK
npm install -g aws-cdk

# Create deployment directory
mkdir sre-agent-aws && cd sre-agent-aws

# Initialize CDK project
cdk init app --language python

# Install dependencies
pip install aws-cdk-lib constructs
```

Create `app.py`:
```python
#!/usr/bin/env python3
import aws_cdk as cdk
from sre_agent_stack import SREAgentStack

app = cdk.App()
SREAgentStack(app, "SREAgentStack",
    env=cdk.Environment(
        account="YOUR_ACCOUNT_ID",
        region="us-east-1"  # Change as needed
    )
)

app.synth()
```

#### Option B: Using Terraform

Create `main.tf`:
```hcl
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

# Application Load Balancer
resource "aws_lb" "sre_agent_alb" {
  name               = "sre-agent-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnet[*].id

  enable_deletion_protection = false
}

# ECS Cluster
resource "aws_ecs_cluster" "sre_agent_cluster" {
  name = "sre-agent-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS Database
resource "aws_db_instance" "sre_agent_db" {
  identifier     = "sre-agent-db"
  engine         = "postgres"
  engine_version = "14.9"
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
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
}
```

### 3. Environment Configuration

Create `.env.aws`:
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Database Configuration
DATABASE_URL=postgresql://sreagent:password@your-rds-endpoint:5432/sreagent

# Monitoring Configuration
CLOUDWATCH_REGION=us-east-1
PROMETHEUS_URL=http://prometheus.monitoring.svc.cluster.local:9090

# Application Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
LOG_LEVEL=INFO

# ML Model Configuration
HUGGINGFACE_API_KEY=your_hf_token
MODEL_CACHE_DIR=/tmp/models

# Alerting Configuration
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:sre-alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 4. Deploy to AWS ECS

Create `docker-compose.aws.yml`:
```yaml
version: '3.8'

services:
  sre-agent-api:
    build: ./python-backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - AWS_REGION=${AWS_REGION}
      - CLOUDWATCH_REGION=${CLOUDWATCH_REGION}
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 4G
          cpus: '2'

  sre-agent-frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://your-alb-dns-name.us-east-1.elb.amazonaws.com:8000
    deploy:
      replicas: 2

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 512M
```

## Azure Environment Setup

### 1. Azure CLI Setup

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set subscription
az account set --subscription "Your Subscription Name"

# Create resource group
az group create --name sre-agent-rg --location eastus
```

### 2. Infrastructure Deployment with ARM Templates

Create `azuredeploy.json`:
```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "appName": {
            "type": "string",
            "defaultValue": "sre-agent",
            "metadata": {
                "description": "Name of the application"
            }
        },
        "location": {
            "type": "string",
            "defaultValue": "[resourceGroup().location]",
            "metadata": {
                "description": "Location for all resources"
            }
        }
    },
    "variables": {
        "appServicePlanName": "[concat(parameters('appName'), '-plan')]",
        "webAppName": "[concat(parameters('appName'), '-webapp')]",
        "sqlServerName": "[concat(parameters('appName'), '-sql')]",
        "databaseName": "[concat(parameters('appName'), '-db')]"
    },
    "resources": [
        {
            "type": "Microsoft.Web/serverfarms",
            "apiVersion": "2021-02-01",
            "name": "[variables('appServicePlanName')]",
            "location": "[parameters('location')]",
            "sku": {
                "name": "B2",
                "tier": "Basic"
            },
            "kind": "linux",
            "properties": {
                "reserved": true
            }
        },
        {
            "type": "Microsoft.Web/sites",
            "apiVersion": "2021-02-01",
            "name": "[variables('webAppName')]",
            "location": "[parameters('location')]",
            "dependsOn": [
                "[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]"
            ],
            "properties": {
                "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]",
                "siteConfig": {
                    "linuxFxVersion": "PYTHON|3.9"
                }
            }
        }
    ]
}
```

Deploy the template:
```bash
az deployment group create \
  --resource-group sre-agent-rg \
  --template-file azuredeploy.json \
  --parameters appName=sre-agent
```

### 3. Azure Container Instances Deployment

Create `azure-container-deployment.yml`:
```yaml
apiVersion: 2019-12-01
location: eastus
name: sre-agent-container-group
properties:
  containers:
  - name: sre-agent-api
    properties:
      image: your-registry.azurecr.io/sre-agent-api:latest
      resources:
        requests:
          cpu: 2
          memoryInGb: 4
      ports:
      - port: 8000
      environmentVariables:
      - name: DATABASE_URL
        value: postgresql://user:pass@your-postgres.postgres.database.azure.com:5432/sreagent
      - name: AZURE_SUBSCRIPTION_ID
        value: your-subscription-id
      - name: AZURE_RESOURCE_GROUP
        value: sre-agent-rg
  - name: sre-agent-frontend
    properties:
      image: your-registry.azurecr.io/sre-agent-frontend:latest
      resources:
        requests:
          cpu: 1
          memoryInGb: 2
      ports:
      - port: 3000
  osType: Linux
  ipAddress:
    type: Public
    ports:
    - protocol: tcp
      port: 8000
    - protocol: tcp
      port: 3000
tags: {}
type: Microsoft.ContainerInstance/containerGroups
```

### 4. Azure Environment Configuration

Create `.env.azure`:
```bash
# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=sre-agent-rg
AZURE_LOCATION=eastus
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Database Configuration (Azure PostgreSQL)
DATABASE_URL=postgresql://user:pass@your-postgres.postgres.database.azure.com:5432/sreagent

# Monitoring Configuration
AZURE_MONITOR_WORKSPACE_ID=your-workspace-id
AZURE_MONITOR_WORKSPACE_KEY=your-workspace-key

# Application Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
LOG_LEVEL=INFO

# ML Model Configuration
HUGGINGFACE_API_KEY=your_hf_token
MODEL_CACHE_DIR=/tmp/models

# Alerting Configuration
AZURE_WEBHOOK_URL=your-logic-app-webhook-url
TEAMS_WEBHOOK_URL=your-teams-webhook-url
```

## Configuration Guide

### 1. Database Setup

#### PostgreSQL Schema Creation
```sql
-- Create database
CREATE DATABASE sreagent;

-- Create tables
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100),
    tags JSONB
);

CREATE TABLE anomalies (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    anomaly_score FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    description TEXT,
    recommendations JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX idx_metrics_name ON metrics(metric_name);
CREATE INDEX idx_anomalies_detected_at ON anomalies(detected_at);
```

### 2. Monitoring Integration

#### AWS CloudWatch Integration
```python
# python-backend/src/integrations/aws_cloudwatch.py
import boto3
from datetime import datetime, timedelta

class CloudWatchIntegration:
    def __init__(self, region_name='us-east-1'):
        self.cloudwatch = boto3.client('cloudwatch', region_name=region_name)
        self.ec2 = boto3.client('ec2', region_name=region_name)
    
    async def collect_ec2_metrics(self, instance_ids=None):
        """Collect EC2 instance metrics"""
        if not instance_ids:
            # Get all running instances
            response = self.ec2.describe_instances(
                Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
            )
            instance_ids = []
            for reservation in response['Reservations']:
                for instance in reservation['Instances']:
                    instance_ids.append(instance['InstanceId'])
        
        metrics = []
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        
        for instance_id in instance_ids:
            # CPU Utilization
            cpu_response = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=300,
                Statistics=['Average']
            )
            
            for datapoint in cpu_response['Datapoints']:
                metrics.append({
                    'metric_name': 'cpu_utilization',
                    'value': datapoint['Average'],
                    'timestamp': datapoint['Timestamp'],
                    'source': f'ec2-{instance_id}',
                    'tags': {'instance_id': instance_id, 'metric_type': 'cpu'}
                })
        
        return metrics
```

#### Azure Monitor Integration
```python
# python-backend/src/integrations/azure_monitor.py
from azure.monitor.query import LogsQueryClient, MetricsQueryClient
from azure.identity import DefaultAzureCredential

class AzureMonitorIntegration:
    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.logs_client = LogsQueryClient(self.credential)
        self.metrics_client = MetricsQueryClient(self.credential)
    
    async def collect_vm_metrics(self, resource_ids):
        """Collect Azure VM metrics"""
        metrics = []
        
        for resource_id in resource_ids:
            # Query CPU percentage
            cpu_metrics = self.metrics_client.query_resource(
                resource_uri=resource_id,
                metric_names=["Percentage CPU"],
                timespan=timedelta(hours=1)
            )
            
            for metric in cpu_metrics.metrics:
                for time_series in metric.timeseries:
                    for data_point in time_series.data:
                        if data_point.average:
                            metrics.append({
                                'metric_name': 'cpu_percentage',
                                'value': data_point.average,
                                'timestamp': data_point.time_stamp,
                                'source': resource_id,
                                'tags': {'resource_type': 'vm', 'metric_type': 'cpu'}
                            })
        
        return metrics
```

### 3. ML Model Configuration

#### Custom Model Training
```python
# python-backend/scripts/train_custom_models.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
import pandas as pd
import torch

def train_config_analyzer():
    """Train a custom model for infrastructure configuration analysis"""
    
    # Load your infrastructure configuration dataset
    # Format: {"text": "config content", "label": "safe/warning/critical"}
    df = pd.read_csv('data/infrastructure_configs.csv')
    
    tokenizer = AutoTokenizer.from_pretrained('microsoft/DialoGPT-medium')
    model = AutoModelForSequenceClassification.from_pretrained(
        'microsoft/DialoGPT-medium',
        num_labels=3  # safe, warning, critical
    )
    
    # Tokenize data
    def tokenize_function(examples):
        return tokenizer(examples['text'], truncation=True, padding=True)
    
    train_dataset = Dataset.from_pandas(df).map(tokenize_function, batched=True)
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir='./models/config-analyzer',
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=64,
        warmup_steps=500,
        weight_decay=0.01,
        logging_dir='./logs',
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        tokenizer=tokenizer,
    )
    
    trainer.train()
    trainer.save_model()

if __name__ == "__main__":
    train_config_analyzer()
```

### 4. Alert Configuration

#### Slack Integration
```python
# python-backend/src/integrations/slack_alerts.py
import requests
import json

class SlackAlerter:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url
    
    async def send_anomaly_alert(self, anomaly):
        """Send anomaly alert to Slack"""
        color = {
            'critical': '#ff0000',
            'warning': '#ffaa00',
            'info': '#0099ff'
        }.get(anomaly.severity, '#808080')
        
        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": f"🚨 Anomaly Detected: {anomaly.metric_name}",
                    "fields": [
                        {
                            "title": "Value",
                            "value": str(anomaly.value),
                            "short": True
                        },
                        {
                            "title": "Confidence",
                            "value": f"{anomaly.confidence:.1f}%",
                            "short": True
                        },
                        {
                            "title": "Severity",
                            "value": anomaly.severity.upper(),
                            "short": True
                        },
                        {
                            "title": "Description",
                            "value": anomaly.description,
                            "short": False
                        }
                    ],
                    "footer": "SRE Agent",
                    "ts": int(anomaly.timestamp.timestamp())
                }
            ]
        }
        
        response = requests.post(self.webhook_url, json=payload)
        return response.status_code == 200
```

## Testing & Validation

### 1. Local Testing Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd sre-agent

# Set up Python environment
cd python-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up frontend
cd ../
npm install

# Start services
docker-compose up -d  # Start supporting services (Redis, PostgreSQL)
cd python-backend && python src/main.py  # Start API
cd ../ && npm run dev  # Start frontend
```

### 2. API Testing

```bash
# Test health endpoint
curl http://localhost:8000/api/v1/health

# Test anomaly detection
curl -X POST http://localhost:8000/api/v1/anomalies/predict \
  -H "Content-Type: application/json" \
  -d '{
    "metric_name": "cpu_usage",
    "values": [45, 52, 48, 55, 95, 32],
    "timestamps": ["2024-01-15T14:00:00Z", "2024-01-15T14:10:00Z", ...]
  }'

# Test infrastructure analysis
curl -X POST http://localhost:8000/api/v1/infrastructure/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "config_type": "terraform",
    "config_content": "resource \"aws_security_group\" \"web\" { ... }"
  }'
```

### 3. Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API performance
ab -n 1000 -c 10 http://localhost:8000/api/v1/health

# Test with POST data
ab -n 100 -c 5 -p test_data.json -T application/json \
   http://localhost:8000/api/v1/anomalies/predict
```

### 4. Model Validation

```python
# python-backend/tests/test_models.py
import pytest
from src.services.anomaly_detector import AnomalyDetector
from src.services.ml_model_manager import MLModelManager

@pytest.mark.asyncio
async def test_anomaly_detection():
    """Test anomaly detection accuracy"""
    ml_manager = MLModelManager()
    await ml_manager.initialize()
    
    detector = AnomalyDetector(ml_manager)
    await detector.initialize()
    
    # Test with known anomaly
    test_data = {
        'values': [45, 47, 46, 48, 95, 47, 46],  # 95 is anomaly
        'timestamps': [...]
    }
    
    anomalies = await detector.detect_anomalies('cpu_usage', test_data)
    
    # Should detect the spike at 95
    assert len(anomalies) == 1
    assert anomalies[0].value == 95
    assert anomalies[0].is_anomaly == True
```

## Monitoring Setup

### 1. Prometheus Configuration

Create `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sre-agent-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'cloudwatch'
    ec2_sd_configs:
      - region: us-east-1
        port: 9100
```

### 2. Grafana Dashboards

Import the provided dashboard JSON or create custom dashboards:

```json
{
  "dashboard": {
    "title": "SRE Agent Monitoring",
    "panels": [
      {
        "title": "Anomaly Detection Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(sre_anomalies_total[5m])",
            "legendFormat": "Anomalies/sec"
          }
        ]
      },
      {
        "title": "Model Accuracy",
        "type": "gauge",
        "targets": [
          {
            "expr": "sre_model_accuracy",
            "legendFormat": "{{model_name}}"
          }
        ]
      }
    ]
  }
}
```

### 3. Log Aggregation

#### ELK Stack Configuration
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## Troubleshooting

### Common Issues

#### 1. Model Loading Errors
```bash
# Error: "Model not found"
# Solution: Check Hugging Face token and model permissions
export HUGGINGFACE_API_KEY=your_token
huggingface-cli login

# Error: "CUDA out of memory"
# Solution: Reduce batch size or use CPU
export CUDA_VISIBLE_DEVICES=""  # Force CPU usage
```

#### 2. Database Connection Issues
```bash
# Error: "Connection refused"
# Check database status
docker ps | grep postgres

# Check connection string
psql "postgresql://user:pass@host:5432/dbname"

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### 3. Cloud Provider Authentication
```bash
# AWS: Check credentials
aws sts get-caller-identity

# Azure: Check login
az account show

# Fix permissions
aws iam attach-user-policy --user-name sre-agent --policy-arn arn:aws:iam::aws:policy/CloudWatchFullAccess
```

#### 4. Performance Issues
```bash
# Monitor resource usage
docker stats

# Check logs
docker-compose logs -f sre-agent-api

# Optimize model loading
# Use smaller models for testing:
# - distilbert-base-uncased instead of bert-base-uncased
# - distilroberta-base instead of roberta-base
```

### Debug Mode

Enable debug mode for detailed logging:
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
python src/main.py
```

### Health Checks

```bash
# API health
curl http://localhost:8000/api/v1/health

# Database health
curl http://localhost:8000/api/v1/health/database

# Model health
curl http://localhost:8000/api/v1/health/models
```

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring dashboards configured
- [ ] Alert rules configured
- [ ] Backup strategy implemented
- [ ] Security groups/firewall rules configured
- [ ] Load balancer health checks configured
- [ ] Auto-scaling policies configured
- [ ] Log aggregation configured
- [ ] Model artifacts uploaded to cloud storage
- [ ] CI/CD pipeline configured
- [ ] Documentation updated
- [ ] Team training completed

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Consult cloud provider documentation
4. Open an issue in the project repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.