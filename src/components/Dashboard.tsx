import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  TrendingUp,
  Zap,
  Cloud,
  Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';

const mockMetricsData = [
  { time: '00:00', cpu: 45, memory: 62, requests: 1200 },
  { time: '04:00', cpu: 52, memory: 58, requests: 980 },
  { time: '08:00', cpu: 78, memory: 71, requests: 2100 },
  { time: '12:00', cpu: 65, memory: 69, requests: 1800 },
  { time: '16:00', cpu: 82, memory: 75, requests: 2400 },
  { time: '20:00', cpu: 59, memory: 64, requests: 1600 },
];

const recentIncidents = [
  { id: 1, title: 'High CPU usage on web-server-03', severity: 'warning', time: '2 hours ago', status: 'resolved' },
  { id: 2, title: 'Database connection timeout', severity: 'critical', time: '4 hours ago', status: 'investigating' },
  { id: 3, title: 'Memory leak detected in api-service', severity: 'warning', time: '6 hours ago', status: 'resolved' },
];

const systemMetrics = [
  { label: 'CPU Usage', value: '67%', status: 'normal', icon: Cpu, color: 'text-blue-400' },
  { label: 'Memory Usage', value: '72%', status: 'warning', icon: Activity, color: 'text-yellow-400' },
  { label: 'Active Connections', value: '1,247', status: 'normal', icon: Users, color: 'text-green-400' },
  { label: 'Response Time', value: '145ms', status: 'normal', icon: Zap, color: 'text-purple-400' },
];

interface DashboardProps {
  systemStatus: {
    overall: string;
    services: number;
    alerts: number;
    uptime: number;
  };
}

export default function Dashboard({ systemStatus }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">System Overview</h2>
        <p className="text-slate-400">Real-time monitoring and AI-powered insights</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Services</p>
              <p className="text-2xl font-bold">{systemStatus.services}</p>
            </div>
            <Cloud className="h-8 w-8 text-blue-400" />
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-sm text-green-400">All operational</span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Alerts</p>
              <p className="text-2xl font-bold">{systemStatus.alerts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
          <div className="mt-4 flex items-center">
            <Clock className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-sm text-yellow-400">2 require attention</span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Uptime</p>
              <p className="text-2xl font-bold">{systemStatus.uptime}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-sm text-green-400">99.97% this month</span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">ML Predictions</p>
              <p className="text-2xl font-bold">4</p>
            </div>
            <Database className="h-8 w-8 text-purple-400" />
          </div>
          <div className="mt-4 flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-sm text-yellow-400">Potential issues</span>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">System Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockMetricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Area type="monotone" dataKey="cpu" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="memory" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="space-y-4">
            {systemMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{metric.value}</div>
                    <div className={`text-xs ${
                      metric.status === 'normal' ? 'text-green-400' :
                      metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {metric.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Recent Incidents</h3>
        <div className="space-y-3">
          {recentIncidents.map((incident) => (
            <div key={incident.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  incident.severity === 'critical' ? 'bg-red-500' :
                  incident.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <p className="font-medium">{incident.title}</p>
                  <p className="text-sm text-slate-400">{incident.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  incident.status === 'resolved' ? 'bg-green-600 text-green-100' :
                  incident.status === 'investigating' ? 'bg-yellow-600 text-yellow-100' :
                  'bg-red-600 text-red-100'
                }`}>
                  {incident.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}