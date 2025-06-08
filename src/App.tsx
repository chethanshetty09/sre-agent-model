import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Brain, 
  Cloud, 
  Cpu, 
  Database, 
  GitBranch, 
  Home, 
  Shield, 
  Settings as SettingsIcon, 
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Users
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import InfrastructureAnalysis from './components/InfrastructureAnalysis';
import AnomalyDetection from './components/AnomalyDetection';
import IncidentResponse from './components/IncidentResponse';
import MetricsMonitoring from './components/MetricsMonitoring';
import Settings from './components/Settings';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'infrastructure', label: 'Infrastructure', icon: Cloud },
  { id: 'anomaly', label: 'Anomaly Detection', icon: Brain },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState({
    overall: 'healthy',
    services: 12,
    alerts: 3,
    uptime: 99.97
  });

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard systemStatus={systemStatus} />;
      case 'infrastructure':
        return <InfrastructureAnalysis />;
      case 'anomaly':
        return <AnomalyDetection />;
      case 'incidents':
        return <IncidentResponse />;
      case 'metrics':
        return <MetricsMonitoring />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard systemStatus={systemStatus} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SRE Agent</h1>
              <p className="text-sm text-slate-400">Intelligent Site Reliability Engineering</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-700 px-3 py-2 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.overall === 'healthy' ? 'bg-green-500' :
                systemStatus.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm capitalize">{systemStatus.overall}</span>
            </div>
            <div className="text-sm text-slate-400">
              {systemStatus.uptime}% uptime
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-slate-800 min-h-screen border-r border-slate-700">
          <div className="p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveView(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeView === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;