# AWS-Specific Setup Guide for SRE Agent

## Quick Start for AWS Environment

### 1. Prerequisites Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter your Access Key ID, Secret Access Key, Region (e.g., us-east-1), and output format (json)

# Verify configuration
aws sts get-caller-identity
```

### 2. IAM Setup

Create an IAM user with programmatic access and attach the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SREAgentPermissions",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeVolumes",
                "ec2:DescribeSnapshots",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:ListMetrics",
                "cloudwatch:PutMetricData",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "rds:DescribeDBInstances",
                "rds:DescribeDBClusters",
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:DescribeTargetGroups",
                "autoscaling:DescribeAutoScalingGroups",
                "sns:Publish",
                "sns:CreateTopic",
                "sns:Subscribe",
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. Infrastructure Deployment

#### Option A: Using AWS CloudFormation

Create `sre-agent-stack.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SRE Agent Infrastructure Stack'

Parameters:
  EnvironmentName:
    Description: Environment name prefix
    Type: String
    Default: sre-agent
  
  VpcCIDR:
    Description: CIDR block for VPC
    Type: String
    Default: 10.0.0.0/16
  
  DBPassword:
    Description: Database password
    Type: String
    NoEcho: true
    MinLength: 8

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCIDR
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-VPC

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-IGW

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-Public-Subnet-AZ1

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-Public-Subnet-AZ2

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.3.0/24
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-Private-Subnet-AZ1

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.4.0/24
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-Private-Subnet-AZ2

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-Public-Routes

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  # Security Groups
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${EnvironmentName}-ALB-SG
      GroupDescription: Security group for Application Load Balancer
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-ALB-SG

  ECSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${EnvironmentName}-ECS-SG
      GroupDescription: Security group for ECS tasks
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8000
          ToPort: 8000
          SourceSecurityGroupId: !Ref ALBSecurityGroup
        - IpProtocol: tcp
          FromPort: 3000
          ToPort: 3000
          SourceSecurityGroupId: !Ref ALBSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-ECS-SG

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${EnvironmentName}-DB-SG
      GroupDescription: Security group for RDS database
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref ECSSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-DB-SG

  # RDS Database
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-DB-SubnetGroup

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub ${EnvironmentName}-database
      DBName: sreagent
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: '14.9'
      MasterUsername: sreagent
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20
      MaxAllocatedStorage: 100
      StorageType: gp2
      StorageEncrypted: true
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup
      BackupRetentionPeriod: 7
      MultiAZ: false
      PubliclyAccessible: false
      DeletionProtection: false
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-Database

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub ${EnvironmentName}-cluster
      ClusterSettings:
        - Name: containerInsights
          Value: enabled

  # Application Load Balancer
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub ${EnvironmentName}-ALB
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-ALB

  # S3 Bucket for model artifacts
  ModelArtifactsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${EnvironmentName}-model-artifacts-${AWS::AccountId}
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName}-ModelArtifacts

Outputs:
  VPC:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub ${EnvironmentName}-VPC-ID

  DatabaseEndpoint:
    Description: RDS Database Endpoint
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub ${EnvironmentName}-DB-Endpoint

  LoadBalancerDNS:
    Description: Application Load Balancer DNS Name
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub ${EnvironmentName}-ALB-DNS

  ECSCluster:
    Description: ECS Cluster Name
    Value: !Ref ECSCluster
    Export:
      Name: !Sub ${EnvironmentName}-ECS-Cluster

  ModelBucket:
    Description: S3 Bucket for Model Artifacts
    Value: !Ref ModelArtifactsBucket
    Export:
      Name: !Sub ${EnvironmentName}-Model-Bucket
```

Deploy the stack:
```bash
aws cloudformation create-stack \
  --stack-name sre-agent-infrastructure \
  --template-body file://sre-agent-stack.yaml \
  --parameters ParameterKey=DBPassword,ParameterValue=YourSecurePassword123! \
  --capabilities CAPABILITY_IAM
