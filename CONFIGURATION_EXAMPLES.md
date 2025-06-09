# SRE Agent Configuration Examples

## Input Data Formats and Plugin Configurations

### 1. Infrastructure Configuration Analysis

#### Terraform Configuration Input
```json
{
  "config_type": "terraform",
  "config_content": "resource \"aws_security_group\" \"web\" {\n  name        = \"web-sg\"\n  description = \"Security group for web servers\"\n  vpc_id      = var.vpc_id\n\n  ingress {\n    from_port   = 22\n    to_port     = 22\n    protocol    = \"tcp\"\n    cidr_blocks = [\"0.0.0.0/0\"]\n  }\n\n  ingress {\n    from_port   = 80\n    to_port     = 80\n    protocol    = \"tcp\"\n    cidr_blocks = [\"0.0.0.0/0\"]\n  }\n\n  egress {\n    from_port   = 0\n    to_port     = 0\n    protocol    = \"-1\"\n    cidr_blocks = [\"0.0.0.0/0\"]\n  }\n}",
  "metadata": {
    "file_path": "infrastructure/security_groups.tf",
    "environment": "production",
    "team": "platform"
  }
}
```

#### CloudFormation Configuration Input
```json
{
  "config_type": "cloudformation",
  "config_content": "{\n  \"AWSTemplateFormatVersion\": \"2010-09-09\",\n  \"Resources\": {\n    \"WebServerSecurityGroup\": {\n      \"Type\": \"AWS::EC2::SecurityGroup\",\n      \"Properties\": {\n        \"GroupDescription\": \"Security group for web servers\",\n        \"SecurityGroupIngress\": [\n          {\n            \"IpProtocol\": \"tcp\",\n            \"FromPort\": 22,\n            \"ToPort\": 22,\n            \"CidrIp\": \"0.0.0.0/0\"\n          }\n        ]\n      }\n    }\n  }\n}",
  "metadata": {
    "stack_name": "web-infrastructure",
    "region": "us-east-1",
    "environment": "staging"
  }
}
```

#### Kubernetes Configuration Input
```json
{
  "config_type": "kubernetes",
  "config_content": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web-app\n  labels:\n    app: web\nspec:\n  containers:\n  - name: web-container\n    image: nginx:latest\n    ports:\n    - containerPort: 80\n    securityContext:\n      runAsUser: 0\n      privileged: true\n    resources:\n      requests:\n        memory: \"64Mi\"\n        cpu: \"250m\"\n      limits:\n        memory: \"128Mi\"\n        cpu: \"500m\"",
  "metadata": {
    "namespace": "production",
    "cluster": "main-cluster",
    "manifest_file": "web-app.yaml"
  }
}
```

### 2. Metrics Data Input Formats

#### Time Series Metrics Input
```json
{
  "metric_name": "cpu_utilization",
  "values": [45.2, 47.8, 52.1, 48.9, 95.3, 51.2, 49.7],
  "timestamps": [
    "2024-01-15T14:00:00Z",
    "2024-01-15T14:05:00Z",
    "2024-01-15T14:10:00Z",
    "2024-01-15T14:15:00Z",
    "2024-01-15T14:20:00Z",
    "2024-01-15T14:25:00Z",
    "2024-01-15T14:30:00Z"
  ],
  "metadata": {
    "source": "cloudwatch",
    "instance_id": "i-1234567890abcdef0",
    "region": "us-east-1",
    "tags": {
      "Environment": "production",
      "Service": "web-server",
      "Team": "platform"
    }
  }
}
```

#### Multi-Metric Input
```json
{
  "metrics": [
    {
      "name": "cpu_utilization",
      "values": [45.2, 47.8, 52.1],
      "unit": "percent"
    },
    {
      "name": "memory_utilization",
      "values": [67.5, 69.2, 71.8],
      "unit": "percent"
    },
    {
      "name": "disk_io_read",
      "values": [1024, 1156, 1089],
      "unit": "bytes_per_second"
    }
  ],
  "timestamps": [
    "2024-01-15T14:00:00Z",
    "2024-01-15T14:05:00Z",
    "2024-01-15T14:10:00Z"
  ],
  "source": {
    "type": "prometheus",
    "endpoint": "http://prometheus:9090",
    "job": "node-exporter",
    "instance": "web-server-01:9100"
  }
}
```

