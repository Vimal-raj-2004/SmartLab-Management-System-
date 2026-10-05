import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Monitor, FlaskConical, Package,
  Wifi, WrenchIcon, AlertCircle, CheckCircle2,
  CalendarDays, Activity, ShieldAlert, Cpu, BarChart3,
  FileSpreadsheet, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { dashboardService } from '../../services/api';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

const COLOR_MAP = {
  indigo:  { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', border: 'border-indigo-500/20' },
  blue:    { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20'   },
  green:   { bg: 'bg-emerald-500/10',icon: 'text-emerald-400',border: 'border-emerald-500/20'},
  amber:   { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  border: 'border-amber-500/20'  },
  red:     { bg: 'bg-red-500/10',    icon: 'text-red-400',    border: 'border-red-500/20'    },
  purple:  { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',   icon: 'text-cyan-400',   border: 'border-cyan-500/20'   },
  rose:    { bg: 'bg-rose-500/10',   icon: 'text-rose-400',   border: 'border-rose-500/20'   },
};

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  return (
    <div className={`bg-slate-900 rounded-2xl p-4 sm:p-5 border ${c.border} flex items-center gap-4 card-hover shadow-sm`}>
      <div className={`p-3 rounded-xl ${c.bg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-white tracking-tight">{value ?? '—'}</p>
        <p className="text-sm font-medium text-slate-300 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'Labs',         href: '/admin/labs',         color: 'from-indigo-600 to-indigo-500' },
  { label: 'PCs',          href: '/admin/pcs',          color: 'from-purple-600 to-purple-500' },
  { label: 'AI Health',    href: '/admin/pc-health',    color: 'from-blue-600 to-cyan-500' },
  { label: 'Utilization',  href: '/admin/utilization',  color: 'from-emerald-600 to-teal-500' },
  { label: 'Bookings',     href: '/admin/bookings',     color: 'from-sky-600 to-blue-500' },
  { label: 'Complaints',   href: '/admin/complaints',   color: 'from-amber-600 to-orange-500' },
  { label: 'Maintenance',  href: '/admin/maintenance',  color: 'from-rose-600 to-pink-500' },
  { label: 'Reports',      href: '/admin/reports',      color: 'from-violet-600 to-indigo-500' },
  { label: 'Users',        href: '/admin/users',        color: 'from-slate-700 to-slate-800' },
];

// Custom tooltip for dark theme charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md">
        <p className="text-xs font-semibold text-slate-300 mb-1">{label || payload[0]?.name}</p>
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} className="text-xs font-medium" style={{ color: entry.color || entry.fill || '#38bdf8' }}>
            {entry.name}: <span className="font-bold text-white ml-1">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await dashboardService.getAdminAnalytics();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingState message="Loading admin analytics & charts..." />;
  if (error)   return <ErrorState message={error} onRetry={() => fetchAnalytics()} />;

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            Admin Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, lab utilization, asset health &amp; operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/reports"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generate Reports
          </Link>
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── 10 REQUIRED ADMIN KPIs ────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          Primary Operational Indicators (10 KPIs)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Total users */}
          <StatCard
            icon={Users}
            label="Total Users"
            value={kpis.total_users}
            sub="Registered accounts"
            color="indigo"
          />
          {/* 2. Total labs */}
          <StatCard
            icon={FlaskConical}
            label="Total Labs"
            value={kpis.total_labs}
            sub="Active facilities"
            color="blue"
          />
          {/* 3. Total PCs */}
          <StatCard
            icon={Monitor}
            label="Total PCs"
            value={kpis.total_pcs}
            sub="Monitored hardware"
            color="purple"
          />
          {/* 4. Working PCs */}
          <StatCard
            icon={CheckCircle2}
            label="Working PCs"
            value={kpis.working_pcs}
            sub="Fully operational"
            color="green"
          />
          {/* 5. Maintenance PCs */}
          <StatCard
            icon={WrenchIcon}
            label="Maintenance PCs"
            value={kpis.maintenance_pcs}
            sub="Under active repair"
            color="amber"
          />
          {/* 6. Critical PCs */}
          <StatCard
            icon={ShieldAlert}
            label="Critical PCs"
            value={kpis.critical_pcs}
            sub="AI high failure risk"
            color="red"
          />
          {/* 7. Open complaints */}
          <StatCard
            icon={AlertCircle}
            label="Open Complaints"
            value={kpis.open_complaints}
            sub="Pending resolution"
            color="rose"
          />
          {/* 8. High priority complaints */}
          <StatCard
            icon={AlertCircle}
            label="High Priority"
            value={kpis.high_priority_complaints}
            sub="Urgent / High tickets"
            color="amber"
          />
          {/* 9. Today's bookings */}
          <StatCard
            icon={CalendarDays}
            label="Today's Bookings"
            value={kpis.today_bookings}
            sub="Scheduled sessions"
            color="cyan"
          />
          {/* 10. Lab utilization */}
          <StatCard
            icon={Cpu}
            label="Lab Utilization"
            value={`${kpis.lab_utilization?.total_sessions || 0} sess`}
            sub={`Avg ${kpis.lab_utilization?.avg_duration_minutes || 0}m / ${kpis.lab_utilization?.avg_students || 0} stud`}
            color="indigo"
          />
        </div>
      </section>

      {/* ── 6 RECHARTS VISUALIZATIONS ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Analytics &amp; Distribution Visualizations (Recharts)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Chart 1: PC Health Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">1. PC Health Distribution</h3>
                <p className="text-xs text-slate-400">Random Forest Telemetry Classification</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Live AI Health
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.pc_health_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(charts.pc_health_distribution || []).map((entry, index) => (
                      <Cell key={`health-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Lab Utilization */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">2. Lab Utilization (K-Means Sessions)</h3>
                <p className="text-xs text-slate-400">Total sessions &amp; avg PCs used per lab</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Utilization
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.lab_utilization || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="lab" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="sessions" name="Sessions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_pcs_used" name="Avg PCs Used" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Complaints by Priority */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">3. Complaints by Priority</h3>
                <p className="text-xs text-slate-400">NLP TF-IDF &amp; Decision Tree Categorization</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                AI Prioritized
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.complaints_by_priority || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="priority" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Complaints" radius={[6, 6, 0, 0]}>
                    {(charts.complaints_by_priority || []).map((entry, index) => (
                      <Cell key={`prio-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Complaints by Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">4. Complaints by Status</h3>
                <p className="text-xs text-slate-400">Ticket resolution workflow stages</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Resolution Pipeline
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.complaints_by_status || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="status" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                    {(charts.complaints_by_status || []).map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Maintenance Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">5. Maintenance Status</h3>
                <p className="text-xs text-slate-400">Work orders: Pending vs In Progress vs Completed</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                Work Orders
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.maintenance_status || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(charts.maintenance_status || []).map((entry, index) => (
                      <Cell key={`maint-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 6: PC Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">6. PC Hardware Status</h3>
                <p className="text-xs text-slate-400">Inventory operating state distribution</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                Hardware
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.pc_status || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="status" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="PCs" radius={[6, 6, 0, 0]}>
                    {(charts.pc_status || []).map((entry, index) => (
                      <Cell key={`pc-status-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Links */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Quick Navigation &amp; Module Shortcuts
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-3">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.label}
              to={q.href}
              className={`bg-gradient-to-br ${q.color} text-white text-xs font-semibold px-3 py-3 rounded-xl text-center hover:opacity-95 transition-all shadow-sm card-hover flex items-center justify-center`}
            >
              {q.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
