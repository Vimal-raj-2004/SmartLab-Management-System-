import { useState, useEffect } from 'react';
import {
  CalendarDays, Clock, Users, FlaskConical,
  CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { bookingService } from '../../services/api';
import StatusBadge, { defaultBookingStatus } from '../../components/StatusBadge';

export default function TodaySchedulePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await bookingService.getTodaySchedule();
      setSessions(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSessionState = (startTimeStr, endTimeStr) => {
    const now = currentTime;
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    if (nowStr >= startTimeStr && nowStr <= endTimeStr) {
      return { label: 'Ongoing Now', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse' };
    } else if (nowStr < startTimeStr) {
      return { label: 'Upcoming', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    } else {
      return { label: 'Completed', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
  };

  const getDisplayStatus = (sess) => {
    if (!sess) return '';
    if (sess.status === 'approved') {
      const now = currentTime;
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
      if (nowStr >= (sess.end_time || '')) return 'completed';
    }
    return sess.status;
  };

  const todayStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Today&apos;s Lab Schedule</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Live
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{todayStr}</p>
        </div>

        <button
          onClick={fetchSchedule}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Schedule</span>
        </button>
      </div>

      {/* Schedule Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Fetching today&apos;s laboratory bookings...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <CalendarDays className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No scheduled sessions for today</p>
            <p className="text-sm text-slate-500">All computer laboratories are currently free for open use.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => {
              const liveState = getSessionState(sess.start_time, sess.end_time);
              return (
                <div
                  key={sess.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs text-indigo-400 font-bold">{sess.booking_code}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${liveState.color}`}>
                        {liveState.label}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{sess.lab?.lab_name || `Lab #${sess.lab_id}`}</h3>
                        <p className="text-xs text-slate-400">{sess.lab?.location || 'Main Building'}</p>
                      </div>
                      <StatusBadge value={getDisplayStatus(sess)} statusMap={defaultBookingStatus} />
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          Time Slot:
                        </span>
                        <span className="text-slate-200 font-semibold">
                          {sess.start_time.slice(0, 5)} – {sess.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Students:
                        </span>
                        <span className="text-slate-200 font-semibold">
                          {sess.number_of_students} / {sess.lab?.capacity} seats
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-xs text-slate-400 block mb-0.5 font-medium">Session Purpose:</span>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{sess.purpose}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>Faculty: <strong className="text-slate-200 font-semibold">{sess.faculty?.name}</strong></span>
                    <span className="text-[11px] text-slate-500">{sess.faculty?.email}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
