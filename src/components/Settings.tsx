import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Cloud, 
  Cpu, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Key,
  Monitor,
  BarChart3
} from 'lucide-react';

const integrationServices = [
  { name: 'AWS CloudWatch', status: 'connected', icon: Cloud, color: 'text-orange-400' },
  { name: 'Prometheus', status: 'connected', icon: Monitor, color: 'text-red-400' },
  { name: 'Grafana', status: 'connected', icon: BarChart3, color: 'text-blue-400' },
  { name: 'PagerDuty', status: 'disconnected', icon: Bell, color: 'text-green-400' },
  { name: 'Slack', status: 'connected', icon: Bell, color: 'text-purple-400' },
  { name: 'Supabase', status: 'connected', icon: Database, color: 'text-green-400' },
];

const mlModelSettings = [
  {
    name: 'CPU Anomaly Detector',
    type: 'Transformer-based Time Series',
    status: 'active',
    lastTrained: '2 days ago',
    accuracy: 94.2,
    threshold: 0.85
  },
  {
    name: 'Memory Pattern Analyzer',
    type: 'BERT-based Classification',
    status: 'active',
    lastTrained: '1 day ago',
    accuracy: 91.8,
    threshold: 0.80
  },
  {
    name: 'Network Traffic Predictor',
    type: 'RoBERTa Log Analysis',
    status: 'training',
    lastTrained: '6 hours ago',
    accuracy: 96.7,
    threshold: 0.90
  }
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [notifications, setNotifications] = useState({
    email: true,
    slack: true,
    sms: false,
    webhook: true
  });

  const [thresholds, setThresholds] = useState({
    cpu: 80,
    memory: 85,
    disk: 90,
    responseTime: 300
  });

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Cloud },
    { id: 'models', label: 'ML Models', icon: Cpu },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleThresholdChange = (metric: string, value: number) => {
    setThresholds(prev => ({ ...prev, [metric]: value }));
  };

  const handleNotificationChange = (type: string, enabled: boolean) => {
    setNotifications(prev => ({ ...prev, [type]: enabled }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-slate-400">Configure SRE Agent settings and integrations</p>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800 rounded-xl border border-slate-700 p-4 mr-6">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">General Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">System Name</label>
                  <input
                    type="text"
                    defaultValue="SRE Agent Production"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Monitoring Interval</label>
                  <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500">
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="300">5 minutes</option>
                    <option value="900">15 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data Retention Period</label>
                  <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500">
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Alert Thresholds</h4>
                  {Object.entries(thresholds).map(([metric, value]) => (
                    <div key={metric} className="flex items-center justify-between">
                      <label className="text-sm capitalize">{metric.replace(/([A-Z])/g, ' $1')}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={value}
                          onChange={(e) => handleThresholdChange(metric, parseInt(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm w-12">{value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Notification Settings</h3>
              
              <div className="space-y-4">
                {Object.entries(notifications).map(([type, enabled]) => (
                  <div key={type} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{type} Notifications</p>
                      <p className="text-sm text-slate-400">
                        Receive alerts via {type === 'webhook' ? 'webhook' : type}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handleNotificationChange(type, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-4">Notification Channels</h4>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <label className="block text-sm font-medium mb-2">Email Recipients</label>
                    <input
                      type="text"
                      placeholder="admin@company.com, sre@company.com"
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <label className="block text-sm font-medium mb-2">Slack Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Service Integrations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationServices.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <div key={index} className="p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Icon className={`h-6 w-6 ${service.color}`} />
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          service.status === 'connected' 
                            ? 'bg-green-600 text-green-100' 
                            : 'bg-red-600 text-red-100'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        {service.status === 'connected' ? (
                          <>
                            <button className="flex-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm transition-colors">
                              Configure
                            </button>
                            <button className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors">
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">ML Model Configuration</h3>
              
              <div className="space-y-4">
                {mlModelSettings.map((model, index) => (
                  <div key={index} className="p-4 bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{model.name}</h4>
                        <p className="text-sm text-slate-400">{model.type}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        model.status === 'active' 
                          ? 'bg-green-600 text-green-100' 
                          : model.status === 'training'
                          ? 'bg-yellow-600 text-yellow-100'
                          : 'bg-red-600 text-red-100'
                      }`}>
                        {model.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-slate-400">Accuracy:</span>
                        <span className="ml-2 text-green-400">{model.accuracy}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Threshold:</span>
                        <span className="ml-2">{model.threshold}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Last Trained:</span>
                        <span className="ml-2">{model.lastTrained}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                        <RefreshCw className="h-3 w-3" />
                        <span>Retrain</span>
                      </button>
                      <button className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm transition-colors">
                        Configure
                      </button>
                      {model.status === 'active' && (
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors">
                          Disable
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-700 rounded-lg">
                  <h4 className="font-medium mb-3">API Access</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">API Key</label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          value="sk-proj-1234567890abcdef"
                          readOnly
                          className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded focus:outline-none"
                        />
                        <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                          Regenerate
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Allowed IP Addresses</label>
                      <textarea
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded focus:outline-none focus:border-blue-500"
                        rows={3}
                        placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-700 rounded-lg">
                  <h4 className="font-medium mb-3">Authentication</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Two-Factor Authentication</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Session Timeout (minutes)</span>
                      <input
                        type="number"
                        defaultValue="30"
                        className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-slate-700">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}