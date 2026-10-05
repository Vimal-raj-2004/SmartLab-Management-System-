import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Plus, CheckCircle2, Clock, Eye, AlertCircle, Check, Search, Calendar
} from 'lucide-react';
import { maintenanceService, pcService, userService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge, { defaultMaintenanceStatus, defaultPCStatus } from '../../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function MaintenanceManagementPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'lab_assistant';

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pcs, setPcs] = useState([]);
  const [types, setTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Create Form
  const [createForm, setCreateForm] = useState({
    pc_id: '',
    maintenance_type: 'Hardware Repair',
    issue_description: '',
    assigned_to: '',
    notes: '',
    status: 'in_progress',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Complete Form
  const [completeForm, setCompleteForm] = useState({
    notes: '',
    set_pc_status: 'working',
  });
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  useEffect(() => {
    Promise.all([
      pcService.list({ page_size: 100 }),
      maintenanceService.getTypes(),
    ]).then(([pcsRes, typesRes]) => {
      setPcs(pcsRes.data.items || []);
      setTypes(typesRes.data || []);
    });

    if (user?.role === 'admin') {
      userService.list({ page_size: 100 }).then((res) => {
        const staff = (res.data.items || []).filter(
          (u) => u.role === 'admin' || u.role === 'lab_assistant'
        );
        setTechnicians(staff);
      });
    }
  }, [user]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        page_size: 10,
      };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const { data } = await maintenanceService.list(params);
      setRecords(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  const openView = (record) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const openCreate = () => {
    setCreateForm({
      pc_id: '',
      maintenance_type: 'Hardware Repair',
      issue_description: '',
      assigned_to: user?.id || '',
      notes: '',
      status: 'in_progress',
    });
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.pc_id) {
      setCreateError('Please select a PC to service.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError('');

    try {
      await maintenanceService.create({
        pc_id: Number(createForm.pc_id),
        issue_description: createForm.issue_description,
        maintenance_type: createForm.maintenance_type,
        assigned_to: createForm.assigned_to ? Number(createForm.assigned_to) : user?.id,
        status: createForm.status,
        notes: createForm.notes,
        update_pc_status: true,
      });

      setCreateModalOpen(false);
      fetchRecords();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create maintenance job.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openComplete = (record) => {
    setSelectedRecord(record);
    setCompleteForm({
      notes: record.notes || '',
      set_pc_status: 'working',
    });
    setCompleteError('');
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setCompleteSubmitting(true);
    setCompleteError('');

    try {
      await maintenanceService.update(selectedRecord.id, {
        status: 'completed',
        notes: completeForm.notes,
        set_pc_status: completeForm.set_pc_status,
      });

      setCompleteModalOpen(false);
      fetchRecords();
    } catch (err) {
      setCompleteError(err.response?.data?.detail || 'Failed to complete maintenance job.');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const pcOptions = pcs.map((p) => ({
    value: p.id,
    label: `${p.pc_code} (${p.computer_name}) - Current: ${p.status}`,
  }));

  const typeOptions = types.map((t) => ({ value: t, label: t }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Management"
        subtitle={`Track and manage workstation hardware and software maintenance operations (${total} total)`}
        action={
          canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Schedule Maintenance
            </button>
          )
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by issue description, type, notes..."
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
      </div>

      {loading ? (
        <LoadingState message="Loading maintenance records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRecords} />
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-semibold text-gray-800">No maintenance jobs found</p>
          <p className="text-sm text-gray-500 mt-1">
            All workstations are currently in healthy operating condition.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">PC Asset</th>
                  <th className="px-5 py-3.5 text-left">Service Type</th>
                  <th className="px-5 py-3.5 text-left">Issue Description</th>
                  <th className="px-5 py-3.5 text-left">Technician</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-left">Start Date</th>
                  <th className="px-5 py-3.5 text-left">Completed</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      {r.pc ? (
                        <div>
                          <p className="font-semibold text-gray-900">{r.pc.pc_code}</p>
                          <p className="text-xs text-gray-400">{r.pc.computer_name}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">PC #{r.pc_id}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-800">{r.maintenance_type}</td>
                    <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate" title={r.issue_description}>
                      {r.issue_description}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {r.technician ? r.technician.name : 'Unassigned'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge value={r.status} statusMap={defaultMaintenanceStatus} />
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{r.start_date}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {r.completion_date ? (
                        <span className="text-green-700 font-medium">{r.completion_date}</span>
                      ) : (
                        <span className="text-amber-600 italic">In progress</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openView(r)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && r.status !== 'completed' && (
                          <button
                            onClick={() => openComplete(r)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors"
                            title="Mark as Complete"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* View Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Maintenance Job Details #${selectedRecord.id}`}
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-xs font-semibold uppercase text-gray-500">Current Status</span>
              <StatusBadge value={selectedRecord.status} statusMap={defaultMaintenanceStatus} />
            </div>

            <dl className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Target PC</dt>
                <dd className="font-semibold text-gray-900">
                  {selectedRecord.pc ? `${selectedRecord.pc.pc_code} (${selectedRecord.pc.computer_name})` : `#${selectedRecord.pc_id}`}
                </dd>
              </div>

              {selectedRecord.complaint && (
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <dt className="text-gray-500">Linked Complaint</dt>
                  <dd className="font-mono text-xs font-semibold text-indigo-600">
                    {selectedRecord.complaint.complaint_code} ({selectedRecord.complaint.complaint_type})
                  </dd>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Service Category</dt>
                <dd className="font-medium text-gray-900">{selectedRecord.maintenance_type}</dd>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Assigned Technician</dt>
                <dd className="font-medium text-gray-900">
                  {selectedRecord.technician ? selectedRecord.technician.name : 'Unassigned'}
                </dd>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <dt className="text-gray-500">Start Date</dt>
                <dd className="text-gray-800">{selectedRecord.start_date}</dd>
              </div>

              {selectedRecord.completion_date && (
                <div className="flex justify-between py-1.5 border-b border-gray-100 text-green-700">
                  <dt className="font-semibold">Completion Date</dt>
                  <dd className="font-medium">{selectedRecord.completion_date}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Issue Description</p>
              <div className="p-3 bg-gray-50 rounded-xl text-gray-800 text-sm whitespace-pre-wrap">
                {selectedRecord.issue_description}
              </div>
            </div>

            {selectedRecord.notes && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Technician Work Notes</p>
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-gray-800 text-sm whitespace-pre-wrap">
                  {selectedRecord.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Schedule Maintenance Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Schedule New PC Maintenance"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <FormField
            label="Target PC Workstation"
            name="pc_id"
            type="select"
            value={createForm.pc_id}
            onChange={(e) => setCreateForm({ ...createForm, pc_id: e.target.value })}
            options={pcOptions}
            required
            placeholder="Select a computer to maintain"
          />

          <FormField
            label="Maintenance Type"
            name="maintenance_type"
            type="select"
            value={createForm.maintenance_type}
            onChange={(e) => setCreateForm({ ...createForm, maintenance_type: e.target.value })}
            options={typeOptions}
            required
          />

          {technicians.length > 0 && (
            <FormField
              label="Assigned Technician"
              name="assigned_to"
              type="select"
              value={createForm.assigned_to}
              onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}
              options={technicians.map((t) => ({ value: t.id, label: t.name }))}
            />
          )}

          <FormField
            label="Issue & Diagnosis"
            name="issue_description"
            type="textarea"
            value={createForm.issue_description}
            onChange={(e) => setCreateForm({ ...createForm, issue_description: e.target.value })}
            required
            placeholder="Specify problem, hardware failure, or software required..."
            rows={3}
          />

          <FormField
            label="Notes"
            name="notes"
            type="textarea"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            placeholder="Optional parts or preliminary observation notes..."
            rows={2}
          />

          {createError && (
            <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{createError}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {createSubmitting ? 'Scheduling...' : 'Start Maintenance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Maintenance Modal */}
      {selectedRecord && (
        <Modal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title={`Complete Maintenance for ${selectedRecord.pc?.pc_code}`}
          size="md"
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs">
              Marking this job as complete will automatically restore the PC status and close any linked complaint.
            </div>

            <FormField
              label="Restore PC Asset Status To:"
              name="set_pc_status"
              type="select"
              value={completeForm.set_pc_status}
              onChange={(e) => setCompleteForm({ ...completeForm, set_pc_status: e.target.value })}
              options={[
                { value: 'working', label: 'Working (Repaired & Operational)' },
                { value: 'available', label: 'Available (Ready for Use)' },
              ]}
              required
            />

            <FormField
              label="Resolution & Completion Notes"
              name="notes"
              type="textarea"
              value={completeForm.notes}
              onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              required
              placeholder="What actions were taken? E.g. Replaced RAM stick, reinstalled Windows 11 drivers, tested hardware diagnostics."
              rows={4}
            />

            {completeError && (
              <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{completeError}</p>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={completeSubmitting}
                className="px-5 py-2 text-sm bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {completeSubmitting ? 'Saving...' : 'Confirm Job Complete'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