```

### 4. ECS Task Definitions

Create `task-definition.json`:

```json
{
  "family": "sre-agent-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "sre-agent-api",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/sre-agent-api:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://sreagent:password@your-db-endpoint:5432/sreagent"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        },
        {
          "name": "LOG_LEVEL",
          "value": "INFO"
        }
      ],
      "secrets": [
        {
          "name": "HUGGINGFACE_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT:secret:sre-agent/huggingface-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sre-agent-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8000/api/v1/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Register the task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 5. Environment Configuration

Create AWS-specific environment file `.env.aws`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# Database (from CloudFormation output)
DATABASE_URL=postgresql://sreagent:YourSecurePassword123!@your-db-endpoint.region.rds.amazonaws.com:5432/sreagent

# CloudWatch Configuration
CLOUDWATCH_NAMESPACE=SREAgent
CLOUDWATCH_REGION=us-east-1

# S3 Configuration (for model artifacts)
MODEL_ARTIFACTS_BUCKET=sre-agent-model-artifacts-123456789012

# Application Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
LOG_LEVEL=INFO
WORKERS=4

# ML Model Configuration
HUGGINGFACE_API_KEY=your_huggingface_token
MODEL_CACHE_DIR=/tmp/models
ENABLE_GPU=false

# Monitoring Configuration
PROMETHEUS_URL=http://prometheus.monitoring.local:9090
GRAFANA_URL=http://grafana.monitoring.local:3000

# Alerting Configuration
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:sre-agent-alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Security Configuration
ALLOWED_HOSTS=your-alb-dns-name.us-east-1.elb.amazonaws.com,localhost
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:3000

# Feature Flags
ENABLE_ANOMALY_DETECTION=true
ENABLE_CONFIG_ANALYSIS=true
ENABLE_INCIDENT_AUTOMATION=true
```

### 6. AWS-Specific Code Modifications

#### CloudWatch Metrics Integration

Create `python-backend/src/integrations/aws_cloudwatch.py`:

```python
import boto3
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger()

class CloudWatchMetricsCollector:
    def __init__(self, region_name: str = 'us-east-1'):
        self.cloudwatch = boto3.client('cloudwatch', region_name=region_name)
        self.ec2 = boto3.client('ec2', region_name=region_name)
        self.rds = boto3.client('rds', region_name=region_name)
        self.elb = boto3.client('elbv2', region_name=region_name)
    
    async def collect_all_metrics(self) -> Dict[str, Any]:
        """Collect metrics from all AWS services"""
        try:
            tasks = [
                self.collect_ec2_metrics(),
                self.collect_rds_metrics(),
                self.collect_elb_metrics(),
                self.collect_custom_metrics()
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_metrics = {}
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to collect metrics from task {i}", error=str(result))
                else:
                    all_metrics.update(result)
            
            return all_metrics
            
        except Exception as e:
            logger.error("Failed to collect CloudWatch metrics", error=str(e))
            return {}
    
    async def collect_ec2_metrics(self) -> Dict[str, Any]:
        """Collect EC2 instance metrics"""
        try:
            # Get all running instances
            response = self.ec2.describe_instances(
                Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
            )
            
            instance_ids = []
            for reservation in response['Reservations']:
                for instance in reservation['Instances']:
                    instance_ids.append(instance['InstanceId'])
            
            if not instance_ids:
                return {}
            
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)
            
            metrics = {}
            
            for instance_id in instance_ids:
                instance_metrics = await self._get_instance_metrics(
                    instance_id, start_time, end_time
                )
                metrics[f"ec2_{instance_id}"] = instance_metrics
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect EC2 metrics", error=str(e))
            return {}
    
    async def _get_instance_metrics(self, instance_id: str, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get metrics for a specific EC2 instance"""
        metrics = {
            'values': [],
            'timestamps': [],
            'metadata': {'instance_id': instance_id, 'service': 'ec2'}
        }
        
        metric_names = ['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadOps', 'DiskWriteOps']
        
        for metric_name in metric_names:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/EC2',
                    MetricName=metric_name,
                    Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,  # 5 minutes
                    Statistics=['Average']
                )
                
                for datapoint in sorted(response['Datapoints'], key=lambda x: x['Timestamp']):
                    metrics['values'].append(datapoint['Average'])
                    metrics['timestamps'].append(datapoint['Timestamp'])
                
            except Exception as e:
                logger.error(f"Failed to get {metric_name} for {instance_id}", error=str(e))
        
        return metrics
    
    async def collect_rds_metrics(self) -> Dict[str, Any]:
        """Collect RDS database metrics"""
        try:
            response = self.rds.describe_db_instances()
            
            metrics = {}
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)
            
            for db_instance in response['DBInstances']:
                if db_instance['DBInstanceStatus'] == 'available':
                    db_id = db_instance['DBInstanceIdentifier']
                    db_metrics = await self._get_rds_metrics(db_id, start_time, end_time)
                    metrics[f"rds_{db_id}"] = db_metrics
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect RDS metrics", error=str(e))
            return {}
    
    async def _get_rds_metrics(self, db_id: str, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get metrics for a specific RDS instance"""
        metrics = {
            'values': [],
            'timestamps': [],
            'metadata': {'db_instance_id': db_id, 'service': 'rds'}
        }
        
        metric_names = ['CPUUtilization', 'DatabaseConnections', 'FreeableMemory', 'ReadLatency', 'WriteLatency']
        
        for metric_name in metric_names:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/RDS',
                    MetricName=metric_name,
                    Dimensions=[{'Name': 'DBInstanceIdentifier', 'Value': db_id}],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Average']
                )
                
                for datapoint in sorted(response['Datapoints'], key=lambda x: x['Timestamp']):
                    metrics['values'].append(datapoint['Average'])
                    metrics['timestamps'].append(datapoint['Timestamp'])
                
            except Exception as e:
                logger.error(f"Failed to get {metric_name} for {db_id}", error=str(e))
        
        return metrics
    
    async def collect_elb_metrics(self) -> Dict[str, Any]:
        """Collect ELB metrics"""
        try:
            response = self.elb.describe_load_balancers()
            
            metrics = {}
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)
            
            for lb in response['LoadBalancers']:
                lb_arn = lb['LoadBalancerArn']
                lb_name = lb['LoadBalancerName']
                lb_metrics = await self._get_elb_metrics(lb_arn, lb_name, start_time, end_time)
                metrics[f"elb_{lb_name}"] = lb_metrics
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect ELB metrics", error=str(e))
            return {}
    
    async def _get_elb_metrics(self, lb_arn: str, lb_name: str, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get metrics for a specific ELB"""
        metrics = {
            'values': [],
            'timestamps': [],
            'metadata': {'load_balancer_name': lb_name, 'service': 'elb'}
        }
        
        metric_names = ['RequestCount', 'TargetResponseTime', 'HTTPCode_Target_2XX_Count', 'HTTPCode_Target_4XX_Count', 'HTTPCode_Target_5XX_Count']
        
        for metric_name in metric_names:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/ApplicationELB',
                    MetricName=metric_name,
                    Dimensions=[{'Name': 'LoadBalancer', 'Value': lb_arn.split('/')[-3] + '/' + lb_arn.split('/')[-2] + '/' + lb_arn.split('/')[-1]}],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum'] if 'Count' in metric_name else ['Average']
                )
                
                for datapoint in sorted(response['Datapoints'], key=lambda x: x['Timestamp']):
                    value = datapoint.get('Sum', datapoint.get('Average', 0))
                    metrics['values'].append(value)
                    metrics['timestamps'].append(datapoint['Timestamp'])
                
            except Exception as e:
                logger.error(f"Failed to get {metric_name} for {lb_name}", error=str(e))
        
        return metrics
    
    async def collect_custom_metrics(self) -> Dict[str, Any]:
        """Collect custom application metrics"""
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)
            
            response = self.cloudwatch.get_metric_statistics(
                Namespace='SREAgent',
                MetricName='AnomaliesDetected',
                StartTime=start_time,
                EndTime=end_time,
                Period=300,
                Statistics=['Sum']
            )
            
            metrics = {
                'custom_anomalies': {
                    'values': [],
                    'timestamps': [],
                    'metadata': {'service': 'sre-agent', 'metric_type': 'custom'}
                }
            }
            
            for datapoint in sorted(response['Datapoints'], key=lambda x: x['Timestamp']):
                metrics['custom_anomalies']['values'].append(datapoint['Sum'])
                metrics['custom_anomalies']['timestamps'].append(datapoint['Timestamp'])
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect custom metrics", error=str(e))
            return {}
    
    async def publish_custom_metric(self, metric_name: str, value: float, unit: str = 'Count', dimensions: List[Dict] = None):
        """Publish custom metric to CloudWatch"""
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': datetime.utcnow()
            }
            
            if dimensions:
                metric_data['Dimensions'] = dimensions
            
            self.cloudwatch.put_metric_data(
                Namespace='SREAgent',
                MetricData=[metric_data]
            )
            
            logger.info(f"Published metric {metric_name} with value {value}")
            
        except Exception as e:
            logger.error(f"Failed to publish metric {metric_name}", error=str(e))
```

#### SNS Alerting Integration

Create `python-backend/src/integrations/aws_sns.py`:

```python
import boto3
import json
from typing import Dict, Any
import structlog

logger = structlog.get_logger()

class SNSAlerter:
    def __init__(self, region_name: str = 'us-east-1'):
        self.sns = boto3.client('sns', region_name=region_name)
        self.topic_arn = None
    
    def set_topic_arn(self, topic_arn: str):
        """Set the SNS topic ARN for alerts"""
        self.topic_arn = topic_arn
    
    async def send_anomaly_alert(self, anomaly: Dict[str, Any]):
        """Send anomaly alert via SNS"""
        if not self.topic_arn:
            logger.error("SNS topic ARN not configured")
            return False
        
        try:
            message = {
                "alert_type": "anomaly",
                "severity": anomaly.get('severity', 'unknown'),
                "metric_name": anomaly.get('metric_name', 'unknown'),
                "value": anomaly.get('value', 0),
                "confidence": anomaly.get('confidence', 0),
                "description": anomaly.get('description', ''),
                "timestamp": anomaly.get('timestamp', ''),
                "recommendations": anomaly.get('recommendations', [])
            }
            
            subject = f"🚨 SRE Alert: {anomaly.get('severity', 'Unknown').upper()} - {anomaly.get('metric_name', 'Unknown Metric')}"
            
            response = self.sns.publish(
                TopicArn=self.topic_arn,
                Message=json.dumps(message, indent=2),
                Subject=subject,
                MessageAttributes={
                    'severity': {
                        'DataType': 'String',
                        'StringValue': anomaly.get('severity', 'unknown')
                    },
                    'metric_name': {
                        'DataType': 'String',
                        'StringValue': anomaly.get('metric_name', 'unknown')
                    }
                }
            )
            
            logger.info("SNS alert sent successfully", message_id=response['MessageId'])
            return True
            
        except Exception as e:
            logger.error("Failed to send SNS alert", error=str(e))
            return False
    
    async def send_incident_alert(self, incident: Dict[str, Any]):
        """Send incident alert via SNS"""
        if not self.topic_arn:
            logger.error("SNS topic ARN not configured")
            return False
        
        try:
            message = {
                "alert_type": "incident",
                "incident_id": incident.get('id', 'unknown'),
                "title": incident.get('title', 'Unknown Incident'),
                "severity": incident.get('severity', 'unknown'),
                "status": incident.get('status', 'unknown'),
                "description": incident.get('description', ''),
                "affected_services": incident.get('affected_services', []),
                "created_at": incident.get('created_at', ''),
                "assignee": incident.get('assignee', 'unassigned')
            }
            
            subject = f"🔥 Incident Alert: {incident.get('severity', 'Unknown').upper()} - {incident.get('title', 'Unknown Incident')}"
            
            response = self.sns.publish(
                TopicArn=self.topic_arn,
                Message=json.dumps(message, indent=2),
                Subject=subject,
                MessageAttributes={
                    'alert_type': {
                        'DataType': 'String',
                        'StringValue': 'incident'
                    },
                    'severity': {
                        'DataType': 'String',
                        'StringValue': incident.get('severity', 'unknown')
                    }
                }
            )
            
            logger.info("Incident SNS alert sent successfully", message_id=response['MessageId'])
            return True
            
        except Exception as e:
            logger.error("Failed to send incident SNS alert", error=str(e))
            return False
```

### 7. Deployment Scripts

Create `deploy-to-aws.sh`:

```bash
#!/bin/bash

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REPOSITORY_API="sre-agent-api"
ECR_REPOSITORY_FRONTEND="sre-agent-frontend"
ECS_CLUSTER="sre-agent-cluster"
ECS_SERVICE_API="sre-agent-api-service"
ECS_SERVICE_FRONTEND="sre-agent-frontend-service"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Starting deployment to AWS..."
echo "Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"

# Create ECR repositories if they don't exist
echo "📦 Setting up ECR repositories..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY_API --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name $ECR_REPOSITORY_API --region $AWS_REGION

aws ecr describe-repositories --repository-names $ECR_REPOSITORY_FRONTEND --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name $ECR_REPOSITORY_FRONTEND --region $AWS_REGION

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push API image
echo "🏗️ Building and pushing API image..."
cd python-backend
docker build -t $ECR_REPOSITORY_API .
docker tag $ECR_REPOSITORY_API:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_API:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_API:latest
cd ..

# Build and push frontend image
echo "🏗️ Building and pushing frontend image..."
docker build -t $ECR_REPOSITORY_FRONTEND .
docker tag $ECR_REPOSITORY_FRONTEND:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_FRONTEND:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_FRONTEND:latest

# Update ECS services
echo "🔄 Updating ECS services..."

# Update API service
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE_API \
    --force-new-deployment \
    --region $AWS_REGION

# Update frontend service
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE_FRONTEND \
    --force-new-deployment \
    --region $AWS_REGION

echo "✅ Deployment completed successfully!"
echo "🌐 Your application will be available at the ALB DNS name once the deployment is complete."

# Wait for services to stabilize
echo "⏳ Waiting for services to stabilize..."
aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE_API --region $AWS_REGION
aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE_FRONTEND --region $AWS_REGION

echo "🎉 All services are now stable and running!"
```

Make the script executable:
```bash
chmod +x deploy-to-aws.sh
```

### 8. Testing Your AWS Deployment

Create `test-aws-deployment.sh`:

```bash
#!/bin/bash

# Get ALB DNS name from CloudFormation
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name sre-agent-infrastructure \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text)

echo "Testing deployment at: http://$ALB_DNS"

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f "http://$ALB_DNS:8000/api/v1/health" || echo "❌ Health check failed"

# Test metrics endpoint
echo "📊 Testing metrics endpoint..."
curl -f "http://$ALB_DNS:8000/metrics" || echo "❌ Metrics endpoint failed"

# Test anomaly detection
echo "🧠 Testing anomaly detection..."
curl -X POST "http://$ALB_DNS:8000/api/v1/anomalies/predict" \
    -H "Content-Type: application/json" \
    -d '{
        "metric_name": "cpu_usage",
        "values": [45, 52, 48, 55, 95, 32],
        "timestamps": ["2024-01-15T14:00:00Z", "2024-01-15T14:10:00Z", "2024-01-15T14:20:00Z", "2024-01-15T14:30:00Z", "2024-01-15T14:40:00Z", "2024-01-15T14:50:00Z"]
    }' || echo "❌ Anomaly detection test failed"

echo "✅ Testing completed!"
```

### 9. Monitoring Setup

Create CloudWatch dashboard:

```bash
aws cloudwatch put-dashboard \
    --dashboard-name "SRE-Agent-Dashboard" \
    --dashboard-body '{
        "widgets": [
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["SREAgent", "AnomaliesDetected"],
                        ["AWS/ECS", "CPUUtilization", "ServiceName", "sre-agent-api-service"],
                        ["AWS/ECS", "MemoryUtilization", "ServiceName", "sre-agent-api-service"]
                    ],
                    "period": 300,
                    "stat": "Average",
                    "region": "us-east-1",
                    "title": "SRE Agent Metrics"
                }
            }
        ]
    }'
```

This comprehensive AWS setup guide provides everything needed to deploy and run the SRE Agent in an AWS environment, including infrastructure setup, monitoring integration, and deployment automation.