import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { inventoryService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import SearchBar from '../../components/SearchBar';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormField from '../../components/FormField';
import StatusBadge, { defaultInventoryStatus, defaultCondition } from '../../components/StatusBadge';

const INITIAL_FORM = {
  item_name: '', category: '', quantity: 1, condition: 'good',
  location: '', status: 'available', purchase_date: '', notes: '',
};

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' }, { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' }, { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' }, { value: 'disposed', label: 'Disposed' },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'lab_assistant';
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    inventoryService.getCategories()
      .then(({ data }) => setCategories(data || []))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = { page, page_size: 10 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const { data } = await inventoryService.list(params);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load inventory.');
    } finally { setLoading(false); }
  }, [page, search, filterStatus, filterCategory]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterCategory]);

  const openAdd = () => { setSelectedItem(null); setFormData(INITIAL_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name, category: item.category, quantity: item.quantity,
      condition: item.condition, location: item.location || '', status: item.status,
      purchase_date: item.purchase_date || '', notes: item.notes || '',
    });
    setFormError(''); setModalOpen(true);
  };
  const openView = (item) => { setSelectedItem(item); setViewModalOpen(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');
    const payload = { ...formData };
    if (!payload.purchase_date) payload.purchase_date = null;
    try {
      if (selectedItem) await inventoryService.update(selectedItem.id, payload);
      else await inventoryService.create(payload);
      setModalOpen(false); fetchItems();
      inventoryService.getCategories().then(({ data }) => setCategories(data || []));
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await inventoryService.delete(itemToDelete.id); fetchItems(); }
    catch (err) { alert(err.response?.data?.detail || 'Delete failed.'); }
  };

  const categoryOptions = categories.map((c) => ({ value: c, label: c }));

  return (
    <div>
      <PageHeader
        title="Inventory Management"
        subtitle={`${total} item${total !== 1 ? 's' : ''} total`}
        action={
          canEdit && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, category, location..." />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchItems} /> : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No inventory items found</p>
          <p className="text-sm mt-1">Try adjusting filters or add a new item.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Item Name</th>
                  <th className="px-5 py-3.5 text-left">Category</th>
                  <th className="px-5 py-3.5 text-center">Qty</th>
                  <th className="px-5 py-3.5 text-center">Condition</th>
                  <th className="px-5 py-3.5 text-left">Location</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{item.item_name}</td>
                    <td className="px-5 py-4 text-gray-500">{item.category}</td>
                    <td className="px-5 py-4 text-center text-gray-700 font-medium">{item.quantity}</td>
                    <td className="px-5 py-4 text-center"><StatusBadge value={item.condition} statusMap={defaultCondition} /></td>
                    <td className="px-5 py-4 text-gray-500">{item.location || '—'}</td>
                    <td className="px-5 py-4 text-center"><StatusBadge value={item.status} statusMap={defaultInventoryStatus} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openView(item)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"><Eye className="w-4 h-4" /></button>
                        {canEdit && <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"><Pencil className="w-4 h-4" /></button>}
                        {isAdmin && <button onClick={() => { setItemToDelete(item); setConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedItem ? 'Edit Item' : 'Add Inventory Item'} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Item Name" name="item_name" value={formData.item_name} onChange={handleChange} required placeholder="e.g. Network Switch" className="sm:col-span-2" />
          <FormField label="Category" name="category" value={formData.category} onChange={handleChange} required placeholder="e.g. Networking" />
          <FormField label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
          <FormField label="Condition" name="condition" type="select" value={formData.condition} onChange={handleChange} options={CONDITION_OPTIONS} required />
          <FormField label="Status" name="status" type="select" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} required />
          <FormField label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Server Room" className="sm:col-span-2" />
          <FormField label="Purchase Date" name="purchase_date" type="date" value={formData.purchase_date} onChange={handleChange} />
          <FormField label="Notes" name="notes" type="textarea" value={formData.notes} onChange={handleChange} rows={2} className="sm:col-span-2" />
          {formError && <p className="sm:col-span-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : selectedItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {selectedItem && (
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Item Details" size="md">
          <dl className="space-y-2 text-sm">
            {[
              ['Item Name', selectedItem.item_name],
              ['Category', selectedItem.category],
              ['Quantity', selectedItem.quantity],
              ['Location', selectedItem.location || '—'],
              ['Purchase Date', selectedItem.purchase_date || '—'],
              ['Notes', selectedItem.notes || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                <dt className="text-gray-500 font-medium">{k}</dt>
                <dd className="text-gray-900 text-right">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-2 border-b border-gray-50">
              <dt className="text-gray-500 font-medium">Condition</dt>
              <dd><StatusBadge value={selectedItem.condition} statusMap={defaultCondition} /></dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-gray-500 font-medium">Status</dt>
              <dd><StatusBadge value={selectedItem.status} statusMap={defaultInventoryStatus} /></dd>
            </div>
          </dl>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete}
        title="Delete Item" message={`Permanently delete "${itemToDelete?.item_name}"?`}
        confirmLabel="Delete" danger
      />
    </div>
  );
}