### 3. Log Analysis Input Formats

#### Application Logs
```json
{
  "log_entries": [
    {
      "timestamp": "2024-01-15T14:30:15.123Z",
      "level": "ERROR",
      "message": "Database connection timeout after 30 seconds",
      "service": "user-service",
      "trace_id": "abc123def456",
      "metadata": {
        "database": "users_db",
        "connection_pool": "primary",
        "retry_count": 3
      }
    },
    {
      "timestamp": "2024-01-15T14:30:16.456Z",
      "level": "WARN",
      "message": "High memory usage detected: 89%",
      "service": "user-service",
      "trace_id": "abc123def456",
      "metadata": {
        "memory_usage": 89.2,
        "threshold": 85.0
      }
    }
  ],
  "source": {
    "type": "elasticsearch",
    "index": "application-logs-2024.01",
    "query_time_range": "last_1_hour"
  }
}
```

#### Infrastructure Logs
```json
{
  "log_entries": [
    {
      "timestamp": "2024-01-15T14:25:30.789Z",
      "source": "aws-cloudtrail",
      "event_name": "CreateSecurityGroup",
      "user_identity": {
        "type": "IAMUser",
        "user_name": "john.doe@company.com"
      },
      "source_ip": "203.0.113.12",
      "resources": [
        {
          "resource_type": "AWS::EC2::SecurityGroup",
          "resource_name": "sg-0123456789abcdef0"
        }
      ],
      "event_details": {
        "group_name": "web-servers-sg",
        "vpc_id": "vpc-12345678"
      }
    }
  ],
  "metadata": {
    "region": "us-east-1",
    "account_id": "123456789012"
  }
}
```

### 4. Plugin Configuration Examples

#### AWS CloudWatch Plugin Configuration
```yaml
# config/plugins/aws_cloudwatch.yaml
plugin_name: aws_cloudwatch
enabled: true
configuration:
  region: us-east-1
  access_key_id: ${AWS_ACCESS_KEY_ID}
  secret_access_key: ${AWS_SECRET_ACCESS_KEY}
  
  # Metrics collection settings
  metrics:
    collection_interval: 300  # 5 minutes
    namespaces:
      - AWS/EC2
      - AWS/RDS
      - AWS/ApplicationELB
      - AWS/Lambda
    
    # Custom metrics to collect
    custom_metrics:
      - metric_name: CPUUtilization
        namespace: AWS/EC2
        dimensions:
          - name: InstanceId
            values: ["i-1234567890abcdef0", "i-0987654321fedcba0"]
        statistics: [Average, Maximum]
      
      - metric_name: DatabaseConnections
        namespace: AWS/RDS
        dimensions:
          - name: DBInstanceIdentifier
            values: ["production-db", "staging-db"]
        statistics: [Average, Sum]
  
  # Alerting configuration
  alerts:
    sns_topic_arn: arn:aws:sns:us-east-1:123456789012:sre-alerts
    severity_mapping:
      critical: 0
      warning: 1
      info: 2

# Thresholds for anomaly detection
thresholds:
  cpu_utilization:
    warning: 70
    critical: 90
  memory_utilization:
    warning: 80
    critical: 95
  database_connections:
    warning: 80
    critical: 95
```

