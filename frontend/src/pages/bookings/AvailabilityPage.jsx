import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, Users, FlaskConical,
  CheckCircle2, XCircle, ChevronRight, Calendar, ArrowRight
} from 'lucide-react';
import { bookingService } from '../../services/api';
import StatusBadge, { defaultBookingStatus } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function AvailabilityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate]);

  const fetchAvailability = async (dateStr) => {
    try {
      setLoading(true);
      const res = await bookingService.getAvailability(dateStr);
      setAvailabilityList(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Computer Laboratory Availability</h1>
          <p className="text-sm text-slate-400">
            Check live occupancy, scheduled class hours, and open reservation slots
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 shadow-md"
          />
        </div>
      </div>

      {/* Laboratories Grid */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Checking availability across laboratories...</p>
        </div>
      ) : availabilityList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <FlaskConical className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <p className="text-base font-semibold text-slate-300">No active laboratories found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {availabilityList.map((lab) => {
            const hasBookings = lab.bookings && lab.bookings.length > 0;
            return (
              <div
                key={lab.lab_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors space-y-5"
              >
                <div>
                  {/* Lab Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{lab.lab_name}</h3>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {lab.lab_code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                        {lab.location || 'Campus Tech Block'} • Max {lab.capacity} Workstations
                      </p>
                    </div>

                    {/* Availability Badge */}
                    {isToday ? (
                      lab.is_available_now ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Available Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          Occupied Now
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {hasBookings ? `${lab.bookings.length} Session(s)` : 'Free All Day'}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Slots on selected date */}
                  <div className="mt-5 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Reservations for {selectedDate}:
                    </span>

                    {!hasBookings ? (
                      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Laboratory has no reserved bookings for this date. All hours open.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lab.bookings.map((slot) => (
                          <div
                            key={slot.booking_id}
                            className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="font-mono font-bold text-indigo-300 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700/60">
                                <Clock className="w-3.5 h-3.5" />
                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                              </div>
                              <div>
                                <span className="font-medium text-slate-200 block truncate max-w-[200px]">
                                  {slot.purpose}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Prof. {slot.faculty_name}
                                </span>
                              </div>
                            </div>
                            <StatusBadge value={slot.status} statusMap={defaultBookingStatus} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer action for faculty */}
                {user?.role === 'faculty' && (
                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => navigate('/faculty/bookings/new')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>Book this Lab</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
