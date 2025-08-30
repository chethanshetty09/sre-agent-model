# SRE Agent Infrastructure Deployment Guide

This directory contains the complete infrastructure deployment setup for the SRE Agent platform, supporting both AWS and Azure cloud providers.

## Directory Structure

```
sre-agent-model/
├── sre-agent-aws/           # AWS Infrastructure
│   ├── app.py               # CDK main application
│   ├── sre_agent_stack.py   # CDK infrastructure stack
│   ├── env.aws              # AWS environment variables
│   ├── docker-compose.aws.yml # Docker Compose for AWS
│   └── terraform/           # Terraform alternative
│       └── main.tf          # Terraform configuration
├── sre-agent-azure/         # Azure Infrastructure
│   ├── azuredeploy.json     # ARM template
│   ├── env.azure            # Azure environment variables
│   └── azure-container-deployment.yml # Container deployment
├── database-schema.sql      # PostgreSQL database schema
└── INFRASTRUCTURE_README.md # This file
```

## Prerequisites

### AWS Setup
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed: `npm install -g aws-cdk`
- Python 3.9+ with pip
- Docker (for building containers)

### Azure Setup
- Azure CLI installed and configured
- Azure subscription with contributor access
- Docker (for building containers)

### General Requirements
- Git
- Node.js 18+
- Python 3.9+

## AWS Deployment

### Option 1: Using AWS CDK (Recommended)

1. **Navigate to AWS directory:**
   ```bash
   cd sre-agent-aws
   ```

2. **Install dependencies:**
   ```bash
   pip install aws-cdk-lib constructs
   ```

3. **Configure environment:**
   - Edit `env.aws` with your AWS credentials and configuration
   - Update `app.py` with your AWS account ID

4. **Deploy infrastructure:**
   ```bash
   cdk deploy
   ```

### Option 2: Using Terraform

1. **Navigate to Terraform directory:**
   ```bash
   cd sre-agent-aws/terraform
   ```

2. **Initialize Terraform:**
   ```bash
   terraform init
   ```

3. **Configure variables:**
   - Create `terraform.tfvars` with your configuration
   - Set `db_password` variable

4. **Deploy infrastructure:**
   ```bash
   terraform plan
   terraform apply
   ```

## Azure Deployment

### Using ARM Templates

1. **Navigate to Azure directory:**
   ```bash
   cd sre-agent-azure
   ```

2. **Configure environment:**
   - Edit `env.azure` with your Azure configuration
   - Update subscription ID and resource group

3. **Deploy using Azure CLI:**
   ```bash
   az group create --name sre-agent-rg --location eastus
   az deployment group create \
     --resource-group sre-agent-rg \
     --template-file azuredeploy.json \
     --parameters appName=sre-agent
   ```

### Using Azure Container Instances

1. **Build and push Docker images:**
   ```bash
   # Build API image
   docker build -t sre-agent-api ../python-backend
   docker tag sre-agent-api your-registry.azurecr.io/sre-agent-api:latest
   docker push your-registry.azurecr.io/sre-agent-api:latest
   
   # Build frontend image
   docker build -t sre-agent-frontend ..
   docker tag sre-agent-frontend your-registry.azurecr.io/sre-agent-frontend:latest
   docker push your-registry.azurecr.io/sre-agent-frontend:latest
   ```

2. **Deploy containers:**
   ```bash
   az container create --resource-group sre-agent-rg --file azure-container-deployment.yml
   ```

## Database Setup

1. **Create database:**
   ```sql
   CREATE DATABASE sreagent;
   ```

2. **Apply schema:**
   ```bash
   psql -h your-db-host -U sreagent -d sreagent -f database-schema.sql
   ```

3. **Verify setup:**
   ```sql
   \dt  -- List tables
   \dv  -- List views
   ```

## Environment Configuration

### AWS Environment Variables
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `DATABASE_URL`: PostgreSQL connection string
- `HUGGINGFACE_API_KEY`: Hugging Face API token
- `SNS_TOPIC_ARN`: SNS topic for alerts

