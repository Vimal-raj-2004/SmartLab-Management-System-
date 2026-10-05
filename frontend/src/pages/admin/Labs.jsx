import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Pencil, Trash2, RefreshCw, MapPin, Users } from 'lucide-react';
import { labService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { SearchBar } from '../../components/SearchBar';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, Input, Textarea, Select } from '../../components/FormField';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';

const LAB_STATUSES = ['active', 'inactive', 'maintenance', 'closed'];

const emptyForm = { lab_name: '', lab_code: '', location: '', capacity: 30, description: '', status: 'active' };

export const Labs = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'view'
  const [selectedLab, setSelectedLab] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLabs = useCallback(() => {
    setIsLoading(true);
    labService.getAll({ page, page_size: 15, search: search || undefined, status: filterStatus || undefined })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, search, filterStatus]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  const openCreate = () => { setForm(emptyForm); setFormError(''); setModalMode('create'); };
  const openEdit = (lab) => { setSelectedLab(lab); setForm({ ...lab }); setFormError(''); setModalMode('edit'); };
  const openView = (lab) => { setSelectedLab(lab); setModalMode('view'); };
  const closeModal = () => { setModalMode(null); setSelectedLab(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await labService.create({ ...form, capacity: Number(form.capacity) });
      } else {
        await labService.update(selectedLab.id, { ...form, capacity: Number(form.capacity) });
      }
      closeModal();
      fetchLabs();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save lab.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await labService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchLabs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lab Management"
        subtitle="Manage all computer laboratories"
        icon={Building2}
        iconColor="blue"
        actions={
          isAdmin && (
            <button
              onClick={openCreate}
              id="btn-add-lab"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Lab
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search labs, codes, locations..." />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        >
          <option value="">All Statuses</option>
          {LAB_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button onClick={fetchLabs} className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lab</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">PCs</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data.items.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5}><EmptyState title="No labs found" message="Add your first lab using the button above." icon={Building2} /></td></tr>
              ) : (
                data.items.map(lab => (
                  <tr
                    key={lab.id}
                    onClick={() => openView(lab)}
                    className="border-b border-slate-800/50 table-row-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{lab.lab_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{lab.lab_code}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <span className="text-xs">{lab.location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        <span>{lab.capacity}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{lab.pc_count ?? 0}</td>
                    <td className="px-5 py-4"><Badge value={lab.status} /></td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(lab)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(lab)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Add New Lab' : `Edit — ${selectedLab?.lab_name}`}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Lab Name" required>
              <Input {...field('lab_name')} placeholder="Computer Science Lab 1" required maxLength={120} />
            </FormField>
            <FormField label="Lab Code" required>
              <Input {...field('lab_code')} placeholder="CSL-101" required maxLength={30} />
            </FormField>
          </div>
          <FormField label="Location" required>
            <Input {...field('location')} placeholder="Block A, Ground Floor, Room 101" required maxLength={200} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Capacity (seats)" required>
              <Input {...field('capacity')} type="number" min={1} max={500} required />
            </FormField>
            <FormField label="Status" required>
              <Select {...field('status')}>
                {LAB_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea {...field('description')} placeholder="Brief description of this lab's purpose..." rows={3} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? 'Saving...' : modalMode === 'create' ? 'Create Lab' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={modalMode === 'view'} onClose={closeModal} title="Lab Details" size="md">
        {selectedLab && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Lab Name', selectedLab.lab_name],
                ['Lab Code', selectedLab.lab_code],
                ['Location', selectedLab.location],
                ['Capacity', `${selectedLab.capacity} seats`],
                ['PCs', selectedLab.pc_count ?? 0],
                ['Status', <Badge key="s" value={selectedLab.status} />],
                ['Created', new Date(selectedLab.created_at).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{k}</p>
                  <p className="text-white font-medium">{v}</p>
                </div>
              ))}
            </div>
            {selectedLab.description && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-slate-300 text-sm">{selectedLab.description}</p>
              </div>
            )}
            {isAdmin && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => { closeModal(); openEdit(selectedLab); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-sm hover:bg-blue-600/20 transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Lab"
        message={`Are you sure you want to permanently delete "${deleteTarget?.lab_name}"? This action cannot be undone.`}
        confirmText="Delete Lab"
        isLoading={isDeleting}
      />
    </div>
  );
};
