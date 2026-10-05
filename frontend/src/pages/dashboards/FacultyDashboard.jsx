import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Clock, FlaskConical, ClipboardList,
  PlusCircle, Users, CheckCircle2, AlertCircle, ArrowUpRight,
  Sparkles, RefreshCw
} from 'lucide-react';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isManual = false, retryCount = 1) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await dashboardService.getFacultyStats();
      setStats(res.data);
    } catch (err) {
      if (retryCount > 0) {
        setTimeout(() => fetchStats(isManual, retryCount - 1), 1200);
        return;
      }
      setError(err.response?.data?.detail || 'Failed to load faculty dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <LoadingState message="Loading faculty portal & reservations..." />;
  if (error)   return <ErrorState message={error} onRetry={() => fetchStats()} />;

  const upcoming = stats?.upcoming_sessions || [];
  const history = stats?.booking_history || [];
  const complaints = stats?.complaints || { total: 0, open: 0, resolved: 0, recent: [] };
  const availability = stats?.lab_availability || [];
  const usageInfo = stats?.lab_usage_info || { total_sessions_booked: 0, completed_sessions: 0, total_students_engaged: 0 };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Welcome, Professor {user?.name}
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Faculty Laboratory Portal — Reservations, Lab Availability &amp; Session Insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/faculty/bookings/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 transition"
          >
            <CalendarDays className="w-4 h-4" />
            Reserve a Lab
          </Link>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. My Bookings */}
        <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-sm card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">My Bookings</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.my_bookings_count ?? 0}</p>
          <p className="text-xs text-indigo-400 mt-1">Total reservations requested</p>
        </div>

        {/* 2. Lab Usage / Completed */}
        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 shadow-sm card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Sessions Completed</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{usageInfo.completed_sessions}</p>
          <p className="text-xs text-emerald-400 mt-1">{usageInfo.total_students_engaged} students taught</p>
        </div>

        {/* 3. My Complaints */}
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5 shadow-sm card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">My Complaints</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{complaints.total}</p>
          <p className="text-xs text-amber-400 mt-1">{complaints.open} active / unresolved</p>
        </div>

        {/* 4. Active Labs Available */}
        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-5 shadow-sm card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Labs Available</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FlaskConical className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {availability.filter(l => !l.is_busy_today).length} <span className="text-sm font-normal text-slate-400">/ {availability.length}</span>
          </p>
          <p className="text-xs text-blue-400 mt-1">Ready for immediate booking</p>
        </div>
      </div>

      {/* Grid: Upcoming Sessions & Booking History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Upcoming Lab Sessions
              </h2>
              <p className="text-xs text-slate-400">Your scheduled and approved future classes</p>
            </div>
            <Link to="/faculty/bookings" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No upcoming laboratory sessions scheduled</p>
              <Link to="/faculty/bookings/new" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
                Schedule a session now &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{b.lab_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                        {b.lab_code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{b.purpose}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                      <span>{b.booking_date}</span>
                      <span>•</span>
                      <span>{b.start_time} - {b.end_time}</span>
                      <span>•</span>
                      <span>{b.students} students</span>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Approved
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking History */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                Recent Booking History
              </h2>
              <p className="text-xs text-slate-400">Past classes &amp; completed lab allocations</p>
            </div>
            <Link to="/faculty/bookings" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              All history <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No past lab session records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{b.lab_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{b.purpose}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{b.booking_date} • {b.booking_code}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                    String(b.status || '').toLowerCase() === 'completed'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                  }`}>
                    {String(b.status || 'pending').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lab Availability Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-blue-400" />
              Real-Time Lab Availability
            </h2>
            <p className="text-xs text-slate-400">Live schedule status across department facilities</p>
          </div>
          <Link
            to="/faculty/availability"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Check Calendar
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {availability.map((lab) => (
            <div key={lab.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{lab.lab_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    lab.is_busy_today
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {lab.is_busy_today ? 'In Session' : 'Available'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{lab.location} • {lab.capacity} Workstations</p>
                <p className="text-xs text-slate-500 mt-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                  {lab.current_purpose}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">{lab.lab_code}</span>
                <Link
                  to="/faculty/bookings/new"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Book this Lab &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My Complaints Summary */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              My Complaints &amp; Hardware Issues
            </h2>
            <p className="text-xs text-slate-400">Track issues reported by you to the lab technician</p>
          </div>
          <Link
            to="/faculty/complaints/new"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-medium transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Report Issue
          </Link>
        </div>

        {complaints.recent.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <CheckCircle2 className="w-7 h-7 text-emerald-500/60 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">No active complaints filed by you. All clear!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {complaints.recent.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{c.code}</td>
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
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {String(c.status || 'open').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
