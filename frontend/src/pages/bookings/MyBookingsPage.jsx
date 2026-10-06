import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, PlusCircle, Filter, Search,
  Clock, Users, AlertCircle, XCircle, Eye, CheckCircle2
} from 'lucide-react';
import { bookingService } from '../../services/api';
import StatusBadge, { defaultBookingStatus } from '../../components/StatusBadge';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isBookingPassed = (b) => {
    if (!b?.booking_date || !b?.end_time) return false;
    try {
      const [year, month, day] = b.booking_date.split('-').map(Number);
      const [hours, minutes] = b.end_time.split(':').map(Number);
      const endDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      return new Date() >= endDateTime;
    } catch (e) {
      return false;
    }
  };

  const getDisplayStatus = (b) => {
    if (!b) return '';
    if (b.status === 'approved' && isBookingPassed(b)) return 'completed';
    return b.status;
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedBooking) {
        setSelectedBooking(null);
      }
    };
    if (selectedBooking) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedBooking]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await bookingService.list(params);
      setBookings(res.data.items || []);
    } catch (err) {
      setActionError('Failed to fetch your bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking reservation?')) return;
    try {
      setCancellingId(bookingId);
      setActionError(null);
      await bookingService.updateStatus(bookingId, { status: 'cancelled' });
      setActionSuccess('Booking successfully cancelled.');
      fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => ({ ...prev, status: 'cancelled' }));
      }
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Lab Bookings</h1>
          <p className="text-sm text-slate-400">Track and manage your computer lab reservations</p>
        </div>
        <button
          onClick={() => navigate('/faculty/bookings/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-900/30 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-between text-red-200 text-sm">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-between text-emerald-200 text-sm">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['', 'pending', 'approved', 'completed', 'rejected', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            {st ? st : 'All Bookings'}
          </button>
        ))}
      </div>

      {/* Bookings List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CalendarDays className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No bookings found</p>
            <p className="text-sm text-slate-500">You have no reservations matching this filter.</p>
            <button
              onClick={() => navigate('/faculty/bookings/new')}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" /> Book a Lab Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Booking Code</th>
                  <th className="py-3.5 px-4">Laboratory</th>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Students</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">
                      {b.booking_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{b.lab?.lab_name || `Lab #${b.lab_id}`}</div>
                      <div className="text-xs text-slate-400">{b.lab?.location || 'Main Campus'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-300">{b.booking_date}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {b.number_of_students}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge value={getDisplayStatus(b)} statusMap={defaultBookingStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {['pending', 'approved'].includes(b.status) && !isBookingPassed(b) && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={cancellingId === b.id}
                          className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/50 text-red-300 hover:text-white transition-colors disabled:opacity-50"
                          title="Cancel Reservation"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          {/* Backdrop Click Layer */}
          <div
            className="fixed inset-0"
            onClick={() => setSelectedBooking(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden my-auto">
            {/* Sticky Header */}
            <div className="flex-shrink-0 sticky top-0 bg-slate-900 z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs text-indigo-400 font-bold">{selectedBooking.booking_code}</span>
                <h3 className="text-base sm:text-lg font-bold text-white">Reservation Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close reservation details"
                title="Close"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 sm:py-5 space-y-3.5 text-sm min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block mb-1">Laboratory</span>
                  <span className="font-semibold text-slate-200">{selectedBooking.lab?.lab_name}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">{selectedBooking.lab?.location}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block mb-1">Status</span>
                  <StatusBadge value={getDisplayStatus(selectedBooking)} statusMap={defaultBookingStatus} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-xs text-slate-400">Date &amp; Time Window</div>
                <div className="font-medium text-slate-200 flex items-center justify-between">
                  <span>{selectedBooking.booking_date}</span>
                  <span className="text-indigo-400">{selectedBooking.start_time.slice(0, 5)} – {selectedBooking.end_time.slice(0, 5)}</span>
                </div>
                <div className="text-xs text-slate-400 pt-1">
                  Expected Students: <span className="font-semibold text-slate-300">{selectedBooking.number_of_students}</span> (Capacity: {selectedBooking.lab?.capacity})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1">Purpose / Session Notes</span>
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{selectedBooking.purpose}</p>
              </div>

              {selectedBooking.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200">
                  <span className="text-xs font-semibold block text-red-300 mb-1">Rejection Reason:</span>
                  <p className="text-xs leading-relaxed">{selectedBooking.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 sticky bottom-0 bg-slate-900 z-10 px-5 sm:px-6 py-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                {isBookingPassed(selectedBooking) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Session Completed
                  </span>
                ) : ['pending', 'approved'].includes(selectedBooking.status) && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedBooking.id)}
                    disabled={cancellingId === selectedBooking.id}
                    className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel Reservation
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
