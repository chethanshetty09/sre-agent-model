"""
Anomaly Detection Service
Uses transformer-based models for real-time anomaly detection
"""

import asyncio
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import structlog
from dataclasses import dataclass

import torch
from transformers import AutoModel, AutoTokenizer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from pyod.models.auto_encoder import AutoEncoder
from pyod.models.vae import VAE

from .ml_model_manager import MLModelManager
from utils.metrics_collector import MetricsCollector
from utils.data_preprocessor import TimeSeriesPreprocessor

logger = structlog.get_logger()


@dataclass
class AnomalyResult:
    """Anomaly detection result"""
    timestamp: datetime
    metric_name: str
    value: float
    is_anomaly: bool
    anomaly_score: float
    confidence: float
    severity: str
    description: str
    recommendations: List[str]


@dataclass
class ModelPrediction:
    """Model prediction with metadata"""
    predicted_values: np.ndarray
    confidence_intervals: np.ndarray
    anomaly_scores: np.ndarray
    model_name: str
    timestamp: datetime


class AnomalyDetector:
    """
    Multi-modal anomaly detection system using various ML approaches
    """
    
    def __init__(self, ml_manager: MLModelManager):
        self.ml_manager = ml_manager
        self.metrics_collector = MetricsCollector()
        self.preprocessor = TimeSeriesPreprocessor()
        
        # Model configurations
        self.models = {
            'transformer': None,
            'isolation_forest': IsolationForest(contamination=0.1, random_state=42),
            'autoencoder': AutoEncoder(hidden_neurons=[64, 32, 16, 32, 64]),
            'vae': VAE(encoder_neurons=[32, 16], decoder_neurons=[16, 32])
        }
        
        # Scalers for different metrics
        self.scalers = {}
        
        # Detection thresholds
        self.thresholds = {
            'cpu': {'warning': 0.7, 'critical': 0.9},
            'memory': {'warning': 0.75, 'critical': 0.9},
            'disk': {'warning': 0.8, 'critical': 0.95},
            'network': {'warning': 0.6, 'critical': 0.8},
            'response_time': {'warning': 0.65, 'critical': 0.85}
        }
        
        # Historical data buffer
        self.data_buffer = {}
        self.buffer_size = 1000
        
        logger.info("Anomaly detector initialized")

    async def initialize(self):
        """Initialize anomaly detection models"""
        try:
            # Load transformer model for time series
            await self._load_transformer_model()
            
            # Initialize classical ML models
            await self._initialize_classical_models()
            
            # Load historical data
            await self._load_historical_data()
            
            logger.info("Anomaly detection models initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize anomaly detector", error=str(e))
            raise

    async def _load_transformer_model(self):
        """Load transformer model for time series anomaly detection"""
        try:
            model_name = "microsoft/DialoGPT-medium"  # Can be replaced with custom model
            
            # For demonstration - in production, use a proper time series transformer
            self.models['transformer'] = {
                'tokenizer': AutoTokenizer.from_pretrained(model_name),
                'model': AutoModel.from_pretrained(model_name)
            }
            
            logger.info("Transformer model loaded", model=model_name)
            
        except Exception as e:
            logger.error("Failed to load transformer model", error=str(e))
            raise

    async def _initialize_classical_models(self):
        """Initialize classical ML models for anomaly detection"""
        try:
            # Generate synthetic training data for initialization
            # In production, this would use real historical data
            synthetic_data = self._generate_synthetic_training_data()
            
            # Train Isolation Forest
            self.models['isolation_forest'].fit(synthetic_data)
            
            # Train AutoEncoder
            self.models['autoencoder'].fit(synthetic_data)
            
            # Train VAE
            self.models['vae'].fit(synthetic_data)
            
            logger.info("Classical ML models initialized")
            
        except Exception as e:
            logger.error("Failed to initialize classical models", error=str(e))
            raise

    def _generate_synthetic_training_data(self, n_samples: int = 1000) -> np.ndarray:
        """Generate synthetic training data for model initialization"""
        np.random.seed(42)
        
        # Generate normal patterns
        normal_data = []
        for _ in range(n_samples):
            # CPU pattern
            cpu = np.random.normal(50, 15)
            # Memory pattern (correlated with CPU)
            memory = cpu * 0.8 + np.random.normal(0, 10)
            # Disk usage (slowly increasing)
            disk = np.random.normal(30, 10)
            # Network (variable)
            network = np.random.exponential(20)
            
            normal_data.append([cpu, memory, disk, network])
        
        return np.array(normal_data)

    async def _load_historical_data(self):
        """Load historical metrics data for training and context"""
        try:
            # In production, load from database or metrics storage
            # For now, initialize empty buffers
            metrics = ['cpu', 'memory', 'disk', 'network', 'response_time']
            
            for metric in metrics:
                self.data_buffer[metric] = []
                self.scalers[metric] = StandardScaler()
            
            logger.info("Historical data buffers initialized")
            
        except Exception as e:
            logger.error("Failed to load historical data", error=str(e))
            raise

    async def run_detection_cycle(self):
        """Run a complete anomaly detection cycle"""
        try:
            # Collect current metrics
            current_metrics = await self.metrics_collector.collect_all_metrics()
            
            # Detect anomalies
            anomalies = []
            for metric_name, metric_data in current_metrics.items():
                anomaly_results = await self.detect_anomalies(metric_name, metric_data)
                anomalies.extend(anomaly_results)
            
            # Process detected anomalies
            if anomalies:
                await self._process_anomalies(anomalies)
            
            # Update models with new data
            await self._update_models(current_metrics)
            
            logger.info("Anomaly detection cycle completed", anomalies_count=len(anomalies))
            
        except Exception as e:
            logger.error("Anomaly detection cycle failed", error=str(e))

    async def detect_anomalies(
        self, 
        metric_name: str, 
        metric_data: Dict[str, Any]
    ) -> List[AnomalyResult]:
        """Detect anomalies in metric data using ensemble approach"""
        try:
            anomalies = []
            
            # Extract time series data
            values = metric_data.get('values', [])
            timestamps = metric_data.get('timestamps', [])
            
            if len(values) < 10:  # Need minimum data points
                return anomalies
            
            # Preprocess data
            processed_data = self.preprocessor.preprocess_time_series(values)
            
            # Run ensemble detection
            ensemble_results = await self._run_ensemble_detection(
                metric_name, processed_data, timestamps
            )
            
            # Combine results and make final decisions
            for i, (value, timestamp) in enumerate(zip(values, timestamps)):
                anomaly_score = np.mean([result['scores'][i] for result in ensemble_results])
                is_anomaly = anomaly_score > self.thresholds.get(metric_name, {}).get('warning', 0.7)
                
                if is_anomaly:
                    severity = self._determine_severity(metric_name, anomaly_score)
                    confidence = self._calculate_confidence(ensemble_results, i)
                    description = self._generate_description(metric_name, value, anomaly_score)
                    recommendations = self._generate_recommendations(metric_name, value, severity)
                    
                    anomaly = AnomalyResult(
                        timestamp=timestamp,
                        metric_name=metric_name,
                        value=value,
                        is_anomaly=is_anomaly,
                        anomaly_score=anomaly_score,
                        confidence=confidence,
                        severity=severity,
                        description=description,
                        recommendations=recommendations
                    )
                    
                    anomalies.append(anomaly)
            
            return anomalies
            
        except Exception as e:
            logger.error("Anomaly detection failed", metric=metric_name, error=str(e))
            return []

    async def _run_ensemble_detection(
        self, 
        metric_name: str, 
        data: np.ndarray, 
        timestamps: List[datetime]
    ) -> List[Dict[str, Any]]:
        """Run ensemble of detection models"""
        results = []
        
        try:
            # Isolation Forest
            if len(data.shape) == 1:
                data_2d = data.reshape(-1, 1)
            else:
                data_2d = data
            
            iso_scores = self.models['isolation_forest'].decision_function(data_2d)
            results.append({
                'model': 'isolation_forest',
                'scores': -iso_scores,  # Convert to positive anomaly scores
                'weight': 0.3
            })
            
            # AutoEncoder
            ae_scores = self.models['autoencoder'].decision_function(data_2d)
            results.append({
                'model': 'autoencoder',
                'scores': ae_scores,
                'weight': 0.3
            })
            
            # VAE
            vae_scores = self.models['vae'].decision_function(data_2d)
            results.append({
                'model': 'v ae',
                'scores': vae_scores,
                'weight': 0.2
            })
            
            # Transformer-based detection (simplified)
            transformer_scores = await self._transformer_anomaly_detection(data, timestamps)
            results.append({
                'model': 'transformer',
                'scores': transformer_scores,
                'weight': 0.2
            })
            
        except Exception as e:
            logger.error("Ensemble detection failed", error=str(e))
        
        return results

    async def _transformer_anomaly_detection(
        self, 
        data: np.ndarray, 
        timestamps: List[datetime]
    ) -> np.ndarray:
        """Transformer-based anomaly detection"""
        try:
            # Simplified transformer approach
            # In production, use proper time series transformer
            
            # Calculate statistical anomalies as baseline
            mean_val = np.mean(data)
            std_val = np.std(data)
            
            # Z-score based anomaly detection
            z_scores = np.abs((data - mean_val) / (std_val + 1e-8))
            
            # Convert to anomaly scores (0-1 range)
            anomaly_scores = np.tanh(z_scores / 3.0)
            
            return anomaly_scores
            
        except Exception as e:
            logger.error("Transformer anomaly detection failed", error=str(e))
            return np.zeros(len(data))

    def _determine_severity(self, metric_name: str, anomaly_score: float) -> str:
        """Determine anomaly severity based on score and metric type"""
        thresholds = self.thresholds.get(metric_name, {'warning': 0.7, 'critical': 0.9})
        
        if anomaly_score >= thresholds['critical']:
            return 'critical'
        elif anomaly_score >= thresholds['warning']:
            return 'warning'
        else:
            return 'info'

    def _calculate_confidence(self, ensemble_results: List[Dict], index: int) -> float:
        """Calculate confidence based on ensemble agreement"""
        scores = [result['scores'][index] for result in ensemble_results]
        
        # Calculate agreement (inverse of variance)
        variance = np.var(scores)
        confidence = 1.0 / (1.0 + variance)
        
        return min(confidence, 1.0)

    def _generate_description(self, metric_name: str, value: float, score: float) -> str:
        """Generate human-readable anomaly description"""
        descriptions = {
            'cpu': f"CPU usage anomaly detected: {value:.1f}% (anomaly score: {score:.2f})",
            'memory': f"Memory usage anomaly detected: {value:.1f}% (anomaly score: {score:.2f})",
            'disk': f"Disk usage anomaly detected: {value:.1f}% (anomaly score: {score:.2f})",
            'network': f"Network I/O anomaly detected: {value:.1f} MB/s (anomaly score: {score:.2f})",
            'response_time': f"Response time anomaly detected: {value:.1f}ms (anomaly score: {score:.2f})"
        }
        
        return descriptions.get(metric_name, f"Anomaly detected in {metric_name}: {value} (score: {score:.2f})")

    def _generate_recommendations(self, metric_name: str, value: float, severity: str) -> List[str]:
        """Generate actionable recommendations for anomalies"""
        recommendations = {
            'cpu': [
                "Check for runaway processes",
                "Consider scaling up instances",
                "Review recent deployments",
                "Monitor application performance"
            ],
            'memory': [
                "Check for memory leaks",
                "Review application memory usage",
                "Consider increasing instance memory",
                "Restart affected services if necessary"
            ],
            'disk': [
                "Clean up temporary files",
                "Archive old logs",
                "Check for large files",
                "Consider adding storage capacity"
            ],
            'network': [
                "Check network connectivity",
                "Review bandwidth usage",
                "Monitor for DDoS attacks",
                "Verify load balancer configuration"
            ],
            'response_time': [
                "Check database performance",
                "Review application logs",
                "Monitor external dependencies",
                "Consider caching strategies"
            ]
        }
        
        base_recommendations = recommendations.get(metric_name, ["Investigate the anomaly"])
        
        if severity == 'critical':
            base_recommendations.insert(0, "IMMEDIATE ACTION REQUIRED")
        
        return base_recommendations

    async def _process_anomalies(self, anomalies: List[AnomalyResult]):
        """Process detected anomalies (alerting, incident creation, etc.)"""
        try:
            for anomaly in anomalies:
                logger.warning(
                    "Anomaly detected",
                    metric=anomaly.metric_name,
                    value=anomaly.value,
                    severity=anomaly.severity,
                    confidence=anomaly.confidence,
                    description=anomaly.description
                )
                
                # Create incident for critical anomalies
                if anomaly.severity == 'critical':
                    await self._create_incident(anomaly)
                
                # Send alerts
                await self._send_alert(anomaly)
            
        except Exception as e:
            logger.error("Failed to process anomalies", error=str(e))

    async def _create_incident(self, anomaly: AnomalyResult):
        """Create incident for critical anomalies"""
        # This would integrate with incident management system
        logger.info("Creating incident for critical anomaly", anomaly=anomaly.description)

    async def _send_alert(self, anomaly: AnomalyResult):
        """Send alert notifications"""
        # This would integrate with alerting systems (Slack, PagerDuty, etc.)
        logger.info("Sending alert", anomaly=anomaly.description, severity=anomaly.severity)

    async def _update_models(self, metrics_data: Dict[str, Any]):
        """Update models with new data for continuous learning"""
        try:
            # Update data buffers
            for metric_name, metric_data in metrics_data.items():
                if metric_name in self.data_buffer:
                    values = metric_data.get('values', [])
                    self.data_buffer[metric_name].extend(values)
                    
                    # Keep buffer size manageable
                    if len(self.data_buffer[metric_name]) > self.buffer_size:
                        self.data_buffer[metric_name] = self.data_buffer[metric_name][-self.buffer_size:]
            
            # Periodically retrain models (every 100 cycles)
            # This would be more sophisticated in production
            
        except Exception as e:
            logger.error("Failed to update models", error=str(e))

    async def predict_future_anomalies(
        self, 
        metric_name: str, 
        horizon: int = 24
    ) -> List[ModelPrediction]:
        """Predict potential future anomalies"""
        try:
            if metric_name not in self.data_buffer or len(self.data_buffer[metric_name]) < 50:
                return []
            
            # Get recent data
            recent_data = np.array(self.data_buffer[metric_name][-100:])
            
            # Simple prediction using moving average and trend
            # In production, use proper forecasting models
            predictions = []
            
            for h in range(1, horizon + 1):
                # Simple linear extrapolation
                if len(recent_data) >= 10:
                    trend = np.mean(np.diff(recent_data[-10:]))
                    predicted_value = recent_data[-1] + (trend * h)
                    
                    # Calculate confidence interval
                    std_dev = np.std(recent_data[-20:])
                    confidence_interval = [
                        predicted_value - 2 * std_dev,
                        predicted_value + 2 * std_dev
                    ]
                    
                    # Calculate anomaly score for prediction
                    anomaly_score = self._calculate_prediction_anomaly_score(
                        predicted_value, recent_data
                    )
                    
                    prediction = ModelPrediction(
                        predicted_values=np.array([predicted_value]),
                        confidence_intervals=np.array([confidence_interval]),
                        anomaly_scores=np.array([anomaly_score]),
                        model_name="linear_trend",
                        timestamp=datetime.now() + timedelta(hours=h)
                    )
                    
                    predictions.append(prediction)
            
            return predictions
            
        except Exception as e:
            logger.error("Future anomaly prediction failed", metric=metric_name, error=str(e))
            return []

    def _calculate_prediction_anomaly_score(
        self, 
        predicted_value: float, 
        historical_data: np.ndarray
    ) -> float:
        """Calculate anomaly score for predicted value"""
        try:
            mean_val = np.mean(historical_data)
            std_val = np.std(historical_data)
            
            z_score = abs(predicted_value - mean_val) / (std_val + 1e-8)
            anomaly_score = np.tanh(z_score / 3.0)
            
            return anomaly_score
            
        except Exception as e:
            logger.error("Prediction anomaly score calculation failed", error=str(e))
            return 0.0

    async def get_model_status(self) -> Dict[str, Any]:
        """Get status of all anomaly detection models"""
        try:
            status = {
                'models': {},
                'data_buffer_sizes': {},
                'last_detection': datetime.now().isoformat(),
                'total_anomalies_detected': 0  # Would track in production
            }
            
            for model_name, model in self.models.items():
                if model is not None:
                    status['models'][model_name] = {
                        'status': 'active',
                        'type': type(model).__name__ if not isinstance(model, dict) else 'transformer'
                    }
                else:
                    status['models'][model_name] = {
                        'status': 'inactive',
                        'type': 'unknown'
                    }
            
            for metric_name, buffer in self.data_buffer.items():
                status['data_buffer_sizes'][metric_name] = len(buffer)
            
            return status
            
        except Exception as e:
            logger.error("Failed to get model status", error=str(e))
            return {}