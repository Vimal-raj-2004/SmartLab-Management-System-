import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Clock, Wrench, UserCheck, Eye,
  Filter, ShieldAlert, Check, Sparkles, BrainCircuit, Info, Layers, Bell, X
} from 'lucide-react';
import { complaintService, labService, userService, maintenanceService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
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

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function ComplaintManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const rolePrefix = user?.role === 'lab_assistant' ? 'assistant' : user?.role;

  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterLab, setFilterLab] = useState('');
  const [labs, setLabs] = useState([]);
  const [assistants, setAssistants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [fixModalOpen, setFixModalOpen] = useState(false);   // Quick Mark-as-Fixed modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Quick Fix form state
  const [fixForm, setFixForm] = useState({ notes: '', set_pc_working: true });
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState('');

  // Phase 5C: AI Model Stats Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModelStats, setAiModelStats] = useState(null);
  const [loadingAiStats, setLoadingAiStats] = useState(false);

  // Update Form
  const [updateForm, setUpdateForm] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    resolution_notes: '',
    set_pc_working: true,
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Success notification toast
  const [toast, setToast] = useState(null); // { message, type: 'success'|'info' }
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Schedule Maintenance Form
  const [maintForm, setMaintForm] = useState({
    issue_description: '',
    maintenance_type: 'Hardware Repair',
    assigned_to: '',
    notes: '',
  });
  const [maintSubmitting, setMaintSubmitting] = useState(false);
  const [maintError, setMaintError] = useState('');

  // Initial load of labs and potential assignees (lab assistants and admins)
  // Load for BOTH admin and lab_assistant roles so technician dropdown always works
  useEffect(() => {
    labService.list({ page_size: 100 }).then((res) => setLabs(res.data.items || []));
    // Load staff list for admin OR lab_assistant — both can assign complaints
    if (user?.role === 'admin' || user?.role === 'lab_assistant') {
      userService.list({ page_size: 100 }).then((res) => {
        const staff = (res.data.items || []).filter(
          (u) => u.role === 'admin' || u.role === 'lab_assistant'
        );
        setAssistants(staff);
      }).catch(() => {
        // fallback: include self for lab_assistant
        if (user?.role === 'lab_assistant') setAssistants([user]);
      });
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await complaintService.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        page_size: 10,
      };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterPriority) params.priority = filterPriority;
      if (filterLab) params.lab_id = filterLab;

      const { data } = await complaintService.list(params);
      setComplaints(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterSeverity, filterPriority, filterLab]);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterSeverity, filterPriority, filterLab]);

  const openAiModelStats = async () => {
    setAiModalOpen(true);
    if (!aiModelStats) {
      setLoadingAiStats(true);
      try {
        const res = await complaintService.getAIModelStats();
        setAiModelStats(res.data);
      } catch (err) {
        console.warn('Failed to fetch AI model stats:', err?.message);
      } finally {
        setLoadingAiStats(false);
      }
    }
  };

  const handleQuickChangePriority = async (complaintId, newPriority) => {
    try {
      await complaintService.update(complaintId, {
        priority: newPriority,
        final_priority: newPriority,
      });
      setSelectedComplaint((prev) =>
        prev && prev.id === complaintId
          ? { ...prev, priority: newPriority, final_priority: newPriority }
          : prev
      );
      fetchComplaints();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update priority.');
    }
  };

  const openView = (c) => {
    setSelectedComplaint(c);
    setViewModalOpen(true);
  };

  const openUpdate = (c) => {
    setSelectedComplaint(c);
    setUpdateForm({
      status: c.status,
      priority: c.final_priority || c.priority,
      // Pre-fill assigned_to from the nested assignee object if available
      assigned_to: c.assigned_to || c.assignee?.id || '',
      resolution_notes: '',
      set_pc_working: true,
    });
    setUpdateError('');
    setUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateError('');

    const isResolving = updateForm.status === 'resolved' || updateForm.status === 'closed';

    try {
      const payload = {
        status: updateForm.status,
        priority: updateForm.priority,
        final_priority: updateForm.priority,
        assigned_to: updateForm.assigned_to ? Number(updateForm.assigned_to) : null,
      };

      // If marking as resolved, include resolution notes in the notes field
      if (isResolving && updateForm.resolution_notes.trim()) {
        payload.notes = updateForm.resolution_notes.trim();
      }

      await complaintService.update(selectedComplaint.id, payload);

      // If the complaint had a PC and user wants to restore it, call the resolve endpoint
      if (isResolving && selectedComplaint.pc_id && updateForm.set_pc_working) {
        try {
          await complaintService.resolve(selectedComplaint.id, {
            notes: updateForm.resolution_notes.trim() || 'Resolved by technician.',
            set_pc_working: true,
          });
        } catch (_) { /* ignore if already resolved */ }
      }

      setUpdateModalOpen(false);
      fetchComplaints();
      fetchStats();

      // Show notification
      if (isResolving) {
        showToast(
          `✅ Complaint ${selectedComplaint.complaint_code} marked as Resolved. The student and admin have been notified.`,
          'success'
        );
      } else if (updateForm.assigned_to) {
        const assigneeName = assistants.find((a) => String(a.id) === String(updateForm.assigned_to))?.name || 'technician';
        showToast(
          `👤 Complaint assigned to ${assigneeName}. Student will see updated status.`,
          'info'
        );
      } else {
        showToast('Complaint updated successfully.', 'info');
      }
    } catch (err) {
      setUpdateError(err.response?.data?.detail || 'Failed to update complaint.');
    } finally {
      setUpdating(false);
    }
  };

  const openFix = (c) => {
    setSelectedComplaint(c);
    setFixForm({ notes: '', set_pc_working: true });
    setFixError('');
    setFixModalOpen(true);
  };

  const handleQuickFix = async (e) => {
    e.preventDefault();
    if (!fixForm.notes.trim()) {
      setFixError('Please describe what you did to fix the issue.');
      return;
    }
    setFixing(true);
    setFixError('');
    try {
      // Update complaint status to resolved with notes
      await complaintService.update(selectedComplaint.id, {
        status: 'resolved',
        notes: fixForm.notes.trim(),
      });
      // Restore PC status to Working if checkbox checked
      if (fixForm.set_pc_working && selectedComplaint.pc_id) {
        try {
          await complaintService.resolve(selectedComplaint.id, {
            notes: fixForm.notes.trim(),
            set_pc_working: true,
          });
        } catch (_) { /* ignore double-resolve */ }
      }
      setFixModalOpen(false);
      fetchComplaints();
      fetchStats();
      showToast(
        `✅ Complaint ${selectedComplaint.complaint_code} marked as Fixed! Student and admin notified.`,
        'success'
      );
    } catch (err) {
      setFixError(err.response?.data?.detail || 'Failed to mark as fixed.');
    } finally {
      setFixing(false);
    }
  };

  const openScheduleMaintenance = (c) => {
    setSelectedComplaint(c);
    setMaintForm({
      issue_description: `Complaint ${c.complaint_code}: ${c.description}`,
      maintenance_type: 'Hardware Repair',
      assigned_to: user?.id,
      notes: '',
    });
    setMaintError('');
    setMaintModalOpen(true);
  };

  const handleScheduleMaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaint?.pc_id) {
      setMaintError('This complaint is not linked to a specific PC asset.');
      return;
    }
    setMaintSubmitting(true);
    setMaintError('');

    try {
      await maintenanceService.create({
        pc_id: selectedComplaint.pc_id,
        complaint_id: selectedComplaint.id,
        issue_description: maintForm.issue_description,
        maintenance_type: maintForm.maintenance_type,
        assigned_to: maintForm.assigned_to ? Number(maintForm.assigned_to) : user?.id,
        status: 'in_progress',
        notes: maintForm.notes,
        update_pc_status: true,
      });

      setMaintModalOpen(false);
      fetchComplaints();
      fetchStats();
      navigate(`/${rolePrefix}/maintenance`);
    } catch (err) {
      setMaintError(err.response?.data?.detail || 'Failed to create maintenance job.');
    } finally {
      setMaintSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-start gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border max-w-sm text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-700/60 text-emerald-200'
              : 'bg-indigo-950 border-indigo-700/60 text-indigo-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Bell className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <PageHeader
        title="Complaint Management"
        subtitle={`Review, assign, prioritize, and resolve student and faculty laboratory issues (${total} total)`}
        action={
          <button
            onClick={openAiModelStats}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            AI Priority Model Stats
          </button>
        }
      />

      {/* Top Stats Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', count: stats.total, color: 'bg-slate-100 text-slate-700' },
            { label: 'Open', count: stats.open, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Assigned', count: stats.assigned, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { label: 'In Progress', count: stats.in_progress, color: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Resolved', count: stats.resolved, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Closed', count: stats.closed, color: 'bg-gray-100 text-gray-600' },
          ].map((s) => (
            <div key={s.label} className={`p-4 rounded-2xl border ${s.color} flex flex-col justify-center`}>
              <span className="text-2xl font-bold">{s.count}</span>
              <span className="text-xs font-medium uppercase tracking-wider mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search code, type, description..."
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterLab}
          onChange={(e) => setFilterLab(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Labs</option>
          {labs.map((l) => (
            <option key={l.id} value={l.id}>{l.lab_code}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading complaints..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchComplaints} />
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-semibold text-gray-800">No complaints found</p>
          <p className="text-sm text-gray-500 mt-1">
            All systems normal or no complaints match current filter criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Code</th>
                  <th className="px-5 py-3.5 text-left">Submitter</th>
                  <th className="px-5 py-3.5 text-left">PC / Lab</th>
                  <th className="px-5 py-3.5 text-left">Category</th>
                  <th className="px-5 py-3.5 text-center">Severity</th>
                  <th className="px-5 py-3.5 text-center">Priority</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-left">Assigned</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-600">
                      {c.complaint_code}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{c.submitter?.name || 'User'}</p>
                      <span className="text-[11px] text-gray-400 capitalize">{c.submitter?.role}</span>
                    </td>
                    <td className="px-5 py-4">
                      {c.pc ? (
                        <div>
                          <p className="font-semibold text-gray-800">{c.pc.pc_code}</p>
                          <p className="text-xs text-gray-400">{c.lab ? c.lab.lab_name : c.pc.computer_name}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500">{c.lab?.lab_name || 'General'}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-800 max-w-[150px] truncate">
                      {c.complaint_type}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge value={c.severity} statusMap={defaultSeverity} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge value={c.final_priority || c.priority} statusMap={defaultPriority} />
                        {c.ai_predicted_priority && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title={c.ai_prediction_reason || `AI suggested ${c.ai_predicted_priority}`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                            AI: {c.ai_predicted_priority}
                          </span>
                        )}
                        {c.final_priority && c.ai_predicted_priority && c.final_priority.toLowerCase() !== c.ai_predicted_priority.toLowerCase() && (
                          <span className="text-[9px] text-amber-600 font-medium">Overridden</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge value={c.status} statusMap={defaultComplaintStatus} />
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600">
                      {/* Show technician name from the nested assignee object */}
                      {c.assignee?.name ? (
                        <div>
                          <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {c.assignee.name}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
                            {c.assignee.role?.replace('_', ' ')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        const isResolved = c.status?.toLowerCase() === 'resolved' || c.status?.toLowerCase() === 'closed';
                        const assignedUserId = c.assignee?.id || c.assigned_to;
                        const isAssigned = Boolean(assignedUserId);
                        const isAssignedToMe = Boolean(isAssigned && user?.id && String(assignedUserId) === String(user?.id));
                        const canAssign = !isResolved && (user?.role === 'admin' || (!isAssigned && user?.role === 'lab_assistant'));

                        return (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details — always visible */}
                            <button
                              onClick={() => openView(c)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Update/Assign (UserCheck) — only for Admin (or Assistant on unassigned), hidden when resolved */}
                            {canAssign && (
                              <button
                                onClick={() => openUpdate(c)}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                                title="Assign & Update Status"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* Fix button — shown ONLY when:
                                1. Complaint IS assigned (never unassigned)
                                2. Assigned to the CURRENT logged-in user specifically (never for others)
                                3. Complaint is NOT yet resolved or closed
                            */}
                            {isAssignedToMe && !isResolved && (
                              <button
                                onClick={() => openFix(c)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm shadow-emerald-200"
                                title="Mark as Fixed / Resolved"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Fix
                              </button>
                            )}

                            {/* Schedule Maintenance — only for non-resolved PC complaints */}
                            {c.pc_id && !isResolved && user?.role === 'admin' && (
                              <button
                                onClick={() => openScheduleMaintenance(c)}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                                title="Schedule PC Maintenance"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* View Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Complaint ${selectedComplaint.complaint_code}`}
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-xs font-semibold uppercase text-gray-500">Status</span>
              <StatusBadge value={selectedComplaint.status} statusMap={defaultComplaintStatus} />
            </div>

            <dl className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Submitter</dt>
                <dd className="font-semibold text-gray-900">{selectedComplaint.submitter?.name} ({selectedComplaint.submitter?.email})</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">PC / Lab</dt>
                <dd className="font-medium text-gray-900">
                  {selectedComplaint.pc ? `${selectedComplaint.pc.pc_code} - ${selectedComplaint.pc.computer_name}` : selectedComplaint.lab?.lab_name || 'General'}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900">{selectedComplaint.complaint_type}</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Severity / Priority</dt>
                <dd className="flex gap-2">
                  <StatusBadge value={selectedComplaint.severity} statusMap={defaultSeverity} />
                  <StatusBadge value={selectedComplaint.priority} statusMap={defaultPriority} />
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Assigned Technician</dt>
                <dd className="font-medium text-gray-900">
                  {selectedComplaint.assignee ? selectedComplaint.assignee.name : 'Unassigned'}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Created At</dt>
                <dd className="text-gray-800">{new Date(selectedComplaint.created_at).toLocaleString()}</dd>
              </div>
              {selectedComplaint.resolved_at && (
                <div className="flex justify-between py-1.5 border-b border-gray-100 text-green-700">
                  <dt className="font-semibold">Resolved At</dt>
                  <dd>{new Date(selectedComplaint.resolved_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Description</p>
              <div className="p-3 bg-gray-50 rounded-xl text-gray-800 text-sm whitespace-pre-wrap">
                {selectedComplaint.description}
              </div>
            </div>

            {/* Phase 5C: AI Priority Assessment Panel */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    AI Decision Tree Analysis
                  </span>
                </div>
                {selectedComplaint.ai_predicted_priority && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 capitalize">
                    Suggested: {selectedComplaint.ai_predicted_priority}
                    {selectedComplaint.ai_confidence ? ` (${(selectedComplaint.ai_confidence * 100).toFixed(0)}%)` : ''}
                  </span>
                )}
              </div>

              {selectedComplaint.ai_prediction_reason && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedComplaint.ai_prediction_reason}
                </p>
              )}

              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  Current Final Priority: <strong className="text-white capitalize">{selectedComplaint.final_priority || selectedComplaint.priority}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Staff Quick Set:</span>
                  {['low', 'medium', 'high', 'urgent'].map((prio) => (
                    <button
                      key={prio}
                      onClick={() => handleQuickChangePriority(selectedComplaint.id, prio)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-all ${
                        (selectedComplaint.final_priority || selectedComplaint.priority) === prio
                          ? 'bg-indigo-600 text-white font-bold ring-1 ring-white/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              {(() => {
                const isResolved = selectedComplaint.status?.toLowerCase() === 'resolved' || selectedComplaint.status?.toLowerCase() === 'closed';
                const assignedUserId = selectedComplaint.assignee?.id || selectedComplaint.assigned_to;
                const isAssigned = Boolean(assignedUserId);
                const isAssignedToMe = Boolean(isAssigned && user?.id && String(assignedUserId) === String(user?.id));
                const canAssign = !isResolved && (user?.role === 'admin' || (!isAssigned && user?.role === 'lab_assistant'));

                if (isResolved) {
                  return (
                    <div className="w-full flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>This complaint has been resolved and completed.</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-mono">Resolved</span>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Update/Assign button in view modal — only for Admin (or Assistant if unassigned) */}
                    {canAssign && (
                      <button
                        onClick={() => {
                          setViewModalOpen(false);
                          openUpdate(selectedComplaint);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Update / Assign
                      </button>
                    )}
                    {/* Fix button in view modal — only for the specifically assigned technician */}
                    {isAssignedToMe && (
                      <button
                        onClick={() => {
                          setViewModalOpen(false);
                          openFix(selectedComplaint);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        Mark as Fixed
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Update / Assign Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          title={`Update Complaint - ${selectedComplaint.complaint_code}`}
          size="md"
        >
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            {/* AI suggestion banner in update modal */}
            {selectedComplaint.ai_predicted_priority && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-indigo-950">
                    AI Suggested Priority: <span className="capitalize">{selectedComplaint.ai_predicted_priority}</span>
                    {selectedComplaint.ai_confidence ? ` (${(selectedComplaint.ai_confidence * 100).toFixed(0)}% confidence)` : ''}
                  </p>
                  <p className="text-indigo-700 mt-0.5 text-[11px]">
                    {selectedComplaint.ai_prediction_reason}
                  </p>
                </div>
              </div>
            )}

            <FormField
              label="Complaint Status"
              name="status"
              type="select"
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              options={STATUS_OPTIONS}
              required
            />

            <FormField
              label="Priority Level"
              name="priority"
              type="select"
              value={updateForm.priority}
              onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })}
              options={PRIORITY_OPTIONS}
              required
            />

            {/* Technician assignment — works for both admin and lab_assistant roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Assign Technician / Assistant
              </label>
              <select
                name="assigned_to"
                value={updateForm.assigned_to}
                onChange={(e) => setUpdateForm({ ...updateForm, assigned_to: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">— Unassigned —</option>
                {assistants.length > 0 ? (
                  assistants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({(a.role || '').replace(/_/g, ' ')})
                    </option>
                  ))
                ) : (
                  /* fallback: include current user if they are lab_assistant */
                  user?.role === 'lab_assistant' && (
                    <option value={user.id}>{user.name} (you — lab assistant)</option>
                  )
                )}
              </select>
            </div>

            {/* ── Mark as Resolved / Fixed section ── */}
            {(updateForm.status === 'resolved' || updateForm.status === 'closed') && (
              <div className="space-y-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Resolution Details
                </p>

                <div>
                  <label className="block text-xs font-medium text-emerald-900 mb-1">
                    Resolution Notes <span className="text-emerald-600">(what was done to fix it)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={updateForm.resolution_notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, resolution_notes: e.target.value })}
                    placeholder="e.g. Replaced RAM module, reinstalled OS, repaired network cable..."
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                </div>

                {selectedComplaint?.pc_id && (
                  <label className="flex items-center gap-2 text-xs text-emerald-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateForm.set_pc_working}
                      onChange={(e) => setUpdateForm({ ...updateForm, set_pc_working: e.target.checked })}
                      className="rounded border-emerald-300 text-emerald-600 focus:ring-0"
                    />
                    <span>Restore <strong>{selectedComplaint.pc?.pc_code}</strong> status back to <strong>Working</strong></span>
                  </label>
                )}

                <div className="pt-1 text-[11px] text-emerald-700 bg-emerald-100 rounded-lg p-2">
                  <Bell className="w-3.5 h-3.5 inline mr-1" />
                  The student who raised this complaint and the admin will be notified of the resolution.
                </div>
              </div>
            )}

            {updateError && (
              <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{updateError}</p>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUpdateModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Schedule Maintenance Modal from Complaint */}
      {selectedComplaint && (
        <Modal
          isOpen={maintModalOpen}
          onClose={() => setMaintModalOpen(false)}
          title={`Schedule PC Maintenance for ${selectedComplaint.pc?.pc_code}`}
          size="md"
        >
          <form onSubmit={handleScheduleMaint} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Scheduling maintenance will automatically update <strong>{selectedComplaint.pc?.pc_code}</strong> status to <strong>Maintenance</strong>, and link this complaint.
              </span>
            </div>

            <FormField
              label="Issue & Diagnosis"
              name="issue_description"
              type="textarea"
              value={maintForm.issue_description}
              onChange={(e) => setMaintForm({ ...maintForm, issue_description: e.target.value })}
              required
              rows={3}
            />

            <FormField
              label="Maintenance Type"
              name="maintenance_type"
              type="select"
              value={maintForm.maintenance_type}
              onChange={(e) => setMaintForm({ ...maintForm, maintenance_type: e.target.value })}
              options={[
                { value: 'Hardware Repair', label: 'Hardware Repair' },
                { value: 'Component Replacement', label: 'Component Replacement' },
                { value: 'Software Installation', label: 'Software Installation' },
                { value: 'OS Reinstallation', label: 'OS Reinstallation' },
                { value: 'Network Configuration', label: 'Network Configuration' },
                { value: 'Preventive Cleaning', label: 'Preventive Cleaning' },
                { value: 'Diagnostics', label: 'Diagnostics' },
                { value: 'Other', label: 'Other' },
              ]}
              required
            />

            <FormField
              label="Work Notes"
              name="notes"
              type="textarea"
              value={maintForm.notes}
              onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
              placeholder="Initial diagnostic notes, part serial numbers, etc."
              rows={2}
            />

            {maintError && (
              <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{maintError}</p>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMaintModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={maintSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                <Wrench className="w-4 h-4" />
                {maintSubmitting ? 'Scheduling...' : 'Confirm Maintenance'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          QUICK MARK AS FIXED Modal
          Shown when technician clicks the green Fix button
          ══════════════════════════════════════════════ */}
      {selectedComplaint && (
        <Modal
          isOpen={fixModalOpen}
          onClose={() => setFixModalOpen(false)}
          title={`Mark as Fixed — ${selectedComplaint.complaint_code}`}
          size="md"
        >
          <form onSubmit={handleQuickFix} className="space-y-4">
            {/* Complaint summary */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="font-semibold text-emerald-900 text-sm">Confirm Issue Resolved</p>
              </div>
              <p className="text-xs text-emerald-700 pl-7">
                Complaint: <strong>{selectedComplaint.complaint_type}</strong>
                {selectedComplaint.pc && (
                  <> &nbsp;|&nbsp; PC: <strong>{selectedComplaint.pc.pc_code}</strong></>
                )}
              </p>
              <p className="text-xs text-emerald-700 pl-7">
                Submitted by: <strong>{selectedComplaint.submitter?.name}</strong>
                &nbsp;({selectedComplaint.submitter?.role})
              </p>
            </div>

            {/* Resolution notes — required */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                What did you do to fix it? <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={fixForm.notes}
                onChange={(e) => setFixForm({ ...fixForm, notes: e.target.value })}
                placeholder="Describe the fix in detail&#10;e.g. Replaced faulty RAM module, reinstalled Windows, reconnected loose network cable, updated GPU driver..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                This note will be visible to the student and admin.
              </p>
            </div>

            {/* Restore PC checkbox */}
            {selectedComplaint.pc_id && (
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={fixForm.set_pc_working}
                  onChange={(e) => setFixForm({ ...fixForm, set_pc_working: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-0"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Restore <strong>{selectedComplaint.pc?.pc_code}</strong> to <strong>Working</strong> status
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Uncheck if PC still needs further inspection before it goes back online.
                  </p>
                </div>
              </label>
            )}

            {/* Notification info */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs">
              <Bell className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                On confirmation, the <strong>student</strong> who raised this and the <strong>admin</strong> will see the resolved status and your notes.
              </span>
            </div>

            {fixError && (
              <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{fixError}</p>
            )}

            <div className="pt-1 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFixModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={fixing}
                className="flex items-center gap-2 px-6 py-2.5 text-sm bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-200 transition-all"
              >
                <Check className="w-4 h-4" />
                {fixing ? 'Saving...' : 'Confirm Fixed ✓'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Phase 5C: AI Model Transparency & Metrics Modal */}

      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="AI Complaint Priority Model — TF-IDF + Decision Tree"
        size="lg"
      >
        <div className="space-y-4 text-sm">
          {loadingAiStats ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <span className="text-slate-500 text-xs">Loading AI Model Metrics…</span>
            </div>
          ) : aiModelStats ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                  <p className="text-xs text-indigo-600 font-semibold uppercase">Holdout Accuracy</p>
                  <p className="text-2xl font-bold text-indigo-950">{(aiModelStats.accuracy * 100).toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Training Dataset</p>
                  <p className="text-2xl font-bold text-slate-800">{aiModelStats.total_samples} samples</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Classifier</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">Decision Tree</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">NLP Vectorizer</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">TF-IDF (1-2 N-Grams)</p>
                </div>
              </div>

              {/* Confusion Matrix */}
              {aiModelStats.confusion_matrix && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Holdout Confusion Matrix (Actual vs Predicted)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 text-left border-r border-slate-200">Actual \ Predicted</th>
                          {aiModelStats.labels.map((l) => (
                            <th key={l} className="p-2 capitalize border-r border-slate-200">{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aiModelStats.confusion_matrix.map((row, rIdx) => (
                          <tr key={rIdx} className="border-t border-slate-200">
                            <td className="p-2 font-semibold text-left bg-slate-50 capitalize border-r border-slate-200">
                              {aiModelStats.labels[rIdx]}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`p-2 border-r border-slate-200 font-mono ${
                                  rIdx === cIdx ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-600'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Influential Features */}
              {aiModelStats.top_features && aiModelStats.top_features.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-indigo-600" />
                    Top Split Features in Decision Tree
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {aiModelStats.top_features.slice(0, 10).map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-mono text-slate-700 truncate">{f.feature}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold ml-2">
                          {(f.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Educational Workflow Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-300 text-xs leading-relaxed space-y-1.5">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  How the Prediction Pipeline Operates
                </p>
                <p>
                  1. <strong>TF-IDF Vectorization:</strong> Transforms the complaint text into statistical numerical weights based on Term Frequency (TF) and Inverse Document Frequency (IDF).
                </p>
                <p>
                  2. <strong>Structured Feature Fusion:</strong> Concatenates the TF-IDF sparse matrix with one-hot encoded issue category and numeric severity.
                </p>
                <p>
                  3. <strong>Decision Tree Splitting:</strong> Evaluates sequential Boolean decision rules to predict Low, Medium, or High priority.
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  * Note: The AI prediction is designed to assist lab staff with triage. Staff retain full authority to change or override the final priority.
                </p>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-6">No model stats available.</p>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setAiModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
