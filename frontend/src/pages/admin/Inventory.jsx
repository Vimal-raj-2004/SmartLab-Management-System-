import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { inventoryService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { SearchBar } from '../../components/SearchBar';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, Input, Textarea, Select } from '../../components/FormField';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';

const ITEM_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];
const ITEM_STATUSES = ['available', 'in_use', 'under_repair', 'disposed'];
const CATEGORIES = ['Monitor', 'Keyboard', 'Mouse', 'Peripherals', 'UPS', 'Projector', 'Networking', 'Printer', 'Storage', 'Cables', 'Furniture', 'Other'];

const emptyForm = {
  item_name: '', category: 'Monitor', quantity: 1,
  condition: 'good', location: '', status: 'available',
  purchase_date: '', notes: '',
};

export const Inventory = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || user?.role === 'lab_assistant';

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInventory = useCallback(() => {
    setIsLoading(true);
    inventoryService.getAll({
      page, page_size: 15,
      search: search || undefined,
      category: filterCategory || undefined,
      status: filterStatus || undefined,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, search, filterCategory, filterStatus]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { setPage(1); }, [search, filterCategory, filterStatus]);

  const openCreate = () => { setForm(emptyForm); setFormError(''); setModalMode('create'); };
  const openEdit = (item) => { setSelectedItem(item); setForm({ ...item, purchase_date: item.purchase_date ?? '' }); setFormError(''); setModalMode('edit'); };
  const openView = (item) => { setSelectedItem(item); setModalMode('view'); };
  const closeModal = () => { setModalMode(null); setSelectedItem(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity), purchase_date: form.purchase_date || null };
      if (modalMode === 'create') await inventoryService.create(payload);
      else await inventoryService.update(selectedItem.id, payload);
      closeModal();
      fetchInventory();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save item.');
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await inventoryService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchInventory();
    } catch { } finally { setIsDeleting(false); }
  };

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        subtitle="Manage equipment, peripherals and assets"
        icon={Package}
        iconColor="amber"
        actions={
          isAdmin && (
            <button
              onClick={openCreate}
              id="btn-add-inventory"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search items, categories, locations..." />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
          <option value="">All Statuses</option>
          {ITEM_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={fetchInventory} className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                {canEdit && <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({ length: canEdit ? 7 : 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data.items.length === 0 ? (
                <tr><td colSpan={canEdit ? 7 : 6}><EmptyState title="No inventory items" message="Add items using the button above." icon={Package} /></td></tr>
              ) : (
                data.items.map(item => (
                  <tr key={item.id} onClick={() => openView(item)} className="border-b border-slate-800/50 table-row-hover cursor-pointer transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">{item.item_name}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{item.category}</td>
                    <td className="px-5 py-4 text-slate-300 font-mono">{item.quantity}</td>
                    <td className="px-5 py-4"><Badge value={item.condition} /></td>
                    <td className="px-5 py-4"><Badge value={item.status} /></td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{item.location || '—'}</td>
                    {canEdit && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} total={data.total} pageSize={data.page_size} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={closeModal}
        title={modalMode === 'create' ? 'Add Inventory Item' : `Edit — ${selectedItem?.item_name}`} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
          <FormField label="Item Name" required>
            <Input {...field('item_name')} placeholder="Dell 24 FHD Monitor" required maxLength={200} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category" required>
              <Select {...field('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Quantity" required>
              <Input {...field('quantity')} type="number" min={0} required />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Condition" required>
              <Select {...field('condition')}>
                {ITEM_CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select {...field('status')}>
                {ITEM_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Location">
              <Input {...field('location')} placeholder="Storage Room A" maxLength={200} />
            </FormField>
            <FormField label="Purchase Date">
              <Input {...field('purchase_date')} type="date" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea {...field('notes')} placeholder="Additional notes..." rows={2} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all">
              {isSaving ? 'Saving...' : modalMode === 'create' ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View */}
      <Modal isOpen={modalMode === 'view'} onClose={closeModal} title="Item Details" size="md">
        {selectedItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Item Name', selectedItem.item_name],
                ['Category', selectedItem.category],
                ['Quantity', selectedItem.quantity],
                ['Condition', <Badge key="c" value={selectedItem.condition} />],
                ['Status', <Badge key="s" value={selectedItem.status} />],
                ['Location', selectedItem.location || '—'],
                ['Purchase Date', selectedItem.purchase_date || '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k}</p>
                  <p className="text-white font-medium">{v}</p>
                </div>
              ))}
            </div>
            {canEdit && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => { closeModal(); openEdit(selectedItem); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-400 text-sm hover:bg-amber-600/20 transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Inventory Item"
        message={`Delete "${deleteTarget?.item_name}" (${deleteTarget?.quantity} units)? This cannot be undone.`}
        confirmText="Delete Item"
        isLoading={isDeleting}
      />
    </div>
  );
};
