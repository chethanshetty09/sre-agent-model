#!/bin/bash

# SRE Agent Infrastructure Deployment Script
# This script provides easy commands for deploying infrastructure to AWS or Azure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if command -v aws &> /dev/null; then
        print_success "AWS CLI found"
    else
        print_warning "AWS CLI not found. Please install it first."
    fi
    
    # Check if Azure CLI is installed
    if command -v az &> /dev/null; then
        print_success "Azure CLI found"
    else
        print_warning "Azure CLI not found. Please install it first."
    fi
    
    # Check if Docker is installed
    if command -v docker &> /dev/null; then
        print_success "Docker found"
    else
        print_warning "Docker not found. Please install it first."
    fi
    
    # Check if Python is installed
    if command -v python3 &> /dev/null; then
        print_success "Python 3 found"
    else
        print_warning "Python 3 not found. Please install it first."
    fi
    
    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        print_success "Node.js found"
    else
        print_warning "Node.js not found. Please install it first."
    fi
}

# Function to deploy AWS infrastructure using CDK
deploy_aws_cdk() {
    print_status "Deploying AWS infrastructure using CDK..."
    
    cd sre-agent-aws
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        print_error "CDK CLI not found. Installing..."
        npm install -g aws-cdk
    fi
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install aws-cdk-lib constructs
    
    # Check if environment file exists
    if [ ! -f "env.aws" ]; then
        print_error "env.aws file not found. Please create it first."
        exit 1
    fi
    
    # Deploy infrastructure
    print_status "Deploying infrastructure..."
    cdk deploy
    
    print_success "AWS infrastructure deployed successfully!"
    cd ..
}

# Function to deploy AWS infrastructure using Terraform
deploy_aws_terraform() {
    print_status "Deploying AWS infrastructure using Terraform..."
    
    cd sre-agent-aws/terraform
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform not found. Please install it first."
        exit 1
    fi
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Check if variables file exists
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Creating template..."
        cat > terraform.tfvars << EOF
# AWS Configuration
aws_region = "us-east-1"

# Database Configuration
db_password = "your-secure-password-here"
EOF
        print_error "Please edit terraform.tfvars with your configuration before continuing."
        exit 1
    fi
    
    # Plan deployment
    print_status "Planning Terraform deployment..."
    terraform plan
    
    # Confirm deployment
    read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deploying infrastructure..."
        terraform apply -auto-approve
        print_success "AWS infrastructure deployed successfully!"
    else
        print_warning "Deployment cancelled."
    fi
    
    cd ../..
}

# Function to deploy Azure infrastructure
deploy_azure() {
    print_status "Deploying Azure infrastructure..."
    
    cd sre-agent-azure
    
    # Check if environment file exists
    if [ ! -f "env.azure" ]; then
        print_error "env.azure file not found. Please create it first."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Get subscription ID
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    print_status "Using subscription: $SUBSCRIPTION_ID"
    
    # Create resource group
    print_status "Creating resource group..."
    az group create --name sre-agent-rg --location eastus
    
    # Deploy ARM template
    print_status "Deploying ARM template..."
    az deployment group create \
        --resource-group sre-agent-rg \
        --template-file azuredeploy.json \
        --parameters appName=sre-agent
    
    print_success "Azure infrastructure deployed successfully!"
    cd ..
}

# Function to deploy database schema
deploy_database() {
    print_status "Deploying database schema..."
    
    # Check if database connection details are provided
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable not set."
        print_status "Please set it to your database connection string:"
        print_status "export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
        exit 1
    fi
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        print_error "psql not found. Please install PostgreSQL client."
        exit 1
    fi
    
    # Deploy schema
    print_status "Applying database schema..."
    psql "$DATABASE_URL" -f database-schema.sql
    
    print_success "Database schema deployed successfully!"
}

# Function to build and deploy containers
deploy_containers() {
    print_status "Building and deploying containers..."
    
    # Build API image
    print_status "Building API image..."
    docker build -t sre-agent-api python-backend/
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -t sre-agent-frontend .
    
    print_success "Container images built successfully!"
    
    # Check if Docker Compose file exists
    if [ -f "sre-agent-aws/docker-compose.aws.yml" ]; then
        print_status "Starting services with Docker Compose..."
        cd sre-agent-aws
        docker-compose -f docker-compose.aws.yml up -d
        cd ..
        print_success "Services started successfully!"
    else
        print_warning "Docker Compose file not found. Please start services manually."
    fi
}

# Function to show help
show_help() {
    echo "SRE Agent Infrastructure Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  check-prereqs    Check if all prerequisites are installed"
    echo "  deploy-aws-cdk   Deploy AWS infrastructure using CDK"
    echo "  deploy-aws-tf    Deploy AWS infrastructure using Terraform"
    echo "  deploy-azure     Deploy Azure infrastructure"
    echo "  deploy-db        Deploy database schema"
    echo "  deploy-containers Build and deploy containers"
    echo "  deploy-all       Deploy everything (AWS CDK + DB + Containers)"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 check-prereqs"
    echo "  $0 deploy-aws-cdk"
    echo "  $0 deploy-azure"
    echo "  $0 deploy-all"
}

# Main script logic
case "${1:-help}" in
    "check-prereqs")
        check_prerequisites
        ;;
    "deploy-aws-cdk")
        deploy_aws_cdk
        ;;
    "deploy-aws-tf")
        deploy_aws_terraform
        ;;
    "deploy-azure")
        deploy_azure
        ;;
    "deploy-db")
        deploy_database
        ;;
    "deploy-containers")
        deploy_containers
        ;;
    "deploy-all")
        print_status "Deploying complete infrastructure..."
        deploy_aws_cdk
        deploy_database
        deploy_containers
        print_success "Complete infrastructure deployed successfully!"
        ;;
    "help"|*)
        show_help
        ;;
esac
