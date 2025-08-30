# GitHub Actions Setup Guide for SRE Agent Infrastructure

This guide explains how to set up GitHub Actions for automated infrastructure deployment of the SRE Agent platform.

## Overview

The GitHub Actions workflows provide:
- **Automated Infrastructure Deployment**: Deploy to AWS/Azure on code changes
- **Multi-Environment Support**: Separate staging and production deployments
- **Infrastructure as Code**: CDK, Terraform, and ARM template support
- **Database Management**: Automated schema deployment and rollbacks
- **Notifications**: Slack and Teams integration for deployment status
- **Security**: Environment protection and approval workflows

## Workflow Files

### 1. AWS CDK Deployment (`deploy-aws-cdk.yml`)
- **Triggers**: Push to main/develop, PRs, manual dispatch
- **Features**: 
  - CDK validation and synthesis
  - Multi-environment deployment (staging/production)
  - Automatic CDK bootstrapping
  - Slack notifications
  - Deployment outputs as artifacts

### 2. AWS Terraform Deployment (`deploy-aws-terraform.yml`)
- **Triggers**: Push to main/develop, PRs, manual dispatch
- **Features**:
  - Terraform validation and formatting
  - Plan generation with PR comments
  - Multi-environment deployment
  - Infrastructure destruction capability
  - Deployment outputs as artifacts

### 3. Azure Deployment (`deploy-azure.yml`) - DISABLED
- **Status**: Currently disabled for initial deployment
- **Triggers**: None (workflow file renamed to .disabled)
- **Features**:
  - ARM template validation
  - Multi-environment deployment
  - Container image building and pushing
  - Teams notifications
  - Resource group management

### 4. Database Deployment (`deploy-database.yml`)
- **Triggers**: Push to main/develop, PRs, manual dispatch
- **Features**:
  - Schema validation
  - Multi-environment deployment
  - Automatic backups before production changes
  - Rollback capability
  - Database verification tests

## Prerequisites

### 1. GitHub Repository Setup
- Repository with main and develop branches
- Branch protection rules enabled
- Required status checks configured

### 2. Cloud Provider Access
- **AWS**: Access keys with appropriate permissions
- **Azure**: Service principal with contributor access
- **Database**: Connection strings for staging and production

### 3. Notification Channels
- **Slack**: Webhook URL for notifications
- **Teams**: Webhook URL for Azure deployments

## Setup Instructions

### Step 1: Configure GitHub Secrets

Navigate to your repository → Settings → Secrets and variables → Actions, then add:

#### AWS Secrets
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_ACCOUNT_ID=your_aws_account_id
DB_PASSWORD=your_database_password
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

#### Azure Secrets
```
AZURE_CREDENTIALS={"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}
AZURE_CONTAINER_REGISTRY=your_registry_name
TEAMS_WEBHOOK_URL=your_teams_webhook_url
```

