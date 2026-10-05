import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { labService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormField from '../../components/FormField';
import StatusBadge, { defaultLabStatus } from '../../components/StatusBadge';

const INITIAL_FORM = {
  lab_name: '', lab_code: '', location: '', capacity: 30,
  description: '', status: 'active',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'closed', label: 'Closed' },
];

export default function LabsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [labs, setLabs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedLab, setSelectedLab] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState(null);

  const fetchLabs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, page_size: 10 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const { data } = await labService.list(params);
      setLabs(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load labs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  const openAdd = () => {
    setSelectedLab(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (lab) => {
    setSelectedLab(lab);
    setFormData({
      lab_name: lab.lab_name || '',
      lab_code: lab.lab_code || '',
      location: lab.location || '',
      capacity: lab.capacity || 30,
      description: lab.description || '',
      status: (lab.status ? String(lab.status).toLowerCase() : 'active'),
    });
    setFormError('');
    setModalOpen(true);
  };

  const openView = (lab) => { setSelectedLab(lab); setViewModalOpen(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...formData,
        capacity: Number(formData.capacity) || 1,
      };
      if (selectedLab) {
        await labService.update(selectedLab.id, payload);
      } else {
        await labService.create(payload);
      }
      setModalOpen(false);
      fetchLabs();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Save failed. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!labToDelete) return;
    try {
      await labService.delete(labToDelete.id);
      setConfirmOpen(false);
      setLabToDelete(null);
      fetchLabs();
    } catch (err) {
      setConfirmOpen(false);
      alert(err.response?.data?.detail || 'Delete failed.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Lab Management"
        subtitle={`${total} lab${total !== 1 ? 's' : ''} total`}
        action={
          isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Lab
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, code, location..." />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLabs} />
      ) : labs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No labs found</p>
          <p className="text-sm mt-1">Try adjusting your search or add a new lab.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Lab Name</th>
                  <th className="px-5 py-3.5 text-left">Code</th>
                  <th className="px-5 py-3.5 text-left">Location</th>
                  <th className="px-5 py-3.5 text-center">Capacity</th>
                  <th className="px-5 py-3.5 text-center">PCs</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {labs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{lab.lab_name}</td>
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">{lab.lab_code}</td>
                    <td className="px-5 py-4 text-gray-600">{lab.location}</td>
                    <td className="px-5 py-4 text-center text-gray-600">{lab.capacity}</td>
                    <td className="px-5 py-4 text-center text-gray-600">{lab.pc_count ?? 0}</td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge value={lab.status} statusMap={defaultLabStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openView(lab)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => openEdit(lab)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setLabToDelete(lab); setConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Deactivate">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedLab ? 'Edit Lab' : 'Add New Lab'} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Lab Name" name="lab_name" value={formData.lab_name} onChange={handleChange} required placeholder="e.g. Computer Lab A" />
          <FormField label="Lab Code" name="lab_code" value={formData.lab_code} onChange={handleChange} required placeholder="e.g. CLA-01" />
          <FormField label="Location" name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Block A, Ground Floor" />
          <FormField label="Capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} required placeholder="30" />
          <FormField label="Status" name="status" type="select" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} className="sm:col-span-2" />
          <FormField label="Description" name="description" type="textarea" value={formData.description} onChange={handleChange} placeholder="Optional description..." rows={2} className="sm:col-span-2" />

          {formError && <p className="sm:col-span-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : selectedLab ? 'Save Changes' : 'Add Lab'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {selectedLab && (
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Lab Details" size="md">
          <dl className="space-y-3 text-sm">
            {[
              ['Lab Name', selectedLab.lab_name],
              ['Lab Code', selectedLab.lab_code],
              ['Location', selectedLab.location],
              ['Capacity', selectedLab.capacity],
              ['PCs Assigned', selectedLab.pc_count ?? 0],
              ['Description', selectedLab.description || '—'],
              ['Created', new Date(selectedLab.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                <dt className="text-gray-500 font-medium">{k}</dt>
                <dd className="text-gray-900 text-right">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-gray-500 font-medium">Status</dt>
              <dd><StatusBadge value={selectedLab.status} statusMap={defaultLabStatus} /></dd>
            </div>
          </dl>
        </Modal>
      )}

      {/* Confirm deactivate */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Deactivate Lab"
        message={`Are you sure you want to deactivate "${labToDelete?.lab_name}"? This will close the lab.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