#### Azure Monitor Plugin Configuration
```yaml
# config/plugins/azure_monitor.yaml
plugin_name: azure_monitor
enabled: true
configuration:
  subscription_id: ${AZURE_SUBSCRIPTION_ID}
  resource_group: sre-agent-rg
  tenant_id: ${AZURE_TENANT_ID}
  client_id: ${AZURE_CLIENT_ID}
  client_secret: ${AZURE_CLIENT_SECRET}
  
  # Metrics collection settings
  metrics:
    collection_interval: 300
    resource_types:
      - Microsoft.Compute/virtualMachines
      - Microsoft.Sql/servers/databases
      - Microsoft.Web/sites
      - Microsoft.ContainerInstance/containerGroups
    
    # Specific metrics to collect
    metric_definitions:
      - resource_type: Microsoft.Compute/virtualMachines
        metrics:
          - name: "Percentage CPU"
            aggregation: Average
          - name: "Available Memory Bytes"
            aggregation: Average
          - name: "Disk Read Bytes"
            aggregation: Total
      
      - resource_type: Microsoft.Sql/servers/databases
        metrics:
          - name: "cpu_percent"
            aggregation: Average
          - name: "dtu_consumption_percent"
            aggregation: Average
  
  # Log Analytics workspace
  log_analytics:
    workspace_id: ${AZURE_WORKSPACE_ID}
    workspace_key: ${AZURE_WORKSPACE_KEY}
    
    # KQL queries for log analysis
    queries:
      - name: application_errors
        query: |
          AppServiceHTTPLogs
          | where TimeGenerated > ago(1h)
          | where ScStatus >= 400
          | summarize ErrorCount = count() by bin(TimeGenerated, 5m), CsHost
        interval: 300
      
      - name: container_app_logs
        query: |
          ContainerAppConsoleLogs_CL
          | where TimeGenerated > ago(1h)
          | where Log_s contains "ERROR"
          | project TimeGenerated, ContainerAppName_s, Log_s
        interval: 300

# Alerting configuration
alerts:
  logic_app_webhook: ${AZURE_WEBHOOK_URL}
  teams_webhook: ${TEAMS_WEBHOOK_URL}
```

#### Prometheus Plugin Configuration
```yaml
# config/plugins/prometheus.yaml
plugin_name: prometheus
enabled: true
configuration:
  endpoint: http://prometheus:9090
  timeout: 30
  
  # Metrics queries
  queries:
    - name: cpu_usage
      query: 'avg(100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))'
      interval: 60
      labels:
        metric_type: system
        component: cpu
    
    - name: memory_usage
      query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
      interval: 60
      labels:
        metric_type: system
        component: memory
    
    - name: disk_usage
      query: '100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})'
      interval: 60
      labels:
        metric_type: system
        component: disk
    
    - name: http_request_rate
      query: 'rate(http_requests_total[5m])'
      interval: 60
      labels:
        metric_type: application
        component: http
    
    - name: error_rate
      query: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100'
      interval: 60
      labels:
        metric_type: application
        component: errors

  # Alert manager integration
  alertmanager:
    endpoint: http://alertmanager:9093
    webhook_url: http://sre-agent-api:8000/api/v1/webhooks/prometheus
```

#### Grafana Plugin Configuration
```yaml
# config/plugins/grafana.yaml
plugin_name: grafana
enabled: true
configuration:
  endpoint: http://grafana:3000
  api_key: ${GRAFANA_API_KEY}
  
  # Dashboard management
  dashboards:
    auto_import: true
    dashboard_paths:
      - /config/dashboards/sre-overview.json
      - /config/dashboards/anomaly-detection.json
      - /config/dashboards/infrastructure-health.json
    
    # Dashboard variables
    variables:
      environment: production
      region: us-east-1
      team: platform
  
  # Annotation integration
  annotations:
    enabled: true
    datasource: prometheus
    tags: [sre-agent, anomaly, incident]
```

### 5. ML Model Configuration Examples

#### Anomaly Detection Model Configuration
```yaml
# config/models/anomaly_detection.yaml
model_name: anomaly_detector
model_type: ensemble
enabled: true

# Base models in the ensemble
base_models:
  - name: isolation_forest
    type: sklearn.ensemble.IsolationForest
    parameters:
      contamination: 0.1
      random_state: 42
      n_estimators: 100
    weight: 0.3
  
  - name: autoencoder
    type: pyod.models.auto_encoder.AutoEncoder
    parameters:
      hidden_neurons: [64, 32, 16, 32, 64]
      epochs: 100
      batch_size: 32
      dropout_rate: 0.2
    weight: 0.3
  
  - name: transformer
    type: huggingface_transformer
    model_name: microsoft/DialoGPT-medium
    parameters:
      max_length: 512
      fine_tune: true
      learning_rate: 2e-5
      num_epochs: 3
    weight: 0.4

# Training configuration
training:
  data_sources:
    - type: prometheus
      query: 'node_cpu_seconds_total'
      time_range: 30d
    - type: cloudwatch
      metric: CPUUtilization
      time_range: 30d
  
  validation_split: 0.2
  test_split: 0.1
  
  # Feature engineering
  features:
    - name: rolling_mean
      window: 10
    - name: rolling_std
      window: 10
    - name: time_of_day
      type: cyclical
    - name: day_of_week
      type: cyclical

# Inference configuration
inference:
  batch_size: 32
  confidence_threshold: 0.8
  
  # Post-processing
  post_processing:
    - type: temporal_smoothing
      window: 5
    - type: severity_classification
      thresholds:
        warning: 0.7
        critical: 0.9

# Model monitoring
monitoring:
  drift_detection: true
  performance_metrics:
    - precision
    - recall
    - f1_score
    - auc_roc
  
  retraining:
    schedule: weekly
    trigger_conditions:
      - accuracy_drop: 0.05
      - drift_score: 0.3
```

