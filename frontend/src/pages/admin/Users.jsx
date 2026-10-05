import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, RefreshCw, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { userManagementService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { SearchBar } from '../../components/SearchBar';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField, Input, Select } from '../../components/FormField';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';

const ALL_ROLES = ['admin', 'faculty', 'lab_assistant', 'student'];
const STATUSES = ['active', 'inactive'];

export const UserManagement = () => {
  const { user: currentUser } = useAuth();

  // Determine allowed roles to manage based on logged in user
  const allowedRoles = React.useMemo(() => {
    if (currentUser?.role === 'lab_assistant') return ['faculty'];
    if (currentUser?.role === 'faculty') return ['student'];
    return ALL_ROLES;
  }, [currentUser?.role]);

  const defaultRole = allowedRoles[0] || 'student';
  const emptyForm = { name: '', email: '', password: '', role: defaultRole, status: 'active' };

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState(currentUser?.role === 'admin' ? '' : defaultRole);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(() => {
    setIsLoading(true);
    userManagementService.getAll({
      page,
      page_size: 15,
      search: search || undefined,
      role: (currentUser?.role === 'admin' ? filterRole : defaultRole) || undefined,
      status: filterStatus || undefined,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, search, filterRole, filterStatus, currentUser?.role, defaultRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, filterRole, filterStatus]);

  const openCreate = () => {
    setForm({ ...emptyForm, role: defaultRole });
    setFormError('');
    setModalMode('create');
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status,
    });
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      const payload = { ...form };
      if (currentUser?.role === 'lab_assistant') payload.role = 'faculty';
      if (currentUser?.role === 'faculty') payload.role = 'student';

      if (modalMode === 'edit' && !payload.password) delete payload.password;
      if (modalMode === 'create') await userManagementService.create(payload);
      else await userManagementService.update(selectedUser.id, payload);

      closeModal();
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      await userManagementService.update(u.id, { status: newStatus });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await userManagementService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchUsers();
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

  // Dynamic titles based on user role
  const pageTitle =
    currentUser?.role === 'lab_assistant'
      ? 'Faculty Management'
      : currentUser?.role === 'faculty'
      ? 'Student Management'
      : 'User Management';

  const pageSubtitle =
    currentUser?.role === 'lab_assistant'
      ? 'Register and manage faculty member accounts for laboratory sessions'
      : currentUser?.role === 'faculty'
      ? 'Register and manage student credentials for computer laboratory access'
      : 'Manage accounts, roles, credentials and system permissions';

  const addButtonText =
    currentUser?.role === 'lab_assistant'
      ? 'Add Faculty'
      : currentUser?.role === 'faculty'
      ? 'Add Student'
      : 'Add User';

  return (
    <div className="space-y-5">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={Users}
        iconColor={currentUser?.role === 'lab_assistant' ? 'blue' : currentUser?.role === 'faculty' ? 'cyan' : 'emerald'}
        actions={
          <button
            onClick={openCreate}
            id="btn-add-user"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> {addButtonText}
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder={`Search by name or email...`}
        />

        {currentUser?.role === 'admin' && (
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          >
            <option value="">All Roles</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <button
          onClick={fetchUsers}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No accounts found"
                      message={`No records match your current filter. Click "${addButtonText}" to register an account.`}
                      icon={Users}
                    />
                  </td>
                </tr>
              ) : (
                data.items.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 table-row-hover transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden bg-gradient-to-br ${
                          u.role === 'admin' ? 'from-purple-600 to-indigo-700' :
                          u.role === 'faculty' ? 'from-blue-600 to-cyan-700' :
                          u.role === 'lab_assistant' ? 'from-amber-500 to-orange-600' :
                          'from-emerald-500 to-teal-600'
                        } text-white ring-1 ring-slate-700`}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{u.name}</div>
                          {u.id === currentUser?.id && <span className="text-[10px] text-blue-400 font-medium">(You)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{u.email}</td>
                    <td className="px-5 py-4"><Badge value={u.role} /></td>
                    <td className="px-5 py-4"><Badge value={u.status} /></td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-all ${u.status === 'active'
                            ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                        >
                          {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Deactivate / Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            onPageChange={setPage}
            total={data.total}
            pageSize={data.page_size}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? `${addButtonText}` : `Edit — ${selectedUser?.name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}
          <FormField label="Full Name" required>
            <Input {...field('name')} placeholder="e.g. Dr. Priya Sharma" required maxLength={120} />
          </FormField>

          <FormField label="Email Address" required>
            <Input
              {...field('email')}
              type="email"
              placeholder="e.g. user@lab.edu"
              required
              maxLength={150}
              disabled={modalMode === 'edit'}
            />
          </FormField>

          <FormField
            label={modalMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
            required={modalMode === 'create'}
          >
            <Input
              {...field('password')}
              type="password"
              placeholder="••••••••"
              minLength={6}
              required={modalMode === 'create'}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" required>
              {allowedRoles.length > 1 ? (
                <Select {...field('role')}>
                  {allowedRoles.map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={defaultRole.replace(/_/g, ' ')}
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm cursor-not-allowed capitalize"
                />
              )}
            </FormField>

            <FormField label="Status" required>
              <Select {...field('status')}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? 'Saving...' : modalMode === 'create' ? `Create Account` : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate Account"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}" (${deleteTarget?.email})?`}
        confirmText="Deactivate"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default UserManagement;
