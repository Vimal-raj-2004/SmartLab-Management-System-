import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical, ClipboardList, PlusCircle, CalendarDays,
  Clock, CheckCircle2, AlertCircle, RefreshCw,
  BookOpen, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function StudentDashboard() {
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
      const res = await dashboardService.getStudentStats();
      setData(res.data);
    } catch (err) {
      if (retryCount > 0) {
        setTimeout(() => fetchStats(isManual, retryCount - 1), 1200);
        return;
      }
      setError(err.response?.data?.detail || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <LoadingState message="Loading your student portal..." />;
  if (error)   return <ErrorState message={error} onRetry={() => fetchStats()} />;

  const summary = data?.complaints_summary || { total: 0, open: 0, in_progress: 0, resolved: 0 };
  const complaints = data?.my_complaints || [];
  const labs = data?.labs || [];
  const todaySessions = data?.today_sessions || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Welcome, {user?.name} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Student Laboratory Portal — Track issue tickets, view open labs &amp; today&apos;s schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/student/complaints/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-900/30 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Report Issue
          </Link>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 1. My Complaints & Ticket Status Breakdown ────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-400" />
          My Complaint Status Breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-slate-400">Total Submitted</span>
            <p className="text-2xl font-bold text-white mt-1">{summary.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tickets reported by you</p>
          </div>
          <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-blue-400">Open / Pending</span>
            <p className="text-2xl font-bold text-blue-400 mt-1">{summary.open}</p>
            <p className="text-xs text-blue-500/70 mt-0.5">Awaiting triage</p>
          </div>
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-amber-400">In Progress</span>
            <p className="text-2xl font-bold text-amber-400 mt-1">{summary.in_progress}</p>
            <p className="text-xs text-amber-500/70 mt-0.5">Technician active</p>
          </div>
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 card-hover">
            <span className="text-xs font-medium text-emerald-400">Resolved</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.resolved}</p>
            <p className="text-xs text-emerald-500/70 mt-0.5">Fixed &amp; closed</p>
          </div>
        </div>
      </section>

      {/* ── 2. My Submitted Complaints List ───────────────────────────────── */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              My Submitted Complaints
            </h2>
            <p className="text-xs text-slate-400">Status and AI priority feedback on issues you reported</p>
          </div>
          <Link
            to="/student/complaints"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            All tickets <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {complaints.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">You haven&apos;t filed any complaints yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">Facing an issue with a PC, mouse, or network?</p>
            <Link
              to="/student/complaints/new"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 text-xs font-medium border border-amber-500/30 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Report Issue Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">PC / Lab</th>
                  <th className="py-2.5 px-3">Issue Category</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">AI Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reported On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{c.code}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {c.pc_code} <span className="text-slate-500">({c.lab_name})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{c.category}</td>
                    <td className="py-2.5 px-3 text-slate-400 capitalize">{c.severity}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        c.priority === 'High' || c.priority === 'Urgent'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        String(c.status || '').toLowerCase() === 'resolved' || String(c.status || '').toLowerCase() === 'closed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : String(c.status || '').toLowerCase() === 'in_progress'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {String(c.status || 'open').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{c.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 3. Lab Information & Today's Schedule ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-blue-400" />
                Laboratory Information &amp; Status
              </h2>
              <p className="text-xs text-slate-400">Campus facilities open for study or currently in lecture use</p>
            </div>
          </div>

          <div className="space-y-3">
            {labs.map((l) => (
              <div key={l.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{l.lab_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {l.lab_code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {l.location} • {l.capacity} PCs capacity
                  </p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                  l.status.includes('Session')
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Relevant Today's Booking/Session Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                Today&apos;s Lab Classes &amp; Sessions
              </h2>
              <p className="text-xs text-slate-400">Scheduled faculty sessions so you know when labs are occupied</p>
            </div>
            <Link
              to="/student/availability"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Full Calendar &rarr;
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <BookOpen className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">No scheduled class reservations today.</p>
              <p className="text-[11px] text-emerald-400 mt-0.5">Labs are open for self-study!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-semibold text-white">{s.time_slot}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                        {s.lab_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{s.purpose}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Instructor: {s.faculty}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                    {String(s.status || 'scheduled').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