#### Database Secrets
```
STAGING_DATABASE_URL=postgresql://user:pass@host:5432/dbname
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Step 2: Configure Environments

#### Create Staging Environment
1. Go to Settings → Environments
2. Click "New environment"
3. Name: `staging`
4. Add protection rules:
   - Required reviewers: Add team members
   - Wait timer: 0 minutes
   - Deployment branches: `develop`

#### Create Production Environment
1. Go to Settings → Environments
2. Click "New environment"
3. Name: `production`
4. Add protection rules:
   - Required reviewers: Add senior team members
   - Wait timer: 5 minutes (recommended)
   - Deployment branches: `main`

### Step 3: Branch Protection Rules

#### Main Branch
- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators

#### Develop Branch
- Require pull request reviews before merging
- Require status checks to pass before merging
- Include administrators

## Usage Examples

### Automatic Deployment

#### Push to Develop Branch
```bash
git checkout develop
git add .
git commit -m "Update infrastructure configuration"
git push origin develop
```
This triggers:
- AWS CDK validation
- AWS Terraform validation
- Azure ARM template validation
- Database schema validation
- Staging environment deployment

#### Push to Main Branch
```bash
git checkout main
git merge develop
git push origin main
```
This triggers:
- All validation steps
- Production environment deployment
- Database production deployment

### Manual Deployment

#### Deploy Specific Environment
1. Go to Actions tab
2. Select workflow (e.g., "Deploy AWS Infrastructure (CDK)")
3. Click "Run workflow"
4. Choose:
   - Branch: main or develop
   - Environment: staging or production
   - Force deploy: true/false

#### Terraform Actions
1. Go to Actions tab
2. Select "Deploy AWS Infrastructure (Terraform)"
3. Click "Run workflow"
4. Choose:
   - Environment: staging or production
   - Action: plan, apply, or destroy

## Workflow Customization

### Environment-Specific Configuration

#### AWS CDK Context
```python
# In app.py
app = cdk.App()
SREAgentStack(app, "SREAgentStack",
    env=cdk.Environment(
        account=os.getenv('CDK_DEFAULT_ACCOUNT'),
        region=os.getenv('CDK_DEFAULT_REGION')
    ),
    context={
        'environment': os.getenv('ENVIRONMENT', 'staging')
    }
)
```

#### Terraform Variables
```hcl
# In terraform/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be t3.micro, t3.small, or t3.medium."
  }
}
```

### Custom Notifications

#### Slack Message Format
```yaml
- name: Custom Slack Notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#sre-alerts'
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    text: |
      🚀 SRE Agent Infrastructure Deployment
      Environment: ${{ github.ref_name }}
      Status: ${{ job.status }}
      Triggered by: @${{ github.actor }}
```

#### Teams Message Format
```yaml
- name: Custom Teams Notification
  uses: skitionek/notify-teams@v1
  with:
    webhook_url: ${{ secrets.TEAMS_WEBHOOK_URL }}
    message: |
      ## 🚀 SRE Agent Infrastructure Deployment
      **Environment**: ${{ github.ref_name }}
      **Status**: ${{ job.status }}
      **Triggered by**: @${{ github.actor }}
      **Commit**: ${{ github.sha }}
```

## Monitoring and Troubleshooting

### Workflow Status
- **Green**: All jobs completed successfully
- **Yellow**: Some jobs completed with warnings
- **Red**: One or more jobs failed
- **Gray**: Workflow was cancelled or skipped

### Common Issues

#### AWS CDK Bootstrap
```bash
# If CDK bootstrap fails
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

#### Terraform State Issues
```bash
# If Terraform state is locked
terraform force-unlock LOCK_ID
```

#### Database Connection Issues
- Verify connection strings in secrets
- Check network access and security groups
- Validate database credentials

### Debug Information

#### Enable Debug Logging
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

#### View Workflow Logs
1. Go to Actions tab
2. Click on failed workflow run
3. Click on failed job
4. Click on failed step
5. View detailed logs

## Security Best Practices

### 1. Secret Management
- Never commit secrets to code
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use least privilege access

### 2. Environment Protection
- Require reviews for production
- Use wait timers for critical deployments
- Restrict deployment branches
- Monitor deployment access

### 3. Infrastructure Security
- Use IAM roles with minimal permissions
- Enable CloudTrail (AWS) and Activity Log (Azure)
- Encrypt data at rest and in transit
- Regular security audits

## Cost Optimization

### 1. Workflow Optimization
- Use path filters to avoid unnecessary runs
- Cache dependencies between runs
- Use matrix builds for parallel execution
- Clean up artifacts regularly

### 2. Infrastructure Optimization
- Use spot instances for non-critical workloads
- Implement auto-scaling policies
- Monitor and optimize resource usage
- Use appropriate instance types

## Next Steps

After setting up GitHub Actions:

1. **Test Workflows**: Run manual deployments to verify setup
2. **Configure Alerts**: Set up monitoring for deployment failures
3. **Document Procedures**: Create runbooks for common scenarios
4. **Team Training**: Train team members on workflow usage
5. **Continuous Improvement**: Monitor and optimize workflows

## Support

For issues with GitHub Actions:
1. Check workflow logs for error details
2. Verify secrets and environment configuration
3. Test workflows manually
4. Consult GitHub Actions documentation
5. Review cloud provider logs for infrastructure issues
