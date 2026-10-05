import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, Wrench, History, CheckCircle2 } from 'lucide-react';
import { pcService, labService, maintenanceService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormField from '../../components/FormField';
import StatusBadge, { defaultPCStatus, defaultMaintenanceStatus } from '../../components/StatusBadge';

const INITIAL_FORM = {
  lab_id: '', pc_code: '', computer_name: '', processor: '',
  ram: '', storage: '', operating_system: '', status: 'available',
  purchase_date: '', notes: '',
};

const STATUS_OPTIONS = [
  { value: 'working', label: 'Working' },
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'not_working', label: 'Not Working' },
];

export default function PCsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'lab_assistant';

  const [pcs, setPcs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLab, setFilterLab] = useState('');
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPC, setSelectedPC] = useState(null);
  const [pcHistory, setPcHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pcToDelete, setPcToDelete] = useState(null);

  // Load labs for dropdown
  useEffect(() => {
    labService.list({ page_size: 100 }).then(({ data }) => setLabs(data.items || []));
  }, []);

  const fetchPCs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, page_size: 10 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterLab) params.lab_id = filterLab;
      const { data } = await pcService.list(params);
      setPcs(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load PCs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterLab]);

  useEffect(() => { fetchPCs(); }, [fetchPCs]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterLab]);

  const openAdd = () => {
    setSelectedPC(null); setFormData(INITIAL_FORM); setFormError(''); setModalOpen(true);
  };

  const openEdit = (pc) => {
    setSelectedPC(pc);
    setFormData({
      lab_id: pc.lab_id ? String(pc.lab_id) : '',
      pc_code: pc.pc_code || '',
      computer_name: pc.computer_name || '',
      processor: pc.processor || '',
      ram: pc.ram || '',
      storage: pc.storage || '',
      operating_system: pc.operating_system || '',
      status: (pc.status ? String(pc.status).toLowerCase() : 'available'),
      purchase_date: pc.purchase_date ? String(pc.purchase_date).substring(0, 10) : '',
      notes: pc.notes || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openView = async (pc) => {
    setSelectedPC(pc);
    setViewModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await maintenanceService.getPCHistory(pc.id);
      setPcHistory(res.data || []);
    } catch (err) {
      console.error('History fetch error:', err);
      setPcHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { ...formData };
    if (!payload.lab_id || payload.lab_id === '') {
      payload.lab_id = null;
    } else {
      payload.lab_id = Number(payload.lab_id);
    }
    if (!payload.purchase_date || payload.purchase_date === '') {
      payload.purchase_date = null;
    }
    try {
      if (selectedPC) {
        await pcService.update(selectedPC.id, payload);
      } else {
        await pcService.create(payload);
      }
      setModalOpen(false);
      fetchPCs();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pcToDelete) return;
    try {
      await pcService.delete(pcToDelete.id);
      setConfirmOpen(false);
      setPcToDelete(null);
      fetchPCs();
    } catch (err) {
      setConfirmOpen(false);
      alert(err.response?.data?.detail || 'Delete failed.');
    }
  };

  const labOptions = labs.map((l) => ({ value: l.id, label: `${l.lab_name} (${l.lab_code})` }));

  return (
    <div>
      <PageHeader
        title="PC / Asset Management"
        subtitle={`${total} PC${total !== 1 ? 's' : ''} total`}
        action={
          isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> Add PC
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by code, name, processor..." />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterLab} onChange={(e) => setFilterLab(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Labs</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.lab_code}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchPCs} /> : pcs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No PCs found</p>
          <p className="text-sm mt-1">Try adjusting filters or add a new PC.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">PC Code</th>
                  <th className="px-5 py-3.5 text-left">Name</th>
                  <th className="px-5 py-3.5 text-left">Lab</th>
                  <th className="px-5 py-3.5 text-left">Processor</th>
                  <th className="px-5 py-3.5 text-left">RAM</th>
                  <th className="px-5 py-3.5 text-left">OS</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pcs.map((pc) => (
                  <tr key={pc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-700 font-semibold">{pc.pc_code}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{pc.computer_name}</td>
                    <td className="px-5 py-4 text-gray-500">{pc.lab ? pc.lab.lab_code : '—'}</td>
                    <td className="px-5 py-4 text-gray-500 max-w-[140px] truncate">{pc.processor || '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{pc.ram || '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{pc.operating_system || '—'}</td>
                    <td className="px-5 py-4 text-center"><StatusBadge value={pc.status} statusMap={defaultPCStatus} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openView(pc)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors" title="View Details & Maintenance History">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && <button onClick={() => openEdit(pc)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit PC"><Pencil className="w-4 h-4" /></button>}
                        {isAdmin && <button onClick={() => { setPcToDelete(pc); setConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete PC"><Trash2 className="w-4 h-4" /></button>}
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedPC ? 'Edit PC' : 'Add New PC'} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="PC Code" name="pc_code" value={formData.pc_code} onChange={handleChange} required placeholder="e.g. CLA-PC-001" />
          <FormField label="Computer Name" name="computer_name" value={formData.computer_name} onChange={handleChange} required placeholder="e.g. LAB-A-01" />
          <FormField label="Lab" name="lab_id" type="select" value={formData.lab_id} onChange={handleChange} options={labOptions} placeholder="Select Lab (optional)" />
          <FormField label="Status" name="status" type="select" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} required />
          <FormField label="Processor" name="processor" value={formData.processor} onChange={handleChange} placeholder="e.g. Intel Core i5-11400" />
          <FormField label="RAM" name="ram" value={formData.ram} onChange={handleChange} placeholder="e.g. 8 GB" />
          <FormField label="Storage" name="storage" value={formData.storage} onChange={handleChange} placeholder="e.g. 512 GB SSD" />
          <FormField label="Operating System" name="operating_system" value={formData.operating_system} onChange={handleChange} placeholder="e.g. Windows 11" />
          <FormField label="Purchase Date" name="purchase_date" type="date" value={formData.purchase_date} onChange={handleChange} />
          <FormField label="Notes" name="notes" type="textarea" value={formData.notes} onChange={handleChange} rows={2} className="sm:col-span-2" />
          {formError && <p className="sm:col-span-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : selectedPC ? 'Save Changes' : 'Add PC'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal with Maintenance History */}
      {selectedPC && (
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={`PC Details: ${selectedPC.pc_code}`} size="lg">
          <div className="space-y-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['PC Code', selectedPC.pc_code],
                ['Computer Name', selectedPC.computer_name],
                ['Lab', selectedPC.lab ? `${selectedPC.lab.lab_name} (${selectedPC.lab.lab_code})` : '—'],
                ['Status', <StatusBadge key="status" value={selectedPC.status} statusMap={defaultPCStatus} />],
                ['Processor', selectedPC.processor || '—'],
                ['RAM', selectedPC.ram || '—'],
                ['Storage', selectedPC.storage || '—'],
                ['Operating System', selectedPC.operating_system || '—'],
                ['Purchase Date', selectedPC.purchase_date || '—'],
                ['Notes', selectedPC.notes || '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                  <dt className="text-gray-500 text-xs font-medium uppercase tracking-wider">{k}</dt>
                  <dd className="text-gray-900 text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {/* Maintenance History Section (Phase 3 Requirement 7) */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Maintenance & Service History</h4>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {pcHistory.length} record{pcHistory.length !== 1 ? 's' : ''}
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-gray-400">Loading maintenance log...</div>
              ) : pcHistory.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 text-center text-xs text-gray-500">
                  No maintenance records logged for this computer yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {pcHistory.map((m) => (
                    <div key={m.id} className="p-3 bg-white border border-gray-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">{m.maintenance_type}</span>
                        <StatusBadge value={m.status} statusMap={defaultMaintenanceStatus} />
                      </div>
                      <p className="text-gray-600">{m.issue_description}</p>
                      {m.notes && <p className="text-gray-500 italic bg-gray-50 p-2 rounded-lg">Notes: {m.notes}</p>}
                      <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                        <span>Started: {m.start_date}</span>
                        <span>{m.completion_date ? `Completed: ${m.completion_date}` : 'Status: In progress'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title="Delete PC" message={`Permanently delete "${pcToDelete?.pc_code}"?`}
        confirmLabel="Delete" danger
      />
    </div>
  );
}
