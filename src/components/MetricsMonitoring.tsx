import React, { useState } from 'react';
import { 
  BarChart3, 
  Activity, 
  Cpu, 
  Database, 
  Network, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Monitor,
  Zap,
  HardDrive,
  Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

const timeRanges = ['1h', '6h', '24h', '7d', '30d'];

const metricsData = {
  '1h': [
    { time: '14:00', cpu: 45, memory: 62, disk: 34, network: 23 },
    { time: '14:10', cpu: 52, memory: 58, disk: 34, network: 28 },
    { time: '14:20', cpu: 48, memory: 64, disk: 35, network: 25 },
    { time: '14:30', cpu: 55, memory: 67, disk: 35, network: 31 },
    { time: '14:40', cpu: 61, memory: 69, disk: 36, network: 34 },
    { time: '14:50', cpu: 58, memory: 65, disk: 36, network: 29 },
  ],
  '6h': [
    { time: '09:00', cpu: 42, memory: 58, disk: 32, network: 20 },
    { time: '10:00', cpu: 48, memory: 62, disk: 33, network: 25 },
    { time: '11:00', cpu: 55, memory: 66, disk: 34, network: 30 },
    { time: '12:00', cpu: 62, memory: 71, disk: 35, network: 35 },
    { time: '13:00', cpu: 58, memory: 68, disk: 36, network: 32 },
    { time: '14:00', cpu: 54, memory: 64, disk: 36, network: 28 },
  ],
};

const systemMetrics = [
  {
    name: 'CPU Usage',
    value: 67,
    unit: '%',
    trend: 'up',
    change: '+5.2%',
    icon: Cpu,
    color: 'text-blue-400',
    threshold: 80
  },
  {
    name: 'Memory Usage',
    value: 72,
    unit: '%',
    trend: 'up',
    change: '+2.1%',
    icon: Activity,
    color: 'text-green-400',
    threshold: 85
  },
  {
    name: 'Disk Usage',
    value: 45,
    unit: '%',
    trend: 'down',
    change: '-1.3%',
    icon: HardDrive,
    color: 'text-purple-400',
    threshold: 90
  },
  {
    name: 'Network I/O',
    value: 234,
    unit: 'MB/s',
    trend: 'up',
    change: '+12.4%',
    icon: Network,
    color: 'text-yellow-400',
    threshold: 500
  },
  {
    name: 'Response Time',
    value: 145,
    unit: 'ms',
    trend: 'down',
    change: '-8.7%',
    icon: Zap,
    color: 'text-pink-400',
    threshold: 300
  },
  {
    name: 'Active Users',
    value: 1247,
    unit: '',
    trend: 'up',
    change: '+15.2%',
    icon: Users,
    color: 'text-cyan-400',
    threshold: 2000
  }
];

const serviceMetrics = [
  { name: 'api-gateway', requests: 2340, errors: 12, latency: 145 },
  { name: 'user-service', requests: 1890, errors: 5, latency: 89 },
  { name: 'payment-service', requests: 756, errors: 3, latency: 234 },
  { name: 'notification-service', requests: 445, errors: 1, latency: 67 },
];

export default function MetricsMonitoring() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedMetric, setSelectedMetric] = useState('cpu');

  const currentData = metricsData[selectedTimeRange] || metricsData['1h'];

  const getMetricColor = (value: number, threshold: number) => {
    if (value >= threshold * 0.9) return 'text-red-400';
    if (value >= threshold * 0.7) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Metrics Monitoring</h2>
          <p className="text-slate-400">Real-time system performance and infrastructure metrics</p>
        </div>
        <div className="flex space-x-2">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <div key={index} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendIcon className={`h-4 w-4 ${
                    metric.trend === 'up' ? 'text-red-400' : 'text-green-400'
                  }`} />
                  <span className={`text-xs ${
                    metric.trend === 'up' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-2xl font-bold ${getMetricColor(metric.value, metric.threshold)}`}>
                    {metric.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">{metric.unit}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-slate-400">Threshold</p>
                  <p className="text-sm">{metric.threshold.toLocaleString()}{metric.unit}</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metric.value >= metric.threshold * 0.9 ? 'bg-red-500' :
                      metric.value >= metric.threshold * 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((metric.value / metric.threshold) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">System Performance</h3>
            <div className="flex space-x-2">
              {['cpu', 'memory', 'disk', 'network'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
                    selectedMetric === metric
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {metric}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Performance */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Service Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Bar dataKey="requests" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Service Details Table */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Service Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Service</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Requests/min</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Errors</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Avg Latency</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {serviceMetrics.map((service, index) => (
                <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">{service.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-green-400">{service.requests.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`${service.errors > 10 ? 'text-red-400' : service.errors > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {service.errors}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`${service.latency > 200 ? 'text-red-400' : service.latency > 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {service.latency}ms
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.errors < 5 && service.latency < 150 
                        ? 'bg-green-600 text-green-100' 
                        : service.errors < 10 && service.latency < 250
                        ? 'bg-yellow-600 text-yellow-100'
                        : 'bg-red-600 text-red-100'
                    }`}>
                      {service.errors < 5 && service.latency < 150 ? 'Healthy' : 
                       service.errors < 10 && service.latency < 250 ? 'Warning' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}