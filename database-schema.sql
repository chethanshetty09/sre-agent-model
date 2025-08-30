-- SRE Agent Database Schema
-- PostgreSQL 14.9+

-- Create database (run this separately)
-- CREATE DATABASE sreagent;

-- Create tables
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    assigned_to VARCHAR(100),
    tags JSONB,
    metadata JSONB
);

CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100),
    tags JSONB,
    unit VARCHAR(20),
    description TEXT
);

CREATE TABLE anomalies (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    anomaly_score FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    description TEXT,
    recommendations JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    incident_id INTEGER REFERENCES incidents(id),
    metadata JSONB
);

CREATE TABLE infrastructure_configs (
    id SERIAL PRIMARY KEY,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('terraform', 'cloudformation', 'kubernetes', 'docker', 'other')),
    config_name VARCHAR(255) NOT NULL,
    config_content TEXT NOT NULL,
    risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 10),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags JSONB
);

CREATE TABLE model_performance (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    accuracy FLOAT CHECK (accuracy >= 0 AND accuracy <= 1),
    precision FLOAT CHECK (precision >= 0 AND precision <= 1),
    recall FLOAT CHECK (recall >= 0 AND recall <= 1),
    f1_score FLOAT CHECK (f1_score >= 0 AND f1_score <= 1),
    training_date TIMESTAMP,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50),
    metadata JSONB
);

CREATE TABLE alert_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('threshold', 'anomaly', 'trend', 'custom')),
    metric_name VARCHAR(100),
    threshold_value FLOAT,
    operator VARCHAR(10) CHECK (operator IN ('>', '<', '>=', '<=', '==', '!=')),
    time_window INTERVAL,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    enabled BOOLEAN DEFAULT true,
    notification_channels JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    alert_rule_id INTEGER REFERENCES alert_rules(id),
    incident_id INTEGER REFERENCES incidents(id),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'slack', 'teams', 'sns', 'webhook')),
    recipient VARCHAR(255),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    retry_count INTEGER DEFAULT 0,
    metadata JSONB
);

CREATE TABLE system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);

CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX idx_metrics_name ON metrics(metric_name);
CREATE INDEX idx_metrics_source ON metrics(source);
CREATE INDEX idx_metrics_timestamp_name ON metrics(timestamp, metric_name);

CREATE INDEX idx_anomalies_detected_at ON anomalies(detected_at);
CREATE INDEX idx_anomalies_metric_name ON anomalies(metric_name);
CREATE INDEX idx_anomalies_severity ON anomalies(severity);
CREATE INDEX idx_anomalies_status ON anomalies(status);

CREATE INDEX idx_infrastructure_configs_type ON infrastructure_configs(config_type);
CREATE INDEX idx_infrastructure_configs_risk_level ON infrastructure_configs(risk_level);
CREATE INDEX idx_infrastructure_configs_created_at ON infrastructure_configs(created_at);

CREATE INDEX idx_model_performance_model_name ON model_performance(model_name);
CREATE INDEX idx_model_performance_evaluation_date ON model_performance(evaluation_date);

CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_metric_name ON alert_rules(metric_name);

CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);

CREATE INDEX idx_system_health_component ON system_health(component);
CREATE INDEX idx_system_health_status ON system_health(status);
CREATE INDEX idx_system_health_last_check ON system_health(last_check);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_infrastructure_configs_updated_at BEFORE UPDATE ON infrastructure_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate risk score based on config analysis
CREATE OR REPLACE FUNCTION calculate_risk_score(
    config_content TEXT,
    config_type VARCHAR(50)
) RETURNS FLOAT AS $$
DECLARE
    risk_score FLOAT := 0.0;
BEGIN
    -- Basic risk scoring logic
    -- This can be enhanced with more sophisticated analysis
    
    -- Check for common security issues
    IF config_content ILIKE '%0.0.0.0/0%' THEN
        risk_score := risk_score + 3.0; -- Open to all IPs
    END IF;
    
    IF config_content ILIKE '%password%' AND config_content ILIKE '%plaintext%' THEN
        risk_score := risk_score + 2.5; -- Plaintext passwords
    END IF;
    
    IF config_content ILIKE '%admin%' AND config_content ILIKE '%root%' THEN
        risk_score := risk_score + 2.0; -- Admin/root access
    END IF;
    
    -- Normalize risk score to 0-10 scale
    risk_score := LEAST(risk_score, 10.0);
    
    RETURN risk_score;
END;
$$ LANGUAGE plpgsql;

-- Create view for recent anomalies with incident information
CREATE VIEW recent_anomalies_view AS
SELECT 
    a.id,
    a.metric_name,
    a.anomaly_score,
    a.confidence,
    a.description,
    a.severity,
    a.detected_at,
    a.status,
    i.title as incident_title,
    i.status as incident_status
FROM anomalies a
LEFT JOIN incidents i ON a.incident_id = i.id
WHERE a.detected_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY a.detected_at DESC;

-- Create view for system health summary
CREATE VIEW system_health_summary AS
SELECT 
    component,
    status,
    COUNT(*) as count,
    AVG(response_time_ms) as avg_response_time,
    MAX(last_check) as last_check
FROM system_health
GROUP BY component, status;

-- Insert sample data for testing
INSERT INTO alert_rules (rule_name, rule_type, metric_name, threshold_value, operator, time_window, severity) VALUES
('High CPU Usage', 'threshold', 'cpu_utilization', 90.0, '>', '5 minutes', 'high'),
('Memory Usage Alert', 'threshold', 'memory_utilization', 85.0, '>', '10 minutes', 'medium'),
('Disk Space Warning', 'threshold', 'disk_usage', 80.0, '>', '15 minutes', 'medium');

INSERT INTO system_health (component, status, response_time_ms) VALUES
('API Gateway', 'healthy', 45),
('Database', 'healthy', 12),
('ML Model Service', 'healthy', 78),
('Monitoring Service', 'healthy', 23);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sreagent;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sreagent;