#### Configuration Analysis Model Configuration
```yaml
# config/models/config_analysis.yaml
model_name: config_analyzer
model_type: transformer
enabled: true

# Hugging Face model configuration
huggingface:
  model_name: microsoft/DialoGPT-medium
  tokenizer_name: microsoft/DialoGPT-medium
  
  # Fine-tuning configuration
  fine_tuning:
    enabled: true
    dataset_path: data/infrastructure_configs.jsonl
    num_epochs: 5
    learning_rate: 2e-5
    batch_size: 16
    max_length: 1024
    
    # Training parameters
    warmup_steps: 500
    weight_decay: 0.01
    gradient_accumulation_steps: 2

# Configuration analysis rules
analysis_rules:
  security:
    - name: open_ssh_access
      pattern: 'cidr_blocks.*0\.0\.0\.0/0.*port.*22'
      severity: critical
      message: "SSH access open to the world"
    
    - name: open_http_access
      pattern: 'cidr_blocks.*0\.0\.0\.0/0.*port.*(80|443)'
      severity: warning
      message: "HTTP/HTTPS access open to the world"
    
    - name: privileged_container
      pattern: 'privileged.*true'
      severity: critical
      message: "Container running in privileged mode"
  
  performance:
    - name: no_resource_limits
      pattern: 'resources.*limits.*null'
      severity: warning
      message: "No resource limits specified"
    
    - name: small_memory_limit
      pattern: 'memory.*[0-9]+Mi.*[1-9][0-9]?Mi'
      severity: info
      message: "Memory limit might be too small"
  
  reliability:
    - name: no_health_check
      pattern: '(?!.*healthcheck).*container'
      severity: warning
      message: "No health check configured"
    
    - name: single_replica
      pattern: 'replicas.*1[^0-9]'
      severity: warning
      message: "Single replica deployment"

# Output configuration
output:
  format: json
  include_recommendations: true
  include_confidence_scores: true
  
  # Recommendation templates
  recommendations:
    security:
      - "Restrict SSH access to specific IP ranges"
      - "Use bastion hosts for SSH access"
      - "Implement proper RBAC policies"
    
    performance:
      - "Set appropriate resource limits"
      - "Use horizontal pod autoscaling"
      - "Implement caching strategies"
    
    reliability:
      - "Add health checks to containers"
      - "Implement multi-replica deployments"
      - "Use rolling update strategies"
```

### 6. Environment-Specific Configuration

