import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wrench, Plus, Search, RefreshCw, CheckCircle2, Clock, 
  AlertTriangle, Laptop, UserCheck, Eye, Trash2, Check,
  Activity, ArrowRight
} from 'lucide-react';
import { maintenanceService, pcService, labService, userManagementService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

const MAINTENANCE_TYPES = [
  'Hardware Repair',
  'OS Reinstallation',
  'Software Configuration',
  'Component Replacement',
  'Peripherals Servicing',
  'Network Troubleshooting',
  'Routine Preventive Servicing',
  'Other',
];

const emptyForm = {
  pc_id: '',
  complaint_id: '',
  issue_description: '',
  maintenance_type: 'Hardware Repair',
  assigned_to: '',
  status: 'In Progress',
  set_pc_maintenance: true,
  notes: '',
};

export const MaintenanceManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [pcs, setPcs] = useState([]);
  const [labs, setLabs] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLab, setFilterLab] = useState('');

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'create', 'view', 'edit', 'complete'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeSetWorking, setCompleteSetWorking] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    labService.getAll({ page_size: 100 }).then(d => setLabs(d.items || [])).catch(console.error);
    pcService.getAll({ page_size: 150 }).then(d => setPcs(d.items || [])).catch(console.error);
    userManagementService.getAll({ page_size: 100 }).then(d => {
      const staff = (d.items || []).filter(u => u.role === 'lab_assistant' || u.role === 'admin');
      setStaffUsers(staff);
    }).catch(console.error);
  }, []);

  const fetchStats = useCallback(() => {
    maintenanceService.getStats(filterLab ? Number(filterLab) : undefined)
      .then(setStats)
      .catch(console.error);
  }, [filterLab]);

  const fetchRecords = useCallback(() => {
    setIsLoading(true);
    maintenanceService.getAll({
      page,
      page_size: 15,
      lab_id: filterLab || undefined,
      status: filterStatus || undefined,
      search: search || undefined,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, filterLab, filterStatus, search]);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterLab]);

  // Handle Create / Edit save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.pc_id) {
      setFormError('Please select a computer.');
      return;
    }
    if (!form.issue_description.trim()) {
      setFormError('Please provide an issue description.');
      return;
    }

    setFormError('');
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await maintenanceService.create({
          pc_id: Number(form.pc_id),
          complaint_id: form.complaint_id ? Number(form.complaint_id) : undefined,
          issue_description: form.issue_description.trim(),
          maintenance_type: form.maintenance_type,
          assigned_to: form.assigned_to ? Number(form.assigned_to) : user.id,
          status: form.status,
          set_pc_maintenance: form.set_pc_maintenance,
          notes: form.notes.trim() || undefined,
        });
      } else if (modalMode === 'edit') {
        await maintenanceService.update(selectedRecord.id, {
          issue_description: form.issue_description.trim(),
          maintenance_type: form.maintenance_type,
          assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
          status: form.status,
          notes: form.notes.trim() || undefined,
        });
      }
      closeModal();
      fetchRecords();
      fetchStats();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save maintenance record.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Complete
  const handleComplete = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await maintenanceService.complete(selectedRecord.id, {
        notes: completeNotes.trim() || 'Servicing completed successfully.',
        set_pc_working: completeSetWorking,
      });
      closeModal();
      fetchRecords();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to complete maintenance.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick toggle PC status
  const handleTogglePCStatus = async (pcId, currentStatus) => {
    const isMaintenance = (currentStatus || '').toLowerCase() === 'maintenance';
    const target = isMaintenance ? 'working' : 'maintenance';
    try {
      await maintenanceService.setPCStatus(pcId, target, `Status toggled via Maintenance page by ${user.name}`);
      fetchRecords();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle PC status');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await maintenanceService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete maintenance record');
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRecord(null);
    setForm(emptyForm);
    setFormError('');
    setCompleteNotes('');
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      assigned_to: String(user?.id || ''),
    });
    setFormError('');
    setModalMode('create');
  };

  const openEdit = (record) => {
    setSelectedRecord(record);
    setForm({
      pc_id: String(record.pc_id),
      complaint_id: record.complaint_id ? String(record.complaint_id) : '',
      issue_description: record.issue_description,
      maintenance_type: record.maintenance_type,
      assigned_to: record.assigned_to ? String(record.assigned_to) : '',
      status: record.status,
      set_pc_maintenance: false,
      notes: record.notes || '',
    });
    setFormError('');
    setModalMode('edit');
  };

  const openComplete = (record) => {
    setSelectedRecord(record);
    setCompleteNotes('');
    setCompleteSetWorking(true);
    setModalMode('complete');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Maintenance Management"
        subtitle="Schedule, assign, and track technical repairs and preventive maintenance on lab PCs"
        action={{
          label: 'New Maintenance Task',
          icon: Plus,
          onClick: openCreate,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400">Total Tasks</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Pending</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.pending}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>In Progress</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.in_progress}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Completed</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machine, issue, notes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

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
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-500">Loading maintenance records...</p>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance records found"
          description="No tasks match your current criteria. Create a maintenance task to get started."
          action={{
            label: "Create Maintenance Task",
            onClick: openCreate,
          }}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Workstation</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {data.items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      #{m.id}
                      {m.complaint && (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {m.complaint.complaint_code}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-slate-200">{m.pc?.pc_code}</p>
                          <p className="text-[10px] text-slate-500">{m.pc?.lab?.lab_code || 'Lab'}</p>
                        </div>
                        {/* Quick switch button */}
                        <button
                          onClick={() => handleTogglePCStatus(m.pc_id, m.pc?.status)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all"
                          title="Click to toggle PC status"
                        >
                          <Badge value={m.pc?.status} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {m.maintenance_type}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-300 truncate" title={m.issue_description}>
                      {m.issue_description}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.assigned_technician?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge value={m.status} />
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      <p>Start: {new Date(m.start_date).toLocaleDateString()}</p>
                      {m.completion_date && (
                        <p className="text-emerald-400">Done: {new Date(m.completion_date).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => { setSelectedRecord(m); setModalMode('view'); }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Complete Button */}
                        {m.status !== 'Completed' && (
                          <button
                            onClick={() => openComplete(m)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            title="Complete Maintenance"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit Task"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin Delete */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(m)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Delete Record"
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

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal
          title={modalMode === 'create' ? 'Create Maintenance Task' : `Edit Maintenance Task #${selectedRecord?.id}`}
          isOpen={true}
          onClose={closeModal}
          size="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Workstation <span className="text-rose-400">*</span>
                </label>
                <select
                  value={form.pc_id}
                  disabled={modalMode === 'edit'}
                  onChange={(e) => setForm(f => ({ ...f, pc_id: e.target.value }))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Workstation --</option>
                  {pcs.map(p => (
                    <option key={p.id} value={p.id}>{p.pc_code} - {p.computer_name} ({p.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Maintenance Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={form.maintenance_type}
                  onChange={(e) => setForm(f => ({ ...f, maintenance_type: e.target.value }))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {MAINTENANCE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Assigned Technician
                </label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Issue Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={form.issue_description}
                onChange={(e) => setForm(f => ({ ...f, issue_description: e.target.value }))}
                required
                placeholder="Describe fault, diagnostic findings, or scheduled servicing details..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Notes & Progress Log
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Component part serials, diagnostics, or observations..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {modalMode === 'create' && (
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.set_pc_maintenance}
                  onChange={(e) => setForm(f => ({ ...f, set_pc_maintenance: e.target.checked }))}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Set computer status to <strong>Maintenance</strong> during servicing</span>
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
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {isSaving ? 'Saving...' : 'Save Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Complete Modal */}
      {modalMode === 'complete' && selectedRecord && (
        <Modal
          title={`Complete Maintenance Task #${selectedRecord.id}`}
          isOpen={true}
          onClose={closeModal}
        >
          <form onSubmit={handleComplete} className="space-y-4">
            <p className="text-xs text-slate-400">
              Finalize this maintenance task, log servicing notes, and restore computer back to Working state.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Completion Notes & Parts Summary
              </label>
              <textarea
                rows={3}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="What was serviced, replaced, or updated? Confirmed machine boot & test."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={completeSetWorking}
                onChange={(e) => setCompleteSetWorking(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-0"
              />
              <span>Set computer <strong>{selectedRecord.pc?.pc_code}</strong> status back to <strong>Working</strong></span>
            </label>

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
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                {isSaving ? 'Completing...' : 'Mark Completed'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {modalMode === 'view' && selectedRecord && (
        <Modal
          title={`Maintenance Record #${selectedRecord.id}`}
          isOpen={true}
          onClose={closeModal}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500">Status:</span>
                <div className="mt-1">
                  <Badge value={selectedRecord.status} />
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Started: {new Date(selectedRecord.start_date).toLocaleString()}</p>
                {selectedRecord.completion_date && (
                  <p className="text-emerald-400 mt-0.5">Completed: {new Date(selectedRecord.completion_date).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-slate-500">Workstation</p>
                <p className="font-semibold text-white mt-0.5">{selectedRecord.pc?.pc_code} ({selectedRecord.pc?.computer_name})</p>
                <p className="text-slate-400">Status: {selectedRecord.pc?.status}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-slate-500">Technician</p>
                <p className="font-semibold text-white mt-0.5">{selectedRecord.assigned_technician?.name || 'Unassigned'}</p>
                <p className="text-slate-400">{selectedRecord.assigned_technician?.email}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
              <p className="text-xs font-semibold text-slate-400">Issue Description</p>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedRecord.issue_description}</p>
            </div>

            {selectedRecord.notes && (
              <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-blue-400">Service Notes</p>
                <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  {selectedRecord.notes}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Maintenance Record"
          message={`Are you sure you want to delete maintenance record #${deleteTarget.id}? This action cannot be undone.`}
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
