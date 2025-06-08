import React, { useState } from 'react';
import { 
  Cloud, 
  Server, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Monitor,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';

const infrastructureItems = [
  {
    id: 1,
    name: 'web-server-01',
    type: 'EC2 Instance',
    status: 'healthy',
    cpu: 45,
    memory: 67,
    disk: 34,
    region: 'us-east-1',
    recommendations: ['Optimize memory usage', 'Consider auto-scaling']
  },
  {
    id: 2,
    name: 'database-primary',
    type: 'RDS MySQL',
    status: 'warning',
    cpu: 78,
    memory: 89,
    disk: 67,
    region: 'us-east-1',
    recommendations: ['High CPU usage detected', 'Scale up instance', 'Optimize queries']
  },
  {
    id: 3,
    name: 'load-balancer',
    type: 'Application LB',
    status: 'healthy',
    cpu: 23,
    memory: 45,
    disk: 12,
    region: 'us-east-1',
    recommendations: ['Performance is optimal']
  },
  {
    id: 4,
    name: 'cache-cluster',
    type: 'ElastiCache Redis',
    status: 'critical',
    cpu: 92,
    memory: 95,
    disk: 78,
    region: 'us-east-1',
    recommendations: ['Immediate attention required', 'Memory limit reached', 'Add more nodes']
  }
];

const configurationAnalysis = {
  totalConfigs: 47,
  issues: 12,
  warnings: 8,
  recommendations: 23,
  lastScan: '15 minutes ago'
};

export default function InfrastructureAnalysis() {
  const [selectedItem, setSelectedItem] = useState(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-900/20';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20';
      case 'critical': return 'text-red-400 bg-red-900/20';
      default: return 'text-slate-400 bg-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': case 'critical': return AlertTriangle;
      default: return Monitor;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Infrastructure Analysis</h2>
        <p className="text-slate-400">AI-powered configuration analysis and recommendations</p>
      </div>

      {/* Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-slate-400">Total Configs</span>
          </div>
          <p className="text-2xl font-bold mt-2">{configurationAnalysis.totalConfigs}</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-sm text-slate-400">Issues</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-red-400">{configurationAnalysis.issues}</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <span className="text-sm text-slate-400">Warnings</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-400">{configurationAnalysis.warnings}</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-sm text-slate-400">Recommendations</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{configurationAnalysis.recommendations}</p>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-slate-400">Last Scan</span>
          </div>
          <p className="text-sm font-medium mt-2">{configurationAnalysis.lastScan}</p>
        </div>
      </div>

      {/* Infrastructure Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Infrastructure Components</h3>
          <div className="space-y-3">
            {infrastructureItems.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              return (
                <div 
                  key={item.id}
                  className="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={`h-5 w-5 ${
                        item.status === 'healthy' ? 'text-green-400' :
                        item.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                      }`} />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-slate-400">{item.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Cpu className="h-3 w-3" />
                        <span className="text-slate-400">CPU</span>
                      </div>
                      <div className={`font-medium ${item.cpu > 80 ? 'text-red-400' : item.cpu > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {item.cpu}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Monitor className="h-3 w-3" />
                        <span className="text-slate-400">Memory</span>
                      </div>
                      <div className={`font-medium ${item.memory > 80 ? 'text-red-400' : item.memory > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {item.memory}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <HardDrive className="h-3 w-3" />
                        <span className="text-slate-400">Disk</span>
                      </div>
                      <div className={`font-medium ${item.disk > 80 ? 'text-red-400' : item.disk > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {item.disk}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
          {selectedItem ? (
            <div>
              <div className="mb-4 p-3 bg-slate-700 rounded-lg">
                <h4 className="font-medium mb-1">{selectedItem.name}</h4>
                <p className="text-sm text-slate-400">{selectedItem.type} • {selectedItem.region}</p>
              </div>
              <div className="space-y-3">
                {selectedItem.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select an infrastructure component to view AI recommendations</p>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Analysis */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Configuration Analysis Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 text-red-400">Critical Issues Found</h4>
            <div className="space-y-2">
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-sm font-medium">Security Group Misconfiguration</p>
                <p className="text-xs text-slate-400 mt-1">Port 22 open to 0.0.0.0/0 on web-server-01</p>
              </div>
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-sm font-medium">Database Backup Missing</p>
                <p className="text-xs text-slate-400 mt-1">No automated backups configured for database-primary</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3 text-yellow-400">Optimization Opportunities</h4>
            <div className="space-y-2">
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-sm font-medium">Cost Optimization</p>
                <p className="text-xs text-slate-400 mt-1">Consider Reserved Instances for consistent workloads</p>
              </div>
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-sm font-medium">Performance Tuning</p>
                <p className="text-xs text-slate-400 mt-1">Enable CloudFront for static content delivery</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}