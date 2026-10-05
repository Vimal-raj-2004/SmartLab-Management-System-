import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { 
  Activity, Monitor, AlertTriangle, CheckCircle, 
  XCircle, RefreshCw, Cpu, HardDrive, Server, ShieldAlert 
} from 'lucide-react';

const MetricBar = ({ value }) => {
  let color = 'bg-emerald-500';
  if (value >= 85) color = 'bg-rose-500';
  else if (value >= 60) color = 'bg-amber-500';

  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
      <div 
        className={`${color} h-1.5 rounded-full transition-all duration-300`} 
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} 
      />
    </div>
  );
};

export default function PCHealth() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const response = await api.get('/pc-health/latest');
      setHealthData(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to fetch PC health data. Ensure backend is running.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getRelativeTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      const now = new Date();
      const diffInMinutes = Math.round((date - now) / (1000 * 60));
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

      if (Math.abs(diffInMinutes) < 1) return 'Just now';
      if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute');
      
      const diffInHours = Math.round(diffInMinutes / 60);
      if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour');
      
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getHealthBadge = (prediction) => {
    const status = prediction?.toLowerCase();
    if (status === 'healthy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Healthy
        </span>
      );
    } else if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Warning
        </span>
      );
    } else if (status === 'critical') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          Critical
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
        Unknown
      </span>
    );
  };

  const filteredData = healthData.filter(pc => 
    filterStatus === 'All' ? true : pc.health_prediction?.toLowerCase() === filterStatus.toLowerCase()
  );

  const stats = {
    total: healthData.length,
    healthy: healthData.filter(pc => pc.health_prediction?.toLowerCase() === 'healthy').length,
    warning: healthData.filter(pc => pc.health_prediction?.toLowerCase() === 'warning').length,
    critical: healthData.filter(pc => pc.health_prediction?.toLowerCase() === 'critical').length,
  };

  if (loading && healthData.length === 0) {
    return <LoadingState message="Loading AI PC Health monitoring data..." />;
  }
  
  if (error && healthData.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchData(true)} />;
  }

  // ─────────────────────────────────────────────────────────────
  // Simplified Student View
  // ─────────────────────────────────────────────────────────────
  if (user?.role === 'student') {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="PC Health Status" 
          subtitle="Real-time status of laboratory workstations"
        />

        {healthData.length === 0 ? (
          <EmptyState 
            title="No PC telemetry found" 
            message="The PC monitoring agent has not reported telemetry yet. Check back soon." 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData.map(pc => {
              const pred = pc.health_prediction?.toLowerCase();
              let cardStyle = 'border-slate-800 bg-slate-900/60 text-slate-300';
              let icon = '⚪';
              let statusLabel = 'PC Status: Unknown';
              let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';

              if (pred === 'healthy') {
                cardStyle = 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200';
                icon = '🟢';
                statusLabel = 'PC Status: Working Normally';
                badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              } else if (pred === 'warning') {
                cardStyle = 'border-amber-500/30 bg-amber-950/20 text-amber-200';
                icon = '🟡';
                statusLabel = 'PC Status: Performance Issue Detected';
                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              } else if (pred === 'critical') {
                cardStyle = 'border-rose-500/30 bg-rose-950/20 text-rose-200';
                icon = '🔴';
                statusLabel = 'PC Status: Critical Issue Detected';
                badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              }

              return (
                <div 
                  key={pc.pc_id} 
                  className={`p-5 rounded-2xl border ${cardStyle} backdrop-blur-sm shadow-xl flex items-start gap-4 transition-all`}
                >
                  <div className="text-3xl select-none mt-1">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-indigo-400" />
                        {pc.pc_id}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>
                        {pc.health_prediction}
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-1">{statusLabel}</p>
                    {pred !== 'healthy' && (
                      <p className="text-xs text-amber-300/80 mb-2">
                        Please contact Lab Assistant if performance degrades.
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      Last telemetry report: {getRelativeTime(pc.recorded_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p>
            AI PC Health predictions reflect simulated performance metrics analysis (CPU, RAM, Disk, System Errors). 
            The AI does not diagnose physical hardware failures. For hardware repairs or equipment issues, notify your laboratory assistant.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Admin / Faculty / Lab Assistant View
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="AI PC Health Monitoring" 
          subtitle="Real-time telemetry and Random Forest predictive health assessment"
        />
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Monitored</p>
            <p className="text-2xl font-bold text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Healthy</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{stats.healthy}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Warning</p>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">{stats.warning}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Critical</p>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">{stats.critical}</p>
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Live Telemetry &amp; Random Forest Predictions</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              Auto-refresh 30s
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {['All', 'Healthy', 'Warning', 'Critical'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                  filterStatus === status 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState 
              title="No PC Telemetry Available" 
              message={filterStatus === 'All' 
                ? "No PC health logs recorded yet. Start the monitoring agent via 'python monitoring/pc_monitor.py --pc-id LAB1-PC-01' to send metrics." 
                : `No computers currently match the filter: ${filterStatus}`} 
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">PC</th>
                  <th className="py-3.5 px-4">CPU</th>
                  <th className="py-3.5 px-4">RAM</th>
                  <th className="py-3.5 px-4">Disk</th>
                  <th className="py-3.5 px-4">Errors</th>
                  <th className="py-3.5 px-4">AI Health</th>
                  <th className="py-3.5 px-4">Possible Issue</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredData.map((pc) => (
                  <tr key={pc.pc_id || pc.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* PC Code */}
                    <td className="py-4 px-4 font-semibold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Monitor className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-white">{pc.pc_id}</div>
                          {pc.computer_name && (
                            <div className="text-[11px] font-normal text-slate-400">{pc.computer_name}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CPU */}
                    <td className="py-4 px-4 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                        <span>{pc.cpu_usage.toFixed(1)}%</span>
                      </div>
                      <MetricBar value={pc.cpu_usage} />
                    </td>

                    {/* RAM */}
                    <td className="py-4 px-4 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                        <span>{pc.ram_usage.toFixed(1)}%</span>
                      </div>
                      <MetricBar value={pc.ram_usage} />
                    </td>

                    {/* Disk */}
                    <td className="py-4 px-4 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                        <span>{pc.disk_usage.toFixed(1)}%</span>
                      </div>
                      <MetricBar value={pc.disk_usage} />
                    </td>

                    {/* Errors */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                        pc.error_count > 5 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : pc.error_count > 0 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {pc.error_count}
                      </span>
                    </td>

                    {/* AI Health Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getHealthBadge(pc.health_prediction)}
                      {pc.confidence ? (
                        <span className="block text-[11px] text-slate-400 mt-1 font-mono">
                          {(pc.confidence * 100).toFixed(0)}% conf
                        </span>
                      ) : null}
                    </td>

                    {/* Possible Issue */}
                    <td className="py-4 px-4 max-w-xs text-slate-300">
                      <span 
                        className={`text-xs block truncate ${
                          pc.possible_issue === 'Normal performance' 
                            ? 'text-slate-400' 
                            : 'text-amber-300 font-medium'
                        }`}
                        title={pc.possible_issue}
                      >
                        {pc.possible_issue || 'Normal performance'}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400">
                      {getRelativeTime(pc.recorded_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Disclaimer Alert */}
      <div className="p-4 bg-slate-900 border border-indigo-500/20 rounded-2xl text-xs text-slate-400 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-slate-200">System Telemetry &amp; AI Health Note:</strong> AI Health predictions are generated using a machine-learning model (Random Forest Classifier) trained on system metrics telemetry (CPU usage, memory allocation, disk utilization, and event error frequency). The AI identifies operational stress patterns but <span className="text-amber-300 font-medium">does not diagnose exact physical hardware defects</span> (such as component circuit damage, physical drive platter failure, or PSU degradation). For hardware replacement or maintenance, file a maintenance request via the Lab Maintenance module.
        </p>
      </div>
    </div>
  );
}
