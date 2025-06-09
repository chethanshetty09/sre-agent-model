# Azure-Specific Setup Guide for SRE Agent

## Quick Start for Azure Environment

### 1. Prerequisites Setup

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your subscription
az account set --subscription "Your Subscription Name"

# Install additional tools
az extension add --name containerapp
az extension add --name log-analytics
```

### 2. Resource Group and Initial Setup

```bash
# Create resource group
az group create \
    --name sre-agent-rg \
    --location eastus

# Create Log Analytics workspace for monitoring
az monitor log-analytics workspace create \
    --resource-group sre-agent-rg \
    --workspace-name sre-agent-logs \
    --location eastus
```

### 3. Infrastructure Deployment with Bicep

Create `main.bicep`:

```bicep
@description('The name of the application')
param appName string = 'sre-agent'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The administrator login for the PostgreSQL server')
param administratorLogin string = 'sreagent'

@description('The administrator password for the PostgreSQL server')
@secure()
param administratorPassword string

@description('The SKU name for the PostgreSQL server')
param skuName string = 'Standard_B1ms'

@description('The storage size for the PostgreSQL server in MB')
param storageSizeGB int = 32

// Variables
var containerAppEnvironmentName = '${appName}-env'
var containerRegistryName = '${appName}acr${uniqueString(resourceGroup().id)}'
var postgresServerName = '${appName}-postgres-${uniqueString(resourceGroup().id)}'
var logAnalyticsWorkspaceName = '${appName}-logs'
var applicationInsightsName = '${appName}-insights'
var keyVaultName = '${appName}-kv-${uniqueString(resourceGroup().id)}'
var storageAccountName = '${appName}storage${uniqueString(resourceGroup().id)}'

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Storage Account for model artifacts
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob container for model artifacts
resource modelContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/model-artifacts'
  properties: {
    publicAccess: 'None'
  }
}

// Key Vault for secrets
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: skuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    version: '14'
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: 'sreagent'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.UTF8'
  }
}

