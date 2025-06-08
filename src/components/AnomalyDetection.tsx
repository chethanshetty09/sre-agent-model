import React, { useState } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

const anomalyData = [
  { time: '00:00', normal: 45, anomaly: null, predicted: 44 },
  { time: '01:00', normal: 42, anomaly: null, predicted: 43 },
  { time: '02:00', normal: 38, anomaly: null, predicted: 39 },
  { time: '03:00', normal: 35, anomaly: null, predicted: 36 },
  { time: '04:00', normal: null, anomaly: 78, predicted: 34 },
  { time: '05:00', normal: 32, anomaly: null, predicted: 33 },
  { time: '06:00', normal: 45, anomaly: null, predicted: 44 },
  { time: '07:00', normal: 52, anomaly: null, predicted: 51 },
  { time: '08:00', normal: null, anomaly: 95, predicted: 58 },
  { time: '09:00', normal: 62, anomaly: null, predicted: 61 },
];

const detectedAnomalies = [
  {
    id: 1,
    timestamp: '2024-01-15 08:15:32',
    service: 'web-server-03',
    metric: 'CPU Usage',
    value: 95.2,
    threshold: 80,
    severity: 'critical',
    confidence: 98.5,
    description: 'Unusual CPU spike detected - 95.2% vs expected 58%'
  },
  {
    id: 2,
    timestamp: '2024-01-15 04:22:18',
    service: 'database-primary',
    metric: 'Memory Usage',
    value: 78.1,
    threshold: 70,
    severity: 'warning',
    confidence: 87.3,
    description: 'Memory usage pattern anomaly - gradual increase over baseline'
  },
  {
    id: 3,
    timestamp: '2024-01-15 02:45:01',
    service: 'api-gateway',
    metric: 'Response Time',
    value: 2.4,
    threshold: 1.5,
    severity: 'warning',
    confidence: 92.1,
    description: 'Response time anomaly - 60% increase from normal pattern'
  }
];

const mlModels = [
  {
    name: 'CPU Anomaly Detector',
    type: 'Transformer-based Time Series',
    accuracy: 94.2,
    lastTrained: '2 days ago',
    status: 'active'
  },
  {
    name: 'Memory Pattern Analyzer',
    type: 'BERT-based Classification',
    accuracy: 91.8,
    lastTrained: '1 day ago',
    status: 'active'
  },
  {
    name: 'Network Traffic Predictor',
    type: 'RoBERTa Log Analysis',
    accuracy: 96.7,
    lastTrained: '6 hours ago',
    status: 'training'
  },
  {
    name: 'Failure Prediction Model',
    type: 'Multi-modal Transformer',
    accuracy: 89.4,
    lastTrained: '3 days ago',
    status: 'active'
  }
];

export default function AnomalyDetection() {
  const [selectedModel, setSelectedModel] = useState(0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      case 'info': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      default: return 'text-slate-400 bg-slate-700 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">AI Anomaly Detection</h2>
        <p className="text-slate-400">Machine learning powered anomaly detection and prediction</p>
      </div>

      {/* Detection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-slate-400">Models Active</span>
          </div>
          <p className="text-2xl font-bold mt-2">4</p>
          <p className="text-xs text-green-400 mt-1">All operational</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-sm text-slate-400">Anomalies (24h)</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-red-400">3</p>
          <p className="text-xs text-red-400 mt-1">1 critical, 2 warnings</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-400" />
            <span className="text-sm text-slate-400">Avg Confidence</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">93.2%</p>
          <p className="text-xs text-green-400 mt-1">High accuracy</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-slate-400">Predictions</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-400">12</p>
          <p className="text-xs text-blue-400 mt-1">Next 6 hours</p>
        </div>
      </div>

      {/* Anomaly Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Real-time Anomaly Detection</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={anomalyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Line 
                  type="monotone" 
                  dataKey="normal" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="anomaly" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{ fill: '#EF4444', r: 5 }}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#3B82F6" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Anomaly</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Predicted</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">ML Model Performance</h3>
          <div className="space-y-4">
            {mlModels.map((model, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedModel === index 
                    ? 'bg-blue-900/20 border-blue-700' 
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                }`}
                onClick={() => setSelectedModel(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{model.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    model.status === 'active' ? 'bg-green-600 text-green-100' :
                    model.status === 'training' ? 'bg-yellow-600 text-yellow-100' :
                    'bg-slate-600 text-slate-100'
                  }`}>
                    {model.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-2">{model.type}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>Accuracy: <span className="text-green-400">{model.accuracy}%</span></span>
                  <span className="text-slate-400">Trained {model.lastTrained}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detected Anomalies */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Recent Anomalies</h3>
        <div className="space-y-3">
          {detectedAnomalies.map((anomaly) => (
            <div key={anomaly.id} className={`p-4 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    anomaly.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div>
                    <p className="font-medium">{anomaly.service} - {anomaly.metric}</p>
                    <p className="text-sm text-slate-400">{anomaly.timestamp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{anomaly.value}{anomaly.metric.includes('Time') ? 's' : '%'}</p>
                  <p className="text-xs text-slate-400">Confidence: {anomaly.confidence}%</p>
                </div>
              </div>
              <p className="text-sm">{anomaly.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-400">
                  Threshold: {anomaly.threshold}{anomaly.metric.includes('Time') ? 's' : '%'}
                </span>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                    Investigate
                  </button>
                  <button className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded transition-colors">
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}