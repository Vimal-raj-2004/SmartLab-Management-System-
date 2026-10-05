import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, CheckCircle2, Clock, Filter, Eye, UserCheck, 
  Wrench, Trash2, RefreshCw, Plus, Search, Check, AlertCircle,
  FileText, Laptop, ArrowRight
} from 'lucide-react';
import { complaintService, labService, userManagementService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';
import { RoleBadge } from '../../components/RoleBadge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

export const ComplaintManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
  const [stats, setStats] = useState({ total: 0, open: 0, assigned: 0, in_progress: 0, resolved: 0, high_severity: 0 });
  const [labs, setLabs] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterLab, setFilterLab] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Modals state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view', 'assign', 'status', 'resolve', 'create-maint'
  const [assignTarget, setAssignTarget] = useState('');
  const [statusTarget, setStatusTarget] = useState('In Progress');
  const [notesInput, setNotesInput] = useState('');
  const [setPcWorkingCheck, setSetPcWorkingCheck] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load labs & staff
  useEffect(() => {
    labService.getAll({ page_size: 100 }).then(d => setLabs(d.items || [])).catch(console.error);
    userManagementService.getAll({ page_size: 100 }).then(d => {
      // Filter assistants and admins for assignment
      const staff = (d.items || []).filter(u => u.role === 'lab_assistant' || u.role === 'admin');
      setStaffUsers(staff);
    }).catch(console.error);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(() => {
    complaintService.getStats(filterLab ? Number(filterLab) : undefined)
      .then(setStats)
      .catch(console.error);
  }, [filterLab]);

  // Fetch complaints
  const fetchComplaints = useCallback(() => {
    setIsLoading(true);
    complaintService.getAll({
      page,
      page_size: 15,
      lab_id: filterLab || undefined,
      status: filterStatus || undefined,
      severity: filterSeverity || undefined,
      priority: filterPriority || undefined,
      search: search || undefined,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, filterLab, filterStatus, filterSeverity, filterPriority, search]);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints, fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [search, filterLab, filterStatus, filterSeverity, filterPriority]);

  // Handle Assign
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignTarget) return;
    setIsProcessing(true);
    try {
      await complaintService.assign(selectedComplaint.id, Number(assignTarget));
      closeModal();
      fetchComplaints();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign complaint');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await complaintService.updateStatus(selectedComplaint.id, {
        status: statusTarget,
        notes: notesInput.trim() || undefined,
      });
      closeModal();
      fetchComplaints();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Resolve
  const handleResolve = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await complaintService.resolve(selectedComplaint.id, {
        notes: notesInput.trim() || 'Resolved by laboratory assistant.',
        set_pc_working: setPcWorkingCheck,
      });
      closeModal();
      fetchComplaints();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve complaint');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle 1-click Create Maintenance
  const handleCreateMaintenance = async (complaint) => {
    if (!window.confirm(`Create active maintenance job for ticket ${complaint.complaint_code}?\n\nThis will set workstation ${complaint.pc?.pc_code || 'PC'} to "Maintenance" status and mark ticket as "In Progress".`)) {
      return;
    }
    try {
      await complaintService.createMaintenance(complaint.id);
      fetchComplaints();
      fetchStats();
      navigate('/maintenance');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create maintenance task');
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await complaintService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchComplaints();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete complaint');
    }
  };

  const closeModal = () => {
    setSelectedComplaint(null);
    setModalMode(null);
    setAssignTarget('');
    setNotesInput('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Complaint Management"
        subtitle="Review, filter, assign, and resolve student & faculty laboratory trouble tickets"
        action={{
          label: 'Submit Complaint',
          icon: Plus,
          onClick: () => navigate('/complaints/new'),
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400">Total Tickets</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Open</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.open}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>In Progress</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.in_progress}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Resolved</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.resolved}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>High Severity</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.high_severity}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, machine, description..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Lab filter */}
          <select
            value={filterLab}
            onChange={(e) => setFilterLab(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Laboratories</option>
            {labs.map(l => (
              <option key={l.id} value={l.id}>{l.lab_code} - {l.lab_name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-500">Loading complaints...</p>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No complaints matching criteria"
          description="Everything is clear! There are no complaints matching your current filter settings."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">PC / Lab</th>
                  <th className="py-3 px-4">Issue Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {data.items.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {complaint.complaint_code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-200">{complaint.submitter?.name || 'User'}</p>
                      <span className="text-[10px] text-slate-500 capitalize">{complaint.submitter?.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-200">{complaint.pc?.pc_code || 'General PC'}</p>
                      <p className="text-[10px] text-slate-500">{complaint.lab?.lab_code || 'Lab'}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {complaint.complaint_type}
                    </td>
                    <td className="py-3 px-4">
                      <Badge value={complaint.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge value={complaint.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {complaint.assignee ? (
                        <div>
                          <span className="font-medium text-slate-200">{complaint.assignee.name}</span>
                          <p className="text-[10px] text-slate-500 capitalize mt-0.5">
                            {complaint.assignee.role?.replace('_', ' ')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => { setSelectedComplaint(complaint); setModalMode('view'); }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Assign Button */}
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setAssignTarget(complaint.assigned_to ? String(complaint.assigned_to) : '');
                            setModalMode('assign');
                          }}
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                          title="Assign Staff"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>

                        {/* Update Status & Notes */}
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setStatusTarget(complaint.status);
                            setNotesInput('');
                            setModalMode('status');
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
                          title="Change Status & Notes"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick 1-click Create Maintenance */}
                        {complaint.status !== 'Resolved' && complaint.pc_id && (
                          <button
                            onClick={() => handleCreateMaintenance(complaint)}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                            title="Start Maintenance Job"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Mark Resolved */}
                        {complaint.status !== 'Resolved' && (
                          <button
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setNotesInput('');
                              setSetPcWorkingCheck(true);
                              setModalMode('resolve');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            title="Mark as Resolved"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Admin Delete */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(complaint)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            totalItems={data.total}
            pageSize={data.page_size}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && selectedComplaint && (
        <Modal
          title={`Ticket Details — ${selectedComplaint.complaint_code}`}
          isOpen={true}
          onClose={closeModal}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500">Ticket Status:</span>
                <div className="flex gap-2 mt-1">
                  <Badge value={selectedComplaint.status} />
                  <Badge value={selectedComplaint.severity} label={`Severity: ${selectedComplaint.severity}`} />
                  <Badge value={selectedComplaint.priority} label={`Priority: ${selectedComplaint.priority}`} />
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Created: {new Date(selectedComplaint.created_at).toLocaleString()}</p>
                {selectedComplaint.resolved_at && (
                  <p className="text-emerald-400">Resolved: {new Date(selectedComplaint.resolved_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-slate-500">Submitter</p>
                <p className="font-semibold text-white mt-0.5">{selectedComplaint.submitter?.name}</p>
                <p className="text-slate-400">{selectedComplaint.submitter?.email} ({selectedComplaint.submitter?.role})</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-slate-500">Workstation & Lab</p>
                <p className="font-semibold text-white mt-0.5">{selectedComplaint.pc?.pc_code} ({selectedComplaint.pc?.computer_name})</p>
                <p className="text-slate-400">{selectedComplaint.lab?.lab_name}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
              <p className="text-xs font-semibold text-slate-400">Description</p>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.notes && (
              <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-blue-400">Maintenance & Resolution Log</p>
                <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  {selectedComplaint.notes}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      {modalMode === 'assign' && selectedComplaint && (
        <Modal
          title={`Assign Ticket ${selectedComplaint.complaint_code}`}
          isOpen={true}
          onClose={closeModal}
        >
          <form onSubmit={handleAssign} className="space-y-4">
            <p className="text-xs text-slate-400">
              Assign this complaint to a technical support staff member or lab assistant:
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Staff Member
              </label>
              <select
                value={assignTarget}
                onChange={(e) => setAssignTarget(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select Staff --</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {isProcessing ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status & Notes Modal */}
      {modalMode === 'status' && selectedComplaint && (
        <Modal
          title={`Update Status — ${selectedComplaint.complaint_code}`}
          isOpen={true}
          onClose={closeModal}
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={statusTarget}
                onChange={(e) => setStatusTarget(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Add Maintenance Note
              </label>
              <textarea
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Diagnostic steps taken, parts inspected, estimated time to fix..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {isProcessing ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Mark Resolved Modal */}
      {modalMode === 'resolve' && selectedComplaint && (
        <Modal
          title={`Mark Complaint as Resolved — ${selectedComplaint.complaint_code}`}
          isOpen={true}
          onClose={closeModal}
        >
          <form onSubmit={handleResolve} className="space-y-4">
            <p className="text-xs text-slate-400">
              Confirm that this issue has been resolved and the workstation is operational.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Resolution Summary Notes
              </label>
              <textarea
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                required
                placeholder="What action was taken to fix the issue? (e.g. Replaced cable, reinstalled graphics driver)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {selectedComplaint.pc_id && (
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setPcWorkingCheck}
                  onChange={(e) => setSetPcWorkingCheck(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span>Restore computer <strong>{selectedComplaint.pc?.pc_code}</strong> status back to <strong>Working</strong></span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                {isProcessing ? 'Resolving...' : 'Confirm Resolved'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Complaint"
          message={`Are you sure you want to delete complaint ${deleteTarget.complaint_code}? This action cannot be undone.`}
          confirmLabel="Delete"
          isOpen={true}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          isDanger
        />
      )}
    </div>
  );
};
