import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, Users, FlaskConical,
  AlertCircle, CheckCircle2, ArrowLeft, Info, Calendar, X
} from 'lucide-react';
import { bookingService, labService } from '../../services/api';
import StatusBadge, { defaultBookingStatus } from '../../components/StatusBadge';
import {
  formatTime12h,
  formatTimeRange12h,
  isSlotInPast,
  getSmartDefaultTimes
} from '../../utils/timeFormat';

export default function BookingPage() {
  const navigate = useNavigate();
  const [labs, setLabs] = useState([]);
  const [loadingLabs, setLoadingLabs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const defaultTimes = getSmartDefaultTimes();
  // Form State
  const [formData, setFormData] = useState({
    lab_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: defaultTimes.start,
    end_time: defaultTimes.end,
    number_of_students: 20,
    purpose: '',
  });

  // Modal alert for expired / past time slots
  const [pastTimeModal, setPastTimeModal] = useState({
    open: false,
    slotText: '',
    currentTimeText: '',
  });

  // Preview schedule for the selected lab & date
  const [labSchedule, setLabSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      setLoadingLabs(true);
      const res = await labService.list({ per_page: 50 });
      const activeLabs = (res.data.items || []).filter(l => l.status === 'active');
      setLabs(activeLabs);
      if (activeLabs.length > 0) {
        setFormData(prev => ({
          ...prev,
          lab_id: activeLabs[0].id,
          number_of_students: Math.min(20, activeLabs[0].capacity)
        }));
      }
    } catch (err) {
      setError('Failed to load active laboratories.');
    } finally {
      setLoadingLabs(false);
    }
  };

  // Whenever lab_id or booking_date changes, load existing bookings for preview
  useEffect(() => {
    if (formData.lab_id && formData.booking_date) {
      fetchLabSchedule(formData.lab_id, formData.booking_date);
    }
  }, [formData.lab_id, formData.booking_date]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && pastTimeModal.open) {
        setPastTimeModal({ open: false, slotText: '', currentTimeText: '' });
      }
    };
    if (pastTimeModal.open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [pastTimeModal.open]);

  const fetchLabSchedule = async (labId, dateStr) => {
    try {
      setLoadingSchedule(true);
      const res = await bookingService.getAvailability(dateStr);
      const labInfo = (res.data || []).find(l => l.lab_id === Number(labId));
      setLabSchedule(labInfo?.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const selectedLab = labs.find(l => l.id === Number(formData.lab_id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError(null);
    setSuccess(null);

    if (name === 'lab_id') {
      const newLab = labs.find(l => l.id === Number(value));
      const currentStudents = Number(formData.number_of_students);
      const adjustedStudents = newLab && currentStudents > newLab.capacity ? newLab.capacity : currentStudents;
      setFormData(prev => ({ ...prev, lab_id: value, number_of_students: adjustedStudents }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.lab_id) {
      setError('Please select a laboratory.');
      return;
    }
    if (!formData.purpose.trim()) {
      setError('Please specify the booking purpose.');
      return;
    }
    if (formData.end_time <= formData.start_time) {
      setError('End time must be later than start time.');
      return;
    }
    if (selectedLab && Number(formData.number_of_students) > selectedLab.capacity) {
      setError(`Number of students cannot exceed lab capacity of ${selectedLab.capacity}.`);
      return;
    }

    // Past time slot validation for today's reservations
    if (isSlotInPast(formData.booking_date, formData.start_time, formData.end_time)) {
      const now = new Date();
      let nowHour = now.getHours();
      const ampm = nowHour >= 12 ? 'PM' : 'AM';
      nowHour = nowHour % 12 || 12;
      const nowMin = String(now.getMinutes()).padStart(2, '0');
      const curTime = `${String(nowHour).padStart(2, '0')}:${nowMin} ${ampm}`;
      const slotText = `${formatTime12h(formData.start_time)} – ${formatTime12h(formData.end_time)}`;
      const msg = `Cannot book a past time slot! The selected slot (${slotText}) has already ended today (Current time is ${curTime}). Please choose an upcoming time slot.`;

      setPastTimeModal({
        open: true,
        slotText,
        currentTimeText: curTime,
      });
      setError(msg);
      return;
    }

    try {
      setSubmitting(true);
      // Format start and end time with seconds
      const startWithSec = formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time;
      const endWithSec = formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time;

      const payload = {
        lab_id: Number(formData.lab_id),
        booking_date: formData.booking_date,
        start_time: startWithSec,
        end_time: endWithSec,
        number_of_students: Number(formData.number_of_students),
        purpose: formData.purpose.trim(),
      };

      const res = await bookingService.create(payload);
      setSuccess(`Booking request ${res.data.booking_code} submitted successfully! Awaiting administrator approval.`);
      // Refresh schedule
      fetchLabSchedule(formData.lab_id, formData.booking_date);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit booking request. Please check availability.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Book a Computer Lab</h1>
            <p className="text-sm text-slate-400">Request laboratory reservation for academic sessions or exams</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/faculty/bookings')}
          className="px-4 py-2 text-sm bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-medium border border-slate-700"
        >
          View My Bookings
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-200 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1 text-sm font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-start gap-3 text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1 text-sm font-medium leading-relaxed">{success}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Form (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Lab Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Select Laboratory *
              </label>
              {loadingLabs ? (
                <div className="h-10 bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  name="lab_id"
                  value={formData.lab_id}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {labs.map(lab => (
                    <option key={lab.id} value={lab.id}>
                      {lab.lab_name} ({lab.lab_code}) — Capacity: {lab.capacity} seats ({lab.location || 'Campus'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date & Capacity row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Booking Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="booking_date"
                    min={todayStr}
                    value={formData.booking_date}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Number of Students *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="number_of_students"
                    min="1"
                    max={selectedLab ? selectedLab.capacity : 100}
                    value={formData.number_of_students}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {selectedLab && (
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                      / max {selectedLab.capacity}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Time window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Start Time *
                  </label>
                  {formData.start_time && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {formatTime12h(formData.start_time)}
                    </span>
                  )}
                </div>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    End Time *
                  </label>
                  {formData.end_time && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {formatTime12h(formData.end_time)}
                    </span>
                  )}
                </div>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Inline warning if slot has already expired today */}
              {isSlotInPast(formData.booking_date, formData.start_time, formData.end_time) && (
                <div className="col-span-1 sm:col-span-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-200">Past Time Slot Detected:</span>{' '}
                    The selected time ({formatTime12h(formData.start_time)} – {formatTime12h(formData.end_time)}) has already passed today. Please pick an upcoming time.
                  </div>
                </div>
              )}
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Purpose of Booking *
              </label>
              <textarea
                name="purpose"
                rows="3"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="e.g. CS402 Computer Graphics practical session and shader programming demo..."
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Checking Availability &amp; Booking...</span>
                  </>
                ) : (
                  <>
                    <CalendarDays className="w-5 h-5" />
                    <span>Submit Reservation Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Schedule preview sidebar (1 col) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-white text-sm">
                Schedule for {formData.booking_date}
              </h3>
            </div>

            {selectedLab && (
              <div className="text-xs text-slate-400 mb-3 pb-3 border-b border-slate-800">
                <span className="font-medium text-slate-200">{selectedLab.lab_name}</span> ({selectedLab.location || 'Main Block'})
                <div className="mt-1 flex items-center gap-1 text-slate-400">
                  <Users className="w-3.5 h-3.5" /> Max Capacity: {selectedLab.capacity}
                </div>
              </div>
            )}

            {loadingSchedule ? (
              <div className="space-y-2">
                <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
              </div>
            ) : labSchedule.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-200">All Slots Free</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No existing reservations for this lab on selected date.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Existing Reservations:
                </p>
                {labSchedule.map((slot) => (
                  <div
                    key={slot.booking_id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeRange12h(slot.start_time, slot.end_time)}
                      </span>
                      <StatusBadge value={slot.status} statusMap={defaultBookingStatus} />
                    </div>
                    <p className="text-xs text-slate-300 font-medium truncate">{slot.purpose}</p>
                    <p className="text-[11px] text-slate-500">By: {slot.faculty_name}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>Double bookings are prevented. You cannot reserve slots overlapping with existing approved or pending sessions.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Past Time Slot Warning Modal Popup ────────────────────────── */}
      {pastTimeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setPastTimeModal({ open: false, slotText: '', currentTimeText: '' })}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] flex flex-col bg-slate-900 border border-rose-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-rose-950/60 space-y-4 my-auto overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Time Slot Already Passed</h3>
                  <p className="text-xs text-rose-300">Cannot reserve an expired session</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPastTimeModal({ open: false, slotText: '', currentTimeText: '' })}
                aria-label="Close warning modal"
                title="Close"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Selected Slot:</span>
                <span className="font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                  {pastTimeModal.slotText} (EXPIRED)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Local Time:</span>
                <span className="font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  {pastTimeModal.currentTimeText}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              The time window you selected has already finished for today. Laboratory reservations can only be booked for upcoming future hours.
            </p>

            <button
              type="button"
              onClick={() => setPastTimeModal({ open: false, slotText: '', currentTimeText: '' })}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-900/40"
            >
              Got It — Select Upcoming Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
