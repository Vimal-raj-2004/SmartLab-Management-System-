import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor, ShieldAlert, AlertTriangle, ClipboardList,
  Wrench, CalendarDays, Clock, RefreshCw, CheckCircle2,
  ChevronRight, Cpu, ArrowUpRight, FileSpreadsheet
} from 'lucide-react';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function AssistantDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isManual = false, retryCount = 1) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await dashboardService.getAssistantStats();
      setData(res.data);
    } catch (err) {
      if (retryCount > 0) {
        setTimeout(() => fetchStats(isManual, retryCount - 1), 1200);
        return;
      }
      setError(err.response?.data?.detail || 'Failed to load lab assistant dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <LoadingState message="Loading lab operations telemetry & maintenance..." />;
  if (error)   return <ErrorState message={error} onRetry={() => fetchStats()} />;

  const pcStatus = data?.pc_status || { total: 0, available: 0, working: 0, maintenance: 0, not_working: 0 };
  const criticalPcs = data?.critical_pcs || [];
  const warningPcs = data?.warning_pcs || [];
  const openComplaintsCount = data?.open_complaints_count || 0;
  const highPriorityComplaints = data?.high_priority_complaints || [];
  const pendingMaintenance = data?.pending_maintenance || [];
  const todaySchedule = data?.today_schedule || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Lab Assistant Operations Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Logged in as {user?.name} — Hardware diagnostics, work orders &amp; daily lab schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/assistant/reports"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Reports
          </Link>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── 1. PC Operating Status KPI Overview ────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-purple-400" />
          PC Status &amp; Hardware Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-slate-400">Total Workstations</span>
            <p className="text-2xl font-bold text-white mt-1">{pcStatus.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">All monitored PCs</p>
          </div>
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-emerald-400">Working / Available</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{pcStatus.working}</p>
            <p className="text-xs text-emerald-500/70 mt-0.5">{pcStatus.available} open for use</p>
          </div>
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-amber-400">Under Maintenance</span>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pcStatus.maintenance}</p>
            <p className="text-xs text-amber-500/70 mt-0.5">Work order active</p>
          </div>
          <div className="bg-slate-900 border border-rose-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-rose-400">Critical / Failing</span>
            <p className="text-2xl font-bold text-rose-400 mt-1">{criticalPcs.length}</p>
            <p className="text-xs text-rose-500/70 mt-0.5">High failure risk</p>
          </div>
          <div className="bg-slate-900 border border-yellow-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-yellow-400">Warning Hardware</span>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{warningPcs.length}</p>
            <p className="text-xs text-yellow-500/70 mt-0.5">Thermal / load alerts</p>
          </div>
        </div>
      </section>

      {/* ── 2. Critical PCs & Warning PCs Alert Lists ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical PCs */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Critical PCs ({criticalPcs.length})
              </h2>
              <p className="text-xs text-slate-400">PCs requiring immediate maintenance or technician intervention</p>
            </div>
            <Link to="/assistant/pc-health" className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1">
              AI Monitor <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {criticalPcs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-emerald-500/20 rounded-xl bg-emerald-950/10">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs text-emerald-300 font-medium">No PCs currently in Critical condition.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">All hardware running within normal limits.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {criticalPcs.map((pc) => (
                <div key={pc.id} className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{pc.pc_code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {pc.lab_name}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 mt-1">
                      {pc.issues && pc.issues.length ? pc.issues.join(', ') : 'High resource stress / hardware offline'}
                    </p>
                  </div>
                  <Link
                    to="/assistant/maintenance"
                    className="text-[11px] px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition"
                  >
                    Fix &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning PCs */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Warning PCs ({warningPcs.length})
              </h2>
              <p className="text-xs text-slate-400">Elevated temperature, memory leak, or disk capacity alerts</p>
            </div>
            <Link to="/assistant/pc-health" className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1">
              AI Monitor <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {warningPcs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CheckCircle2 className="w-7 h-7 text-emerald-400/60 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">No warning-level PC anomalies detected.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {warningPcs.map((pc) => (
                <div key={pc.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{pc.pc_code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {pc.lab_name}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300 mt-1">
                      {pc.issues && pc.issues.length ? pc.issues.join(', ') : 'Elevated telemetry metrics'}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                    Monitor
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. High Priority Complaints & Pending Maintenance ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Priority Complaints */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-orange-400" />
                High Priority Complaints
              </h2>
              <p className="text-xs text-slate-400">
                {openComplaintsCount} total open tickets • showing Urgent &amp; High priority
              </p>
            </div>
            <Link to="/assistant/complaints" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              View tickets <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {highPriorityComplaints.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">No high-priority complaints pending triage!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {highPriorityComplaints.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{c.code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                        {c.priority}
                      </span>
                      {c.ai_predicted && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          AI: {c.ai_predicted}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{c.category} • PC: {c.pc_code} ({c.lab_name})</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">By {c.submitter} on {c.created_at}</p>
                  </div>
                  <Link
                    to="/assistant/complaints"
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                  >
                    Resolve
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Maintenance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Pending Maintenance
              </h2>
              <p className="text-xs text-slate-400">Work orders awaiting technician action</p>
            </div>
            <Link to="/assistant/maintenance" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              All work orders <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingMaintenance.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">No pending maintenance tasks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMaintenance.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">PC: {m.pc_code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {m.lab_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-1">{m.issue}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Type: {m.type} • Assigned: {m.technician}
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                    PENDING
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Today's Lab Schedule ────────────────────────────────────────── */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              Today&apos;s Lab Schedule &amp; Session Timeline
            </h2>
            <p className="text-xs text-slate-400">Class bookings and reservations across computer labs for today</p>
          </div>
          <Link
            to="/assistant/schedule"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Full Timetable
          </Link>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Clock className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">No lab sessions scheduled for today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Time Slot</th>
                  <th className="py-2.5 px-3">Lab</th>
                  <th className="py-2.5 px-3">Faculty</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Batch Size</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {todaySchedule.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {s.time_slot}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-300">{s.lab_name} ({s.lab_code})</td>
                    <td className="py-2.5 px-3 text-slate-300">{s.faculty}</td>
                    <td className="py-2.5 px-3 text-slate-400">{s.purpose}</td>
                    <td className="py-2.5 px-3 text-slate-300">{s.students} Students</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        String(s.status || '').toLowerCase() === 'completed'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {String(s.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick Navigation Shortcuts */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Quick Action Shortcuts
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link to="/assistant/pcs" className="bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-semibold px-3.5 py-3 rounded-xl text-center transition shadow-sm">
            PC Workstations
          </Link>
          <Link to="/assistant/pc-health" className="bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold px-3.5 py-3 rounded-xl text-center transition shadow-sm">
            AI Telemetry
          </Link>
          <Link to="/assistant/inventory" className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-3 rounded-xl text-center transition shadow-sm">
            Inventory Assets
          </Link>
          <Link to="/assistant/complaints" className="bg-orange-600/90 hover:bg-orange-600 text-white text-xs font-semibold px-3.5 py-3 rounded-xl text-center transition shadow-sm">
            Complaints
          </Link>
          <Link to="/assistant/maintenance" className="bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-semibold px-3.5 py-3 rounded-xl text-center transition shadow-sm">
            Maintenance
          </Link>
          <Link to="/assistant/schedule" className="bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold px-3.5 py-3 rounded-xl text-center transition shadow-sm">
            Lab Schedule
          </Link>
        </div>
      </section>
    </div>
  );
}
