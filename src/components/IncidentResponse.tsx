import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User, 
  MessageCircle, 
  Play,
  Pause,
  RotateCcw,
  Zap,
  Users,
  FileText,
  Activity
} from 'lucide-react';

const incidents = [
  {
    id: 'INC-2024-001',
    title: 'Database Connection Pool Exhaustion',
    severity: 'critical',
    status: 'active',
    assignee: 'Sarah Chen',
    created: '2024-01-15 14:32:18',
    updated: '2024-01-15 14:45:12',
    description: 'Multiple services reporting database connection timeouts',
    affectedServices: ['api-gateway', 'user-service', 'payment-service'],
    runbook: 'DB_CONNECTION_ISSUES',
    automationStatus: 'running'
  },
  {
    id: 'INC-2024-002',
    title: 'High Memory Usage on Web Servers',
    severity: 'warning',
    status: 'investigating',
    assignee: 'Mike Rodriguez',
    created: '2024-01-15 13:15:44',
    updated: '2024-01-15 14:20:31',
    description: 'Memory usage consistently above 85% on web-server-01 through 03',
    affectedServices: ['web-server-01', 'web-server-02', 'web-server-03'],
    runbook: 'HIGH_MEMORY_USAGE',
    automationStatus: 'completed'
  },
  {
    id: 'INC-2024-003',
    title: 'SSL Certificate Expiring Soon',
    severity: 'info',
    status: 'resolved',
    assignee: 'Alex Thompson',
    created: '2024-01-15 09:22:15',
    updated: '2024-01-15 11:45:22',
    description: 'SSL certificate for api.example.com expires in 7 days',
    affectedServices: ['api-gateway'],
    runbook: 'SSL_RENEWAL',
    automationStatus: 'completed'
  }
];

const automationPlaybooks = [
  {
    id: 'DB_CONNECTION_ISSUES',
    name: 'Database Connection Issues',
    steps: [
      'Check connection pool metrics',
      'Restart connection pooler',
      'Scale database read replicas',
      'Alert database team if issue persists'
    ],
    estimatedTime: '5-10 minutes',
    successRate: 87
  },
  {
    id: 'HIGH_MEMORY_USAGE',
    name: 'High Memory Usage Remediation',
    steps: [
      'Identify memory-consuming processes',
      'Restart affected services',
      'Scale up instances if needed',
      'Enable memory monitoring alerts'
    ],
    estimatedTime: '3-7 minutes',
    successRate: 92
  },
  {
    id: 'SSL_RENEWAL',
    name: 'SSL Certificate Renewal',
    steps: [
      'Generate new certificate',
      'Update load balancer configuration',
      'Verify certificate installation',
      'Update monitoring for new expiry date'
    ],
    estimatedTime: '2-5 minutes',
    successRate: 98
  }
];

export default function IncidentResponse() {
  const [selectedIncident, setSelectedIncident] = useState(incidents[0]);
  const [activeTab, setActiveTab] = useState('details');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      case 'info': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      default: return 'text-slate-400 bg-slate-700 border-slate-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400 bg-red-900/20';
      case 'investigating': return 'text-yellow-400 bg-yellow-900/20';
      case 'resolved': return 'text-green-400 bg-green-900/20';
      default: return 'text-slate-400 bg-slate-700';
    }
  };

  const getAutomationStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400 bg-blue-900/20';
      case 'completed': return 'text-green-400 bg-green-900/20';
      case 'failed': return 'text-red-400 bg-red-900/20';
      default: return 'text-slate-400 bg-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Incident Response</h2>
        <p className="text-slate-400">Automated incident management and response workflows</p>
      </div>

      {/* Incident Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-sm text-slate-400">Active Incidents</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-red-400">1</p>
          <p className="text-xs text-red-400 mt-1">Critical priority</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <span className="text-sm text-slate-400">Investigating</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-400">1</p>
          <p className="text-xs text-yellow-400 mt-1">In progress</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-slate-400">Automated</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-400">2</p>
          <p className="text-xs text-blue-400 mt-1">Actions running</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-sm text-slate-400">Resolved (24h)</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">3</p>
          <p className="text-xs text-green-400 mt-1">Average: 12m</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents List */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Recent Incidents</h3>
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div 
                key={incident.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedIncident.id === incident.id 
                    ? 'bg-blue-900/20 border-blue-700' 
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                }`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{incident.id}</p>
                    <p className="text-xs text-slate-400 mt-1">{incident.title}</p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>@{incident.assignee.split(' ')[0].toLowerCase()}</span>
                  <span>{new Date(incident.updated).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Details */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{selectedIncident.id}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab === 'details' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('automation')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab === 'automation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Automation
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Timeline
              </button>
            </div>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{selectedIncident.title}</h4>
                <p className="text-sm text-slate-400 mb-4">{selectedIncident.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Severity</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Status</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedIncident.status)}`}>
                      {selectedIncident.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Assignee</p>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{selectedIncident.assignee}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Automation</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${getAutomationStatusColor(selectedIncident.automationStatus)}`}>
                      {selectedIncident.automationStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Affected Services</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncident.affectedServices.map((service, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-slate-700 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-4">
              {(() => {
                const playbook = automationPlaybooks.find(p => p.id === selectedIncident.runbook);
                return playbook ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{playbook.name}</h4>
                      <div className="flex space-x-2">
                        <button className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                          <Play className="h-3 w-3" />
                          <span>Run</span>
                        </button>
                        <button className="flex items-center space-x-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-sm transition-colors">
                          <Pause className="h-3 w-3" />
                          <span>Pause</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-slate-700 p-4 rounded-lg mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Estimated Time: {playbook.estimatedTime}</span>
                        <span>Success Rate: {playbook.successRate}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-400 mb-2">Automation Steps:</p>
                      {playbook.steps.map((step, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-slate-700 rounded">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-400'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm">{step}</span>
                          {index === 0 && (
                            <div className="ml-auto">
                              <Activity className="h-4 w-4 text-blue-400 animate-pulse" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No automation playbook available</p>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Incident Created</p>
                    <p className="text-xs text-slate-400">{selectedIncident.created}</p>
                    <p className="text-xs text-slate-300 mt-1">Automatic detection triggered by anomaly model</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Automation Started</p>
                    <p className="text-xs text-slate-400">{selectedIncident.created}</p>
                    <p className="text-xs text-slate-300 mt-1">Running playbook: {selectedIncident.runbook}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Assignee Notified</p>
                    <p className="text-xs text-slate-400">{selectedIncident.updated}</p>
                    <p className="text-xs text-slate-300 mt-1">Alert sent to {selectedIncident.assignee}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}