// PostgreSQL Firewall Rule (Allow Azure services)
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Container App Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// Container App for API
resource apiContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${appName}-api'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'database-url'
          value: 'postgresql://${administratorLogin}:${administratorPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/sreagent'
        }
        {
          name: 'storage-connection-string'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'sre-agent-api'
          image: '${containerRegistry.properties.loginServer}/sre-agent-api:latest'
          resources: {
            cpu: json('2.0')
            memory: '4Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'AZURE_STORAGE_CONNECTION_STRING'
              secretRef: 'storage-connection-string'
            }
            {
              name: 'AZURE_SUBSCRIPTION_ID'
              value: subscription().subscriptionId
            }
            {
              name: 'AZURE_RESOURCE_GROUP'
              value: resourceGroup().name
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsights.properties.ConnectionString
            }
            {
              name: 'LOG_LEVEL'
              value: 'INFO'
            }
            {
              name: 'API_HOST'
              value: '0.0.0.0'
            }
            {
              name: 'API_PORT'
              value: '8000'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/v1/health'
                port: 8000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/v1/health'
                port: 8000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
}

// Container App for Frontend
resource frontendContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${appName}-frontend'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
    }
    template: {
      containers: [
        {
          name: 'sre-agent-frontend'
          image: '${containerRegistry.properties.loginServer}/sre-agent-frontend:latest'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'REACT_APP_API_URL'
              value: 'https://${apiContainerApp.properties.configuration.ingress.fqdn}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Outputs
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output apiUrl string = 'https://${apiContainerApp.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontendContainerApp.properties.configuration.ingress.fqdn}'
output postgresServerName string = postgresServer.name
output postgresServerFQDN string = postgresServer.properties.fullyQualifiedDomainName
output keyVaultName string = keyVault.name
output storageAccountName string = storageAccount.name
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
```

Deploy the infrastructure:

```bash
# Deploy the Bicep template
az deployment group create \
    --resource-group sre-agent-rg \
    --template-file main.bicep \
    --parameters administratorPassword='YourSecurePassword123!'
```

### 4. Environment Configuration

Create `.env.azure`:

```bash
# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=sre-agent-rg
AZURE_LOCATION=eastus
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Database Configuration
DATABASE_URL=postgresql://sreagent:YourSecurePassword123!@your-postgres-server.postgres.database.azure.com:5432/sreagent

# Azure Monitor Configuration
APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
AZURE_MONITOR_WORKSPACE_ID=your-workspace-id

# Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=model-artifacts

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

# Alerting Configuration
AZURE_WEBHOOK_URL=your-logic-app-webhook-url
TEAMS_WEBHOOK_URL=your-teams-webhook-url
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Security Configuration
ALLOWED_HOSTS=your-container-app-domain.azurecontainerapps.io,localhost
CORS_ORIGINS=https://your-frontend-domain.azurecontainerapps.io,http://localhost:3000

# Feature Flags
ENABLE_ANOMALY_DETECTION=true
ENABLE_CONFIG_ANALYSIS=true
ENABLE_INCIDENT_AUTOMATION=true
```

### 5. Azure-Specific Code Integrations

#### Azure Monitor Integration

Create `python-backend/src/integrations/azure_monitor.py`:

```python
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import structlog
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, MetricsQueryClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.sql import SqlManagementClient
from azure.mgmt.network import NetworkManagementClient

logger = structlog.get_logger()

class AzureMonitorCollector:
    def __init__(self, subscription_id: str, resource_group: str):
        self.subscription_id = subscription_id
        self.resource_group = resource_group
        self.credential = DefaultAzureCredential()
        
        # Initialize clients
        self.logs_client = LogsQueryClient(self.credential)
        self.metrics_client = MetricsQueryClient(self.credential)
        self.compute_client = ComputeManagementClient(self.credential, subscription_id)
        self.sql_client = SqlManagementClient(self.credential, subscription_id)
        self.network_client = NetworkManagementClient(self.credential, subscription_id)
    
    async def collect_all_metrics(self) -> Dict[str, Any]:
        """Collect metrics from all Azure services"""
        try:
            tasks = [
                self.collect_vm_metrics(),
                self.collect_sql_metrics(),
                self.collect_app_service_metrics(),
                self.collect_container_app_metrics()
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
            logger.error("Failed to collect Azure Monitor metrics", error=str(e))
            return {}
    
    async def collect_vm_metrics(self) -> Dict[str, Any]:
        """Collect Virtual Machine metrics"""
        try:
            vms = list(self.compute_client.virtual_machines.list(self.resource_group))
            
            if not vms:
                return {}
            
            metrics = {}
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)
            
            for vm in vms:
                vm_metrics = await self._get_vm_metrics(vm, start_time, end_time)
                metrics[f"vm_{vm.name}"] = vm_metrics
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect VM metrics", error=str(e))
            return {}
    
    async def _get_vm_metrics(self, vm, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get metrics for a specific VM"""
        try:
            resource_uri = vm.id
            
            # Define metrics to collect
            metric_names = [
                "Percentage CPU",
                "Available Memory Bytes",
                "Disk Read Bytes",
                "Disk Write Bytes",
                "Network In Total",
                "Network Out Total"
            ]
            
            metrics_data = {
                'values': [],
                'timestamps': [],
                'metadata': {
                    'vm_name': vm.name,
                    'vm_size': vm.hardware_profile.vm_size,
                    'service': 'vm'
                }
            }
            
            for metric_name in metric_names:
                try:
                    response = self.metrics_client.query_resource(
                        resource_uri=resource_uri,
                        metric_names=[metric_name],
                        timespan=timedelta(hours=1),
                        interval=timedelta(minutes=5),
                        aggregations=["Average"]
                    )
                    
                    for metric in response.metrics:
                        for time_series in metric.timeseries:
                            for data_point in time_series.data:
                                if data_point.average is not None:
                                    metrics_data['values'].append(data_point.average)
                                    metrics_data['timestamps'].append(data_point.time_stamp)
                
                except Exception as e:
                    logger.error(f"Failed to get {metric_name} for VM {vm.name}", error=str(e))
            
            return metrics_data
            
        except Exception as e:
            logger.error(f"Failed to get metrics for VM {vm.name}", error=str(e))
            return {'values': [], 'timestamps': [], 'metadata': {'service': 'vm'}}
    
    async def collect_sql_metrics(self) -> Dict[str, Any]:
        """Collect Azure SQL Database metrics"""
        try:
            servers = list(self.sql_client.servers.list_by_resource_group(self.resource_group))
            
            metrics = {}
            
            for server in servers:
                databases = list(self.sql_client.databases.list_by_server(
                    self.resource_group, server.name
                ))
                
                for db in databases:
                    if db.name != 'master':  # Skip master database
                        db_metrics = await self._get_sql_metrics(server.name, db.name)
                        metrics[f"sql_{server.name}_{db.name}"] = db_metrics
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect SQL metrics", error=str(e))
            return {}
    
    async def _get_sql_metrics(self, server_name: str, database_name: str) -> Dict[str, Any]:
        """Get metrics for a specific SQL database"""
        try:
            resource_uri = f"/subscriptions/{self.subscription_id}/resourceGroups/{self.resource_group}/providers/Microsoft.Sql/servers/{server_name}/databases/{database_name}"
            
            metric_names = [
                "cpu_percent",
                "dtu_consumption_percent",
                "storage_percent",
                "connection_successful",
                "connection_failed"
            ]
            
            metrics_data = {
                'values': [],
                'timestamps': [],
                'metadata': {
                    'server_name': server_name,
                    'database_name': database_name,
                    'service': 'sql'
                }
            }
            
            for metric_name in metric_names:
                try:
                    response = self.metrics_client.query_resource(
                        resource_uri=resource_uri,
                        metric_names=[metric_name],
                        timespan=timedelta(hours=1),
                        interval=timedelta(minutes=5),
                        aggregations=["Average"]
                    )
                    
                    for metric in response.metrics:
                        for time_series in metric.timeseries:
                            for data_point in time_series.data:
                                if data_point.average is not None:
                                    metrics_data['values'].append(data_point.average)
                                    metrics_data['timestamps'].append(data_point.time_stamp)
                
                except Exception as e:
                    logger.error(f"Failed to get {metric_name} for SQL DB {database_name}", error=str(e))
            
            return metrics_data
            
        except Exception as e:
            logger.error(f"Failed to get metrics for SQL DB {database_name}", error=str(e))
            return {'values': [], 'timestamps': [], 'metadata': {'service': 'sql'}}
    
    async def collect_app_service_metrics(self) -> Dict[str, Any]:
        """Collect App Service metrics using KQL queries"""
        try:
            # Query App Service metrics using KQL
            kql_query = """
            AppServiceHTTPLogs
            | where TimeGenerated > ago(1h)
            | summarize 
                RequestCount = count(),
                AvgResponseTime = avg(TimeTaken),
                ErrorRate = countif(ScStatus >= 400) * 100.0 / count()
            by bin(TimeGenerated, 5m), CsHost
            | order by TimeGenerated desc
            """
            
            response = self.logs_client.query_workspace(
                workspace_id="your-workspace-id",  # This should come from config
                query=kql_query,
                timespan=timedelta(hours=1)
            )
            
            metrics = {
                'app_service_metrics': {
                    'values': [],
                    'timestamps': [],
                    'metadata': {'service': 'app_service'}
                }
            }
            
            for row in response.tables[0].rows:
                metrics['app_service_metrics']['values'].append(row[1])  # RequestCount
                metrics['app_service_metrics']['timestamps'].append(row[0])  # TimeGenerated
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect App Service metrics", error=str(e))
            return {}
    
    async def collect_container_app_metrics(self) -> Dict[str, Any]:
        """Collect Container App metrics"""
        try:
            # Query Container App metrics using KQL
            kql_query = """
            ContainerAppConsoleLogs_CL
            | where TimeGenerated > ago(1h)
            | where ContainerAppName_s contains "sre-agent"
            | summarize 
                LogCount = count(),
                ErrorCount = countif(Log_s contains "ERROR"),
                WarningCount = countif(Log_s contains "WARNING")
            by bin(TimeGenerated, 5m), ContainerAppName_s
            | order by TimeGenerated desc
            """
            
            response = self.logs_client.query_workspace(
                workspace_id="your-workspace-id",  # This should come from config
                query=kql_query,
                timespan=timedelta(hours=1)
            )
            
            metrics = {
                'container_app_metrics': {
                    'values': [],
                    'timestamps': [],
                    'metadata': {'service': 'container_app'}
                }
            }
            
            for row in response.tables[0].rows:
                metrics['container_app_metrics']['values'].append(row[1])  # LogCount
                metrics['container_app_metrics']['timestamps'].append(row[0])  # TimeGenerated
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect Container App metrics", error=str(e))
            return {}
    
    async def publish_custom_metric(self, metric_name: str, value: float, dimensions: Dict[str, str] = None):
        """Publish custom metric to Azure Monitor"""
        try:
            # Azure Monitor doesn't have a direct API for custom metrics like CloudWatch
            # Instead, we'll use Application Insights telemetry
            from applicationinsights import TelemetryClient
            
            # This would be initialized with your Application Insights instrumentation key
            tc = TelemetryClient('your-instrumentation-key')
            
            tc.track_metric(metric_name, value, properties=dimensions)
            tc.flush()
            
            logger.info(f"Published custom metric {metric_name} with value {value}")
            
        except Exception as e:
            logger.error(f"Failed to publish custom metric {metric_name}", error=str(e))
```

#### Azure Logic Apps Integration for Alerting

Create `python-backend/src/integrations/azure_logic_apps.py`:

```python
import aiohttp
import json
from typing import Dict, Any
import structlog

logger = structlog.get_logger()

class AzureLogicAppsAlerter:
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
    
    async def send_anomaly_alert(self, anomaly: Dict[str, Any]) -> bool:
        """Send anomaly alert via Azure Logic Apps"""
        try:
            payload = {
                "alert_type": "anomaly",
                "severity": anomaly.get('severity', 'unknown'),
                "metric_name": anomaly.get('metric_name', 'unknown'),
                "value": anomaly.get('value', 0),
                "confidence": anomaly.get('confidence', 0),
                "description": anomaly.get('description', ''),
                "timestamp": anomaly.get('timestamp', ''),
                "recommendations": anomaly.get('recommendations', []),
                "azure_metadata": {
                    "subscription_id": "your-subscription-id",
                    "resource_group": "sre-agent-rg",
                    "alert_source": "SRE Agent"
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.webhook_url,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    if response.status == 200:
                        logger.info("Azure Logic Apps alert sent successfully")
                        return True
                    else:
                        logger.error(f"Failed to send alert, status: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error("Failed to send Azure Logic Apps alert", error=str(e))
            return False
    
    async def send_teams_notification(self, message: Dict[str, Any]) -> bool:
        """Send notification to Microsoft Teams"""
        try:
            # Format message for Teams
            teams_payload = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": self._get_theme_color(message.get('severity', 'info')),
                "summary": f"SRE Alert: {message.get('title', 'Unknown Alert')}",
                "sections": [
                    {
                        "activityTitle": f"🚨 SRE Agent Alert",
                        "activitySubtitle": message.get('title', 'Unknown Alert'),
                        "facts": [
                            {
                                "name": "Severity",
                                "value": message.get('severity', 'unknown').upper()
                            },
                            {
                                "name": "Service",
                                "value": message.get('service', 'unknown')
                            },
                            {
                                "name": "Timestamp",
                                "value": message.get('timestamp', 'unknown')
                            }
                        ],
                        "markdown": True,
                        "text": message.get('description', 'No description available')
                    }
                ],
                "potentialAction": [
                    {
                        "@type": "OpenUri",
                        "name": "View Dashboard",
                        "targets": [
                            {
                                "os": "default",
                                "uri": "https://your-frontend-url.azurecontainerapps.io"
                            }
                        ]
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.webhook_url,
                    json=teams_payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    if response.status == 200:
                        logger.info("Teams notification sent successfully")
                        return True
                    else:
                        logger.error(f"Failed to send Teams notification, status: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error("Failed to send Teams notification", error=str(e))
            return False
    
    def _get_theme_color(self, severity: str) -> str:
        """Get theme color based on severity"""
        colors = {
            'critical': 'FF0000',
            'warning': 'FFA500',
            'info': '0078D4',
            'success': '00FF00'
        }
        return colors.get(severity.lower(), '808080')
```

### 6. Deployment Scripts

Create `deploy-to-azure.sh`:

```bash
#!/bin/bash

set -e

# Configuration
RESOURCE_GROUP="sre-agent-rg"
LOCATION="eastus"
ACR_NAME="sreagentacr$(openssl rand -hex 4)"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo "🚀 Starting deployment to Azure..."
echo "Subscription ID: $SUBSCRIPTION_ID"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"

# Get ACR name from deployment output
ACR_LOGIN_SERVER=$(az deployment group show \
    --resource-group $RESOURCE_GROUP \
    --name main \
    --query properties.outputs.containerRegistryLoginServer.value -o tsv)

echo "📦 Container Registry: $ACR_LOGIN_SERVER"

# Login to ACR
echo "🔐 Logging in to Azure Container Registry..."
az acr login --name $ACR_LOGIN_SERVER

# Build and push API image
echo "🏗️ Building and pushing API image..."
cd python-backend
docker build -t sre-agent-api .
docker tag sre-agent-api:latest $ACR_LOGIN_SERVER/sre-agent-api:latest
docker push $ACR_LOGIN_SERVER/sre-agent-api:latest
cd ..

# Build and push frontend image
echo "🏗️ Building and pushing frontend image..."
docker build -t sre-agent-frontend .
docker tag sre-agent-frontend:latest $ACR_LOGIN_SERVER/sre-agent-frontend:latest
docker push $ACR_LOGIN_SERVER/sre-agent-frontend:latest

# Update container apps
echo "🔄 Updating Container Apps..."

# Update API container app
az containerapp update \
    --name sre-agent-api \
    --resource-group $RESOURCE_GROUP \
    --image $ACR_LOGIN_SERVER/sre-agent-api:latest

# Update frontend container app
az containerapp update \
    --name sre-agent-frontend \
    --resource-group $RESOURCE_GROUP \
    --image $ACR_LOGIN_SERVER/sre-agent-frontend:latest

echo "✅ Deployment completed successfully!"

# Get application URLs
API_URL=$(az containerapp show \
    --name sre-agent-api \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn -o tsv)

FRONTEND_URL=$(az containerapp show \
    --name sre-agent-frontend \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn -o tsv)

echo "🌐 API URL: https://$API_URL"
echo "🌐 Frontend URL: https://$FRONTEND_URL"
echo "🎉 Your SRE Agent is now running on Azure!"
```

Make the script executable:
```bash
chmod +x deploy-to-azure.sh
```

### 7. Testing Your Azure Deployment

Create `test-azure-deployment.sh`:

```bash
#!/bin/bash

# Get application URLs
API_URL=$(az containerapp show \
    --name sre-agent-api \
    --resource-group sre-agent-rg \
    --query properties.configuration.ingress.fqdn -o tsv)

FRONTEND_URL=$(az containerapp show \
    --name sre-agent-frontend \
    --resource-group sre-agent-rg \
    --query properties.configuration.ingress.fqdn -o tsv)

echo "Testing deployment at:"
echo "API: https://$API_URL"
echo "Frontend: https://$FRONTEND_URL"

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f "https://$API_URL/api/v1/health" || echo "❌ Health check failed"

# Test metrics endpoint
echo "📊 Testing metrics endpoint..."
curl -f "https://$API_URL/metrics" || echo "❌ Metrics endpoint failed"

# Test anomaly detection
echo "🧠 Testing anomaly detection..."
curl -X POST "https://$API_URL/api/v1/anomalies/predict" \
    -H "Content-Type: application/json" \
    -d '{
        "metric_name": "cpu_usage",
        "values": [45, 52, 48, 55, 95, 32],
        "timestamps": ["2024-01-15T14:00:00Z", "2024-01-15T14:10:00Z", "2024-01-15T14:20:00Z", "2024-01-15T14:30:00Z", "2024-01-15T14:40:00Z", "2024-01-15T14:50:00Z"]
    }' || echo "❌ Anomaly detection test failed"

echo "✅ Testing completed!"
echo "🌐 Access your application at: https://$FRONTEND_URL"
```

### 8. Monitoring and Alerting Setup

Create Azure Monitor alerts:

```bash
# Create action group for notifications
az monitor action-group create \
    --resource-group sre-agent-rg \
    --name sre-agent-alerts \
    --short-name sreagent \
    --email-receivers name=admin email=admin@yourcompany.com

# Create metric alert for high CPU
az monitor metrics alert create \
    --name "High CPU Usage" \
    --resource-group sre-agent-rg \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/sre-agent-rg/providers/Microsoft.App/containerApps/sre-agent-api" \
    --condition "avg Percentage CPU > 80" \
    --description "Alert when CPU usage is high" \
    --evaluation-frequency 5m \
    --window-size 15m \
    --severity 2 \
    --action sre-agent-alerts

# Create log alert for errors
az monitor scheduled-query create \
    --resource-group sre-agent-rg \
    --name "Application Errors" \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/sre-agent-rg/providers/Microsoft.OperationalInsights/workspaces/sre-agent-logs" \
    --condition "count 'ContainerAppConsoleLogs_CL | where Log_s contains \"ERROR\"' > 10" \
    --description "Alert when error count is high" \
    --evaluation-frequency 5m \
    --window-size 15m \
    --severity 1 \
    --action sre-agent-alerts
```

### 9. Database Setup

Connect to your PostgreSQL database and run the setup:

```bash
# Get database connection details
POSTGRES_SERVER=$(az deployment group show \
    --resource-group sre-agent-rg \
    --name main \
    --query properties.outputs.postgresServerFQDN.value -o tsv)

# Connect to database (you'll be prompted for password)
psql "host=$POSTGRES_SERVER port=5432 dbname=sreagent user=sreagent sslmode=require"
```

Run the database schema:

```sql
-- Create tables for SRE Agent
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50),
    status VARCHAR(50),
    assignee VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    affected_services JSONB,
    runbook VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100),
    tags JSONB,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    anomaly_score FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    severity VARCHAR(50),
    description TEXT,
    recommendations JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    config_type VARCHAR(50) NOT NULL,
    config_content TEXT NOT NULL,
    analysis_result JSONB,
    issues_found INTEGER DEFAULT 0,
    recommendations JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
```

This comprehensive Azure setup guide provides everything needed to deploy and run the SRE Agent in an Azure environment, including Container Apps, monitoring integration, and deployment automation.