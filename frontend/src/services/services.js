import api from './api';

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats').then(r => r.data),
};

export const labService = {
  getAll: (params) => api.get('/labs/', { params }).then(r => r.data),
  getById: (id) => api.get(`/labs/${id}`).then(r => r.data),
  create: (data) => api.post('/labs/', data).then(r => r.data),
  update: (id, data) => api.put(`/labs/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/labs/${id}`),
};

export const pcService = {
  getAll: (params) => api.get('/pcs/', { params }).then(r => r.data),
  getById: (id) => api.get(`/pcs/${id}`).then(r => r.data),
  create: (data) => api.post('/pcs/', data).then(r => r.data),
  update: (id, data) => api.put(`/pcs/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/pcs/${id}`),
};

export const inventoryService = {
  getAll: (params) => api.get('/inventory/', { params }).then(r => r.data),
  getById: (id) => api.get(`/inventory/${id}`).then(r => r.data),
  create: (data) => api.post('/inventory/', data).then(r => r.data),
  update: (id, data) => api.put(`/inventory/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

export const userManagementService = {
  getAll: (params) => api.get('/users/', { params }).then(r => r.data),
  getById: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (data) => api.post('/users/', data).then(r => r.data),
  update: (id, data) => api.patch(`/users/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const profileService = {
  getProfile: () => api.get('/users/profile').then(r => r.data),
  updateProfile: (data) => api.put('/users/profile', data).then(r => r.data),
};

// Phase 3 — Complaints Service
export const complaintService = {
  getLookupPCs: (labId) => api.get('/complaints/lookup-pcs', { params: labId ? { lab_id: labId } : {} }).then(r => r.data),
  getTypes: () => api.get('/complaints/types').then(r => r.data),
  getMyComplaints: (params) => api.get('/complaints/my', { params }).then(r => r.data),
  getAll: (params) => api.get('/complaints/', { params }).then(r => r.data),
  getStats: (labId) => api.get('/complaints/stats', { params: labId ? { lab_id: labId } : {} }).then(r => r.data),
  getById: (id) => api.get(`/complaints/${id}`).then(r => r.data),
  create: (data) => api.post('/complaints/', data).then(r => r.data),
  assign: (id, assignedTo) => api.patch(`/complaints/${id}/assign`, { assigned_to: assignedTo }).then(r => r.data),
  updateStatus: (id, { status, notes }) => api.patch(`/complaints/${id}/status`, { status, notes }).then(r => r.data),
  resolve: (id, { notes, set_pc_working }) => api.patch(`/complaints/${id}/resolve`, { notes, set_pc_working }).then(r => r.data),
  createMaintenance: (id) => api.post(`/complaints/${id}/create-maintenance`).then(r => r.data),
  delete: (id) => api.delete(`/complaints/${id}`),
};

// Phase 3 — Maintenance Service
export const maintenanceService = {
  getTypes: () => api.get('/maintenance/types').then(r => r.data),
  getStats: (labId) => api.get('/maintenance/stats', { params: labId ? { lab_id: labId } : {} }).then(r => r.data),
  getAll: (params) => api.get('/maintenance/', { params }).then(r => r.data),
  getById: (id) => api.get(`/maintenance/${id}`).then(r => r.data),
  create: (data) => api.post('/maintenance/', data).then(r => r.data),
  update: (id, data) => api.put(`/maintenance/${id}`, data).then(r => r.data),
  complete: (id, { notes, set_pc_working }) => api.patch(`/maintenance/${id}/complete`, { notes, set_pc_working }).then(r => r.data),
  getPCHistory: (pcId) => api.get(`/maintenance/pc/${pcId}/history`).then(r => r.data),
  setPCStatus: (pcId, statusTarget, notes) => api.patch(`/maintenance/pc/${pcId}/status`, null, {
    params: { status_target: statusTarget, notes }
  }).then(r => r.data),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

// Phase 5A — PC Health Monitoring & Prediction Service
export const pcHealthService = {
  getLatest: () => api.get('/pc-health/latest').then(r => r.data),
  getHistory: (pcId, params) => api.get(`/pc-health/history/${pcId}`, { params }).then(r => r.data),
  recordMetrics: (data) => api.post('/pc-health', data).then(r => r.data),
  predictHealth: (data) => api.post('/pc-health/predict', data).then(r => r.data),
};
