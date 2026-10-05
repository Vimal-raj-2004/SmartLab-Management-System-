import { useState, useEffect } from 'react';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, Users,
  Filter, Search, AlertCircle, Eye, Trash2, Check, X
} from 'lucide-react';
import { bookingService, labService } from '../../services/api';
import StatusBadge, { defaultBookingStatus } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function BookingManagementPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedLab, setSelectedLab] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Actions
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
    fetchLabs();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [selectedLab, selectedDate, selectedStatus]);

  const fetchLabs = async () => {
    try {
      const res = await labService.list({ per_page: 50 });
      setLabs(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await bookingService.getStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedLab) params.lab_id = selectedLab;
      if (selectedDate) params.booking_date = selectedDate;
      if (selectedStatus) params.status = selectedStatus;
      const res = await bookingService.list(params);
      setBookings(res.data.items || []);
    } catch (err) {
      setErrorMsg('Failed to load lab bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus, reason = null) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const payload = { status: newStatus };
      if (reason) payload.rejection_reason = reason;
      await bookingService.updateStatus(bookingId, payload);
      setSuccessMsg(`Booking status successfully updated to ${newStatus}.`);
      setRejectingBooking(null);
      setRejectionReason('');
      fetchBookings();
      fetchStats();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(null);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update booking status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Are you sure you want to permanently delete this booking record?')) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await bookingService.delete(bookingId);
      setSuccessMsg('Booking deleted successfully.');
      fetchBookings();
      fetchStats();
      if (selectedBooking?.id === bookingId) setSelectedBooking(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete booking.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Lab Booking Approvals &amp; Management</h1>
        <p className="text-sm text-slate-400">Review faculty reservation requests, prevent double bookings, and track lab usage</p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-between text-red-200 text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-between text-emerald-200 text-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Requests</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-amber-400 uppercase font-semibold">Pending Approval</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-emerald-400 uppercase font-semibold">Approved Sessions</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.approved}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">Completed</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">{stats.completed}</div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Laboratories</option>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lab_name} ({l.lab_code})
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[170px]">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="min-w-[170px]">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {(selectedLab || selectedDate || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedLab('');
              setSelectedDate('');
              setSelectedStatus('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CalendarDays className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No bookings match the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Booking</th>
                  <th className="py-3.5 px-4">Faculty</th>
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
                      <div className="font-semibold text-slate-200">{b.faculty?.name || 'Faculty'}</div>
                      <div className="text-xs text-slate-400">{b.faculty?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{b.lab?.lab_name || `Lab #${b.lab_id}`}</div>
                      <div className="text-xs text-slate-400">{b.lab?.lab_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-300">{b.booking_date}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {b.number_of_students}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge value={getDisplayStatus(b)} statusMap={defaultBookingStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* View detail */}
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Approve button for pending */}
                      {b.status === 'pending' && !isBookingPassed(b) && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'approved')}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-300 hover:text-white transition-colors"
                          title="Approve Booking"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reject button for pending */}
                      {b.status === 'pending' && !isBookingPassed(b) && (
                        <button
                          onClick={() => setRejectingBooking(b)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-800 border border-red-700/60 text-red-300 hover:text-white transition-colors"
                          title="Reject Booking"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {/* Mark Completed button for approved */}
                      {b.status === 'approved' && !isBookingPassed(b) && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'completed')}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-800 border border-blue-700/60 text-blue-300 hover:text-white transition-colors"
                          title="Mark Session Completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Admin Delete */}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(b.id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition-colors"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Reject Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Reject Booking {rejectingBooking.booking_code}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please provide a reason for rejecting this booking so the faculty member can reschedule accordingly.
            </p>

            <textarea
              rows="3"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Laboratory undergoing planned electrical maintenance during these hours..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectingBooking(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(rejectingBooking.id, 'rejected', rejectionReason)}
                disabled={!rejectionReason.trim() || actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs text-indigo-400 font-bold">{selectedBooking.booking_code}</span>
                <h3 className="text-lg font-bold text-white">Booking Details</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block mb-1">Faculty</span>
                  <span className="font-semibold text-slate-200">{selectedBooking.faculty?.name}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">{selectedBooking.faculty?.email}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block mb-1">Status</span>
                  <StatusBadge value={getDisplayStatus(selectedBooking)} statusMap={defaultBookingStatus} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-xs text-slate-400">Laboratory &amp; Schedule</div>
                <div className="font-medium text-slate-200">{selectedBooking.lab?.lab_name} ({selectedBooking.lab?.lab_code})</div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>{selectedBooking.booking_date}</span>
                  <span className="text-indigo-400 font-mono">{selectedBooking.start_time.slice(0, 5)} – {selectedBooking.end_time.slice(0, 5)}</span>
                </div>
                <div className="text-xs text-slate-400 pt-1">
                  Students: {selectedBooking.number_of_students} / Lab Capacity {selectedBooking.lab?.capacity}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1">Session Purpose</span>
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{selectedBooking.purpose}</p>
              </div>

              {selectedBooking.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200">
                  <span className="text-xs font-semibold block text-red-300 mb-1">Rejection Reason:</span>
                  <p className="text-xs leading-relaxed">{selectedBooking.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
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