### Azure Environment Variables
- `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID
- `AZURE_RESOURCE_GROUP`: Resource group name
- `AZURE_LOCATION`: Azure region (default: eastus)
- `DATABASE_URL`: Azure SQL connection string
- `HUGGINGFACE_API_KEY`: Hugging Face API token

## Infrastructure Components

### AWS Components
- **VPC**: Multi-AZ setup with public/private/database subnets
- **ECS Cluster**: Fargate-based container orchestration
- **RDS**: PostgreSQL database with encryption
- **ALB**: Application Load Balancer for traffic distribution
- **S3**: ML model storage bucket
- **SNS**: Alert notifications
- **SQS**: Message processing queue
- **CloudWatch**: Monitoring and dashboards

### Azure Components
- **App Service Plan**: Hosting for web applications
- **Web Apps**: Frontend and API hosting
- **SQL Database**: Azure SQL database
- **Storage Account**: ML model storage
- **Container Registry**: Docker image storage
- **Key Vault**: Secret management
- **Application Insights**: Application monitoring

## Monitoring and Alerting

### CloudWatch (AWS)
- API request metrics
- Database connection monitoring
- Custom application metrics
- Automated dashboards

### Application Insights (Azure)
- Application performance monitoring
- Dependency tracking
- Custom telemetry
- Alert rules

## Security Features

- **Network Security**: Private subnets for sensitive resources
- **Encryption**: Data encryption at rest and in transit
- **IAM Roles**: Least privilege access for services
- **Security Groups**: Network-level access control
- **Secrets Management**: Secure credential storage

## Scaling and Performance

- **Auto-scaling**: ECS service auto-scaling (AWS)
- **Load Balancing**: Multi-AZ load distribution
- **Database Scaling**: RDS read replicas support
- **Caching**: Redis for performance optimization

## Cost Optimization

- **Reserved Instances**: For predictable workloads
- **Spot Instances**: For non-critical workloads
- **Storage Tiers**: Appropriate storage classes
- **Resource Tagging**: Cost allocation tracking

## Troubleshooting

### Common Issues

1. **CDK Deployment Failures**
   ```bash
   cdk diff          # Check differences
   cdk destroy       # Clean up resources
   cdk deploy        # Redeploy
   ```

2. **Terraform Errors**
   ```bash
   terraform plan    # Validate configuration
   terraform refresh # Refresh state
   terraform apply   # Apply changes
   ```

3. **Database Connection Issues**
   - Verify security group rules
   - Check connection strings
   - Validate credentials

4. **Container Deployment Issues**
   - Check Docker image builds
   - Verify registry access
   - Review container logs

### Debug Commands

```bash
# AWS
aws ecs describe-services --cluster sre-agent-cluster --services sre-agent-api
aws logs describe-log-groups --log-group-name-prefix sre-agent

# Azure
az container logs --resource-group sre-agent-rg --name sre-agent-container-group
az monitor metrics list --resource your-resource-id --metric CPUPercentage
```

## Maintenance

### Regular Tasks
- **Security Updates**: Apply security patches
- **Backup Verification**: Test database backups
- **Performance Monitoring**: Review metrics and optimize
- **Cost Review**: Analyze and optimize costs

### Updates
- **Infrastructure**: Use CDK diff/apply or Terraform plan/apply
- **Applications**: Update Docker images and redeploy
- **Database**: Apply schema migrations carefully

## Support

For infrastructure-related issues:
1. Check cloud provider documentation
2. Review deployment logs
3. Verify configuration files
4. Test in staging environment first

## Next Steps

After successful infrastructure deployment:
1. Deploy application code
2. Configure monitoring dashboards
3. Set up alert rules
4. Test end-to-end functionality
5. Document operational procedures

## Security Notes

- Never commit sensitive credentials to version control
- Use IAM roles and service principals
- Enable CloudTrail (AWS) or Activity Log (Azure)
- Regular security audits and penetration testing
- Implement least privilege access principles
