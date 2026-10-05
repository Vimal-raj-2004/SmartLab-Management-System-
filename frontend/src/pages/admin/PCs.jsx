import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Plus, Pencil, Trash2, RefreshCw, Monitor, Wrench, History, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { pcService, labService, maintenanceService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { SearchBar } from '../../components/SearchBar';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, Input, Textarea, Select } from '../../components/FormField';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

const PC_STATUSES = ['available', 'working', 'in_use', 'maintenance', 'not_working'];
const emptyForm = {
  lab_id: '', pc_code: '', computer_name: '', processor: '', ram: '',
  storage: '', operating_system: '', status: 'available', purchase_date: '', notes: '',
};

export const PCs = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || user?.role === 'lab_assistant';

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
  const [labs, setLabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLab, setFilterLab] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState(null);
  const [selectedPC, setSelectedPC] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    labService.getAll({ page_size: 100 }).then(d => setLabs(d.items)).catch(console.error);
  }, []);

  const fetchPCs = useCallback(() => {
    setIsLoading(true);
    pcService.getAll({
      page, page_size: 15,
      search: search || undefined,
      lab_id: filterLab || undefined,
      status: filterStatus || undefined,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, search, filterLab, filterStatus]);

  useEffect(() => { fetchPCs(); }, [fetchPCs]);
  const navigate = useNavigate();
  const [pcHistory, setPcHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => { setPage(1); }, [search, filterLab, filterStatus]);

  const openCreate = () => { setForm(emptyForm); setFormError(''); setModalMode('create'); };
  const openEdit = (pc) => { setSelectedPC(pc); setForm({ ...pc, lab_id: pc.lab_id ?? '', purchase_date: pc.purchase_date ?? '' }); setFormError(''); setModalMode('edit'); };
  const openView = (pc) => {
    setSelectedPC(pc);
    setModalMode('view');
    setLoadingHistory(true);
    maintenanceService.getPCHistory(pc.id)
      .then(res => setPcHistory(res.records || []))
      .catch(() => setPcHistory([]))
      .finally(() => setLoadingHistory(false));
  };
  const closeModal = () => { setModalMode(null); setSelectedPC(null); setPcHistory([]); };

  const handleTogglePCStatus = async (pc, e) => {
    if (e) e.stopPropagation();
    const current = (pc.status || '').toLowerCase();
    const target = current === 'maintenance' ? 'working' : 'maintenance';
    try {
      await maintenanceService.setPCStatus(pc.id, target, `Status toggled by ${user?.name}`);
      fetchPCs();
      if (selectedPC && selectedPC.id === pc.id) {
        setSelectedPC(prev => ({ ...prev, status: target }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle PC status');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        lab_id: form.lab_id ? Number(form.lab_id) : null,
        purchase_date: form.purchase_date || null,
      };
      if (modalMode === 'create') await pcService.create(payload);
      else await pcService.update(selectedPC.id, payload);
      closeModal();
      fetchPCs();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save PC.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await pcService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchPCs();
    } catch { } finally { setIsDeleting(false); }
  };

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  const labName = (id) => labs.find(l => l.id === id)?.lab_name ?? 'Unassigned';

  return (
    <div className="space-y-5">
      <PageHeader
        title="PC Management"
        subtitle="Manage all workstation assets"
        icon={Cpu}
        iconColor="purple"
        actions={
          isAdmin && (
            <button
              onClick={openCreate}
              id="btn-add-pc"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add PC
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search by PC code, name, processor..." />
        <select value={filterLab} onChange={e => setFilterLab(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
          <option value="">All Labs</option>
          {labs.map(l => <option key={l.id} value={l.id}>{l.lab_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
          <option value="">All Statuses</option>
          {PC_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={fetchPCs} className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">PC</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lab</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Specs</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">OS</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                {canEdit && <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data.items.length === 0 ? (
                <tr><td colSpan={canEdit ? 6 : 5}><EmptyState title="No PCs found" message="Add your first PC workstation above." icon={Monitor} /></td></tr>
              ) : (
                data.items.map(pc => (
                  <tr
                    key={pc.id}
                    onClick={() => openView(pc)}
                    className="border-b border-slate-800/50 table-row-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{pc.computer_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{pc.pc_code}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {pc.lab ? (
                        <div>
                          <div className="text-slate-300">{pc.lab.lab_name}</div>
                          <div className="text-slate-600 font-mono">{pc.lab.lab_code}</div>
                        </div>
                      ) : <span className="text-slate-600">Unassigned</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 space-y-0.5">
                      {pc.processor && <div>{pc.processor}</div>}
                      <div className="text-slate-600">{[pc.ram, pc.storage].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">{pc.operating_system || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Badge value={pc.status} />
                        {canEdit && (
                          <button
                            onClick={(e) => handleTogglePCStatus(pc, e)}
                            className="p-1 rounded-md text-[10px] text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title={(pc.status || '').toLowerCase() === 'maintenance' ? 'Restore to Working' : 'Set to Maintenance'}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(pc)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteTarget(pc)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
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
        title={modalMode === 'create' ? 'Add New PC' : `Edit — ${selectedPC?.computer_name}`} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="PC Code" required>
              <Input {...field('pc_code')} placeholder="CSL101-PC01" required maxLength={50} />
            </FormField>
            <FormField label="Computer Name" required>
              <Input {...field('computer_name')} placeholder="CSLAB1-WS01" required maxLength={100} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Assign to Lab">
              <Select {...field('lab_id')}>
                <option value="">— Unassigned —</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.lab_name} ({l.lab_code})</option>)}
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select {...field('status')}>
                {PC_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Processor">
            <Input {...field('processor')} placeholder="Intel Core i5-12400 @ 2.50GHz" maxLength={150} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="RAM">
              <Input {...field('ram')} placeholder="16 GB DDR4" maxLength={50} />
            </FormField>
            <FormField label="Storage">
              <Input {...field('storage')} placeholder="512 GB SSD" maxLength={100} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Operating System">
              <Input {...field('operating_system')} placeholder="Windows 11 Pro" maxLength={100} />
            </FormField>
            <FormField label="Purchase Date">
              <Input {...field('purchase_date')} type="date" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea {...field('notes')} placeholder="Any special notes about this PC..." rows={2} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all">
              {isSaving ? 'Saving...' : modalMode === 'create' ? 'Add PC' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={modalMode === 'view'} onClose={closeModal} title="PC Details & Maintenance History" size="lg">
        {selectedPC && (
          <div className="space-y-4">
            {/* Top Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {[
                ['PC Code', selectedPC.pc_code],
                ['Computer Name', selectedPC.computer_name],
                ['Lab', selectedPC.lab?.lab_name ?? 'Unassigned'],
                ['Processor', selectedPC.processor || '—'],
                ['RAM', selectedPC.ram || '—'],
                ['Storage', selectedPC.storage || '—'],
                ['OS', selectedPC.operating_system || '—'],
                ['Purchase Date', selectedPC.purchase_date || '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{k}</p>
                  <p className="text-white font-medium truncate">{v}</p>
                </div>
              ))}
            </div>

            {/* Status & Quick Toggle */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Current Status:</span>
                <Badge value={selectedPC.status} />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => handleTogglePCStatus(selectedPC, e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 shadow-sm ${
                    (selectedPC.status || '').toLowerCase() === 'maintenance'
                      ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>
                    {(selectedPC.status || '').toLowerCase() === 'maintenance' ? 'Restore to Working' : 'Set to Maintenance'}
                  </span>
                </button>
              )}
            </div>

            {selectedPC.notes && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-slate-300 text-xs">{selectedPC.notes}</p>
              </div>
            )}

            {/* Maintenance History Section */}
            <div className="border-t border-slate-800 pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Maintenance History ({pcHistory.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => { closeModal(); navigate('/maintenance/pc-history'); }}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Full Timeline View &rarr;
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading service history...</div>
              ) : pcHistory.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No maintenance records logged for this computer yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {pcHistory.map(rec => (
                    <div key={rec.id} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-400">#{rec.id}</span>
                          <span className="font-semibold text-white">{rec.maintenance_type}</span>
                        </div>
                        <Badge value={rec.status} />
                      </div>
                      <p className="text-slate-300 text-[11px] truncate">{rec.issue_description}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>Started: {new Date(rec.start_date).toLocaleDateString()}</span>
                        {rec.assigned_technician && <span>Tech: {rec.assigned_technician.name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => { closeModal(); openEdit(selectedPC); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 text-sm hover:bg-purple-600/20 transition-all">
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
        title="Delete PC"
        message={`Delete "${deleteTarget?.computer_name}" (${deleteTarget?.pc_code})? This cannot be undone.`}
        confirmText="Delete PC"
        isLoading={isDeleting}
      />
    </div>
  );
};
