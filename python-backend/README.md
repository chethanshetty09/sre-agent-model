# SRE Agent - Python Backend Implementation

This directory contains the complete Python backend implementation for the SRE Agent system using Hugging Face transformers and machine learning models.

## Architecture Overview

The SRE Agent is built using a microservices architecture with the following components:

### Core Components

1. **Configuration Analyzer** (`config_analyzer.py`)
   - Uses BERT-based models for infrastructure configuration analysis
   - Detects security vulnerabilities and misconfigurations
   - Generates optimization recommendations

2. **Anomaly Detection Engine** (`anomaly_detector.py`)
   - Transformer-based time series analysis
   - Real-time metric monitoring and prediction
   - Multi-modal anomaly detection

3. **Incident Response System** (`incident_manager.py`)
   - Automated workflow execution
   - Integration with ticketing systems
   - Runbook automation

4. **ML Model Manager** (`ml_models.py`)
   - Model training and evaluation
   - Fine-tuning on infrastructure datasets
   - Model versioning and deployment

5. **API Server** (`api_server.py`)
   - REST API endpoints
   - Authentication and authorization
   - Request/response handling

## Installation & Setup

```bash
# Create virtual environment
python -m venv sre-agent-env
source sre-agent-env/bin/activate  # Linux/Mac
# or
sre-agent-env\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export HUGGINGFACE_API_KEY="your_hf_api_key"
export AWS_ACCESS_KEY_ID="your_aws_key"
export AWS_SECRET_ACCESS_KEY="your_aws_secret"
export PROMETHEUS_URL="http://prometheus:9090"
```

## Model Configuration

The system uses the following Hugging Face models:

- **Configuration Analysis**: `microsoft/DialoGPT-medium` fine-tuned on infrastructure configs
- **Log Analysis**: `roberta-base` for log pattern recognition
- **Time Series Anomaly Detection**: Custom transformer model
- **Failure Prediction**: `bert-base-uncased` fine-tuned on incident data

## API Endpoints

### Infrastructure Analysis
- `POST /api/v1/analyze/config` - Analyze infrastructure configuration
- `GET /api/v1/analyze/recommendations` - Get optimization recommendations

### Anomaly Detection
- `GET /api/v1/anomalies/current` - Current anomalies
- `POST /api/v1/anomalies/predict` - Predict potential anomalies
- `GET /api/v1/models/status` - ML model status

### Incident Management
- `POST /api/v1/incidents` - Create incident
- `GET /api/v1/incidents/{id}` - Get incident details
- `POST /api/v1/incidents/{id}/automate` - Trigger automation

### Metrics & Monitoring
- `GET /api/v1/metrics/system` - System metrics
- `POST /api/v1/metrics/custom` - Custom metric ingestion
- `GET /api/v1/health` - System health check

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t sre-agent:latest .

# Run container
docker run -d \
  --name sre-agent \
  -p 8000:8000 \
  -e HUGGINGFACE_API_KEY=$HUGGINGFACE_API_KEY \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  sre-agent:latest
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/configmap.yaml
```

### AWS ECS Deployment

```bash
# Create ECS task definition
aws ecs create-task-definition --cli-input-json file://ecs-task-definition.json

# Deploy service
aws ecs create-service \
  --cluster sre-agent-cluster \
  --service-name sre-agent-service \
  --task-definition sre-agent:1 \
  --desired-count 2
```

## Model Training

### Fine-tuning Configuration Analyzer

```bash
python scripts/train_config_model.py \
  --dataset-path data/infrastructure_configs.json \
  --model-name microsoft/DialoGPT-medium \
  --epochs 10 \
  --batch-size 16
```

### Training Anomaly Detection Model

```bash
python scripts/train_anomaly_model.py \
  --metrics-data data/system_metrics.csv \
  --model-type transformer \
  --sequence-length 100
```

## Configuration

### Environment Variables

```bash
# Required
HUGGINGFACE_API_KEY=your_huggingface_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Optional
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_API_KEY=your_pagerduty_key
LOG_LEVEL=INFO
MODEL_CACHE_DIR=/tmp/models
```

### Model Configuration (`config/models.yaml`)

```yaml
models:
  config_analyzer:
    name: "microsoft/DialoGPT-medium"
    fine_tuned: true
    threshold: 0.85
    
  anomaly_detector:
    name: "custom-transformer"
    sequence_length: 100
    threshold: 0.90
    
  log_analyzer:
    name: "roberta-base"
    max_length: 512
    threshold: 0.80
```

## Testing

```bash
# Run unit tests
python -m pytest tests/unit/

# Run integration tests
python -m pytest tests/integration/

# Run performance tests
python -m pytest tests/performance/

# Generate coverage report
coverage run -m pytest
coverage report -m
coverage html
```

## Security Best Practices

1. **API Security**
   - JWT token authentication
   - Rate limiting
   - Input validation and sanitization
   - HTTPS enforcement

2. **Model Security**
   - Model versioning and integrity checks
   - Secure model storage
   - Access control for model updates

3. **Data Security**
   - Encryption at rest and in transit
   - Secure credential management
   - Audit logging

## Monitoring & Observability

### Metrics Collection

```python
# Custom metrics example
from prometheus_client import Counter, Histogram, Gauge

anomaly_counter = Counter('sre_anomalies_total', 'Total anomalies detected')
prediction_histogram = Histogram('sre_prediction_duration_seconds', 'Time spent on predictions')
model_accuracy_gauge = Gauge('sre_model_accuracy', 'Current model accuracy')
```

### Logging

```python
import structlog

logger = structlog.get_logger()
logger.info("Anomaly detected", 
           service="web-server-01", 
           metric="cpu_usage", 
           value=95.2, 
           threshold=80.0)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.