#### Production Environment Configuration
```yaml
# config/environments/production.yaml
environment: production

# Database configuration
database:
  host: ${DATABASE_HOST}
  port: 5432
  name: sreagent_prod
  user: ${DATABASE_USER}
  password: ${DATABASE_PASSWORD}
  ssl_mode: require
  pool_size: 20
  max_overflow: 30

# Redis configuration
redis:
  host: ${REDIS_HOST}
  port: 6379
  password: ${REDIS_PASSWORD}
  db: 0
  ssl: true
  pool_size: 10

# Logging configuration
logging:
  level: INFO
  format: json
  handlers:
    - type: file
      filename: /var/log/sre-agent/app.log
      max_size: 100MB
      backup_count: 5
    - type: elasticsearch
      hosts: ["${ELASTICSEARCH_HOST}:9200"]
      index: sre-agent-logs-prod
      ssl: true

# Security configuration
security:
  jwt_secret: ${JWT_SECRET}
  jwt_expiry: 3600
  rate_limiting:
    enabled: true
    requests_per_minute: 100
  
  cors:
    allowed_origins:
      - https://sre-dashboard.company.com
      - https://monitoring.company.com
    allowed_methods: [GET, POST, PUT, DELETE]
    allowed_headers: [Content-Type, Authorization]

# Monitoring configuration
monitoring:
  metrics:
    enabled: true
    port: 9090
    path: /metrics
  
  health_checks:
    enabled: true
    port: 8080
    path: /health
    
  tracing:
    enabled: true
    jaeger_endpoint: ${JAEGER_ENDPOINT}
    sample_rate: 0.1

# ML model configuration
ml_models:
  cache_dir: /var/cache/sre-agent/models
  download_timeout: 300
  
  # Model-specific settings
  anomaly_detector:
    batch_size: 64
    inference_timeout: 30
    gpu_enabled: true
    
  config_analyzer:
    batch_size: 32
    max_input_length: 2048
    gpu_enabled: false

# Alerting configuration
alerting:
  channels:
    - type: slack
      webhook_url: ${SLACK_WEBHOOK_URL}
      channel: "#sre-alerts"
      severity_levels: [critical, warning]
    
    - type: pagerduty
      integration_key: ${PAGERDUTY_INTEGRATION_KEY}
      severity_levels: [critical]
    
    - type: email
      smtp_host: ${SMTP_HOST}
      smtp_port: 587
      username: ${SMTP_USERNAME}
      password: ${SMTP_PASSWORD}
      recipients: ["sre-team@company.com"]
      severity_levels: [critical, warning]

# Feature flags
features:
  anomaly_detection: true
  config_analysis: true
  incident_automation: true
  predictive_analytics: true
  auto_remediation: false  # Disabled in production for safety
```

#### Development Environment Configuration
```yaml
# config/environments/development.yaml
environment: development

# Database configuration (local)
database:
  host: localhost
  port: 5432
  name: sreagent_dev
  user: sreagent
  password: password
  ssl_mode: disable
  pool_size: 5
  max_overflow: 10

# Redis configuration (local)
redis:
  host: localhost
  port: 6379
  password: null
  db: 0
  ssl: false
  pool_size: 5

# Logging configuration
logging:
  level: DEBUG
  format: text
  handlers:
    - type: console
      colorize: true
    - type: file
      filename: logs/sre-agent-dev.log
      max_size: 10MB
      backup_count: 3

# Security configuration (relaxed for development)
security:
  jwt_secret: dev-secret-key
  jwt_expiry: 86400  # 24 hours
  rate_limiting:
    enabled: false
  
  cors:
    allowed_origins: ["*"]
    allowed_methods: [GET, POST, PUT, DELETE, OPTIONS]
    allowed_headers: ["*"]

# Monitoring configuration
monitoring:
  metrics:
    enabled: true
    port: 9090
    path: /metrics
  
  health_checks:
    enabled: true
    port: 8080
    path: /health
    
  tracing:
    enabled: false

# ML model configuration (optimized for development)
ml_models:
  cache_dir: ./cache/models
  download_timeout: 600
  
  # Use smaller models for faster development
  anomaly_detector:
    batch_size: 16
    inference_timeout: 60
    gpu_enabled: false
    
  config_analyzer:
    batch_size: 8
    max_input_length: 512
    gpu_enabled: false

# Alerting configuration (development channels)
alerting:
  channels:
    - type: console
      severity_levels: [critical, warning, info]
    
    - type: webhook
      url: http://localhost:3001/dev-alerts
      severity_levels: [critical, warning]

# Feature flags (all enabled for testing)
features:
  anomaly_detection: true
  config_analysis: true
  incident_automation: true
  predictive_analytics: true
  auto_remediation: true  # Enabled for testing
```

These configuration examples provide comprehensive templates for setting up the SRE Agent in different environments with various cloud providers and monitoring tools. Each configuration can be customized based on specific requirements and infrastructure setup.