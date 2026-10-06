import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Eye, Clock, CheckCircle2, AlertTriangle,
  Search, Filter, X, Monitor, Calendar, User, Loader2, Bell, UserCheck
} from 'lucide-react';
import { complaintService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge, {
  defaultComplaintStatus,
  defaultSeverity,
  defaultPriority,
} from '../../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function MyComplaintsPage() {
  const { user } = useAuth();
  const rolePrefix = user?.role === 'lab_assistant' ? 'assistant' : user?.role;

  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        page_size: 10,
        my_only: true,
      };
      if (search.trim()) params.search = search.trim();
      if (filterStatus) params.status = filterStatus;

      const { data } = await complaintService.list(params);
      setComplaints(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && viewModalOpen) {
        setViewModalOpen(false);
      }
    };
    if (viewModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [viewModalOpen]);

  const openView = (c) => {
    setSelectedComplaint(c);
    setViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            My Submitted Complaints
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and view status updates for your {total} reported lab issue{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to={`/${rolePrefix}/complaints/new`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Submit New Complaint
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, type, description..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading complaints...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300 mb-3">{error}</p>
          <button
            onClick={fetchComplaints}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm">
          <CheckCircle2 className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No complaints found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            You currently have no complaints matching the search filter. If you encounter any PC or lab issue, submit a complaint.
          </p>
          <Link
            to={`/${rolePrefix}/complaints/new`}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Submit Complaint
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">PC / Lab</th>
                    <th className="px-5 py-3.5">Issue Category</th>
                    <th className="px-5 py-3.5 text-center">Severity</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5">Submitted</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-400">
                        {c.complaint_code}
                      </td>
                      <td className="px-5 py-4">
                        {c.pc ? (
                          <div>
                            <p className="font-medium text-white">{c.pc.pc_code}</p>
                            <p className="text-xs text-slate-400">{c.lab ? c.lab.lab_name : c.pc.computer_name}</p>
                          </div>
                        ) : c.lab ? (
                          <span className="text-slate-300">{c.lab.lab_name}</span>
                        ) : (
                          <span className="text-slate-500">General Lab</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-200">{c.complaint_type}</td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge value={c.severity} statusMap={defaultSeverity} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge value={c.status} statusMap={defaultComplaintStatus} />
                        {c.assignee && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-indigo-400 font-medium">
                            <UserCheck className="w-3 h-3" />
                            <span>{c.assignee.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openView(c)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-indigo-400">
                    {c.complaint_code}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.assignee && (
                      <span className="text-[11px] text-indigo-300 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {c.assignee.name}
                      </span>
                    )}
                    <StatusBadge value={c.status} statusMap={defaultComplaintStatus} />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white text-sm">{c.complaint_type}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{c.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.pc?.pc_code || c.lab?.lab_name || 'General'}</span>
                  </div>
                  <button
                    onClick={() => openView(c)}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details View Modal */}
      {selectedComplaint && viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          {/* Backdrop Click Layer */}
          <div
            className="fixed inset-0"
            onClick={() => setViewModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header - Always visible and sticky */}
            <div className="flex-shrink-0 sticky top-0 bg-slate-900 z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800">
              <h3 className="font-semibold text-white text-base">
                Complaint {selectedComplaint.complaint_code}
              </h3>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                aria-label="Close complaint details"
                title="Close"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 sm:py-5 space-y-4 text-sm text-slate-300 min-h-0">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs font-semibold uppercase text-slate-400">Current Status</span>
                <StatusBadge value={selectedComplaint.status} statusMap={defaultComplaintStatus} />
              </div>

              <dl className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <dt className="text-slate-400">Category</dt>
                  <dd className="font-medium text-white">{selectedComplaint.complaint_type}</dd>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <dt className="text-slate-400">Severity</dt>
                  <dd><StatusBadge value={selectedComplaint.severity} statusMap={defaultSeverity} /></dd>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <dt className="text-slate-400">Priority</dt>
                  <dd><StatusBadge value={selectedComplaint.priority} statusMap={defaultPriority} /></dd>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <dt className="text-slate-400">Target PC</dt>
                  <dd className="text-white font-medium">
                    {selectedComplaint.pc ? `${selectedComplaint.pc.pc_code} (${selectedComplaint.pc.computer_name})` : 'None specified'}
                  </dd>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <dt className="text-slate-400">Assigned Technician</dt>
                  <dd className="text-white">
                    {selectedComplaint.assignee ? (
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        {selectedComplaint.assignee.name}
                        <span className="text-slate-400 text-[10px] capitalize">({selectedComplaint.assignee.role?.replace('_', ' ')})</span>
                      </span>
                    ) : 'Pending assignment'}
                  </dd>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <dt className="text-slate-400">Submitted Date</dt>
                  <dd className="text-white">{new Date(selectedComplaint.created_at).toLocaleString()}</dd>
                </div>

                {selectedComplaint.resolved_at && (
                  <div className="flex justify-between py-1.5 border-b border-slate-800 text-green-400">
                    <dt className="font-semibold">Resolved On</dt>
                    <dd>{new Date(selectedComplaint.resolved_at).toLocaleString()}</dd>
                  </div>
                )}
              </dl>

              {/* Resolution notification banner */}
              {(selectedComplaint.status === 'resolved' || selectedComplaint.status === 'closed') && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-emerald-300">Your complaint has been resolved!</p>
                  </div>
                  {selectedComplaint.assignee && (
                    <p className="text-xs text-emerald-200">
                      Fixed by: <strong>{selectedComplaint.assignee.name}</strong>
                    </p>
                  )}
                  {selectedComplaint.notes && (
                    <div className="mt-1">
                      <p className="text-[10px] text-emerald-400 font-semibold uppercase mb-1">Resolution Notes</p>
                      <p className="text-xs text-emerald-100 bg-emerald-950/40 rounded-lg p-2 whitespace-pre-wrap">
                        {selectedComplaint.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Description</p>
                <div className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-xl text-slate-200 text-xs sm:text-sm whitespace-pre-wrap">
                  {selectedComplaint.description}
                </div>
              </div>
            </div>

            {/* Footer - Always visible and sticky */}
            <div className="flex-shrink-0 sticky bottom-0 bg-slate-900 z-10 px-5 sm:px-6 py-3 bg-slate-800/40 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
