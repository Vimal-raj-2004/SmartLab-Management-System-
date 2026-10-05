import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling — auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop if already on the login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use setTimeout to let the current React render cycle finish before
        // triggering a full navigation, preventing white-screen flash
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authService = {
  login: (credentials, maybePassword) => {
    const payload =
      typeof credentials === 'object' && credentials !== null
        ? credentials
        : { email: credentials, password: maybePassword };
    return api.post('/auth/login', payload).then((res) => res.data);
  },
  register: (userData) => {
    const payload = {
      name: userData.name || userData.full_name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student',
    };
    return api.post('/auth/register', payload).then((res) => res.data);
  },
  getCurrentUser: () =>
    api.get('/auth/me').then((res) => res.data),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getAdminAnalytics: () => api.get('/dashboard/admin-analytics'),
  getFacultyStats: () => api.get('/dashboard/faculty-stats'),
  getAssistantStats: () => api.get('/dashboard/assistant-stats'),
  getStudentStats: () => api.get('/dashboard/student-stats'),
};

// ─── Labs ──────────────────────────────────────────────────────────────────
export const labService = {
  list: (params = {}) => api.get('/labs', { params }),
  get: (id) => api.get(`/labs/${id}`),
  create: (data) => api.post('/labs', data),
  update: (id, data) => api.patch(`/labs/${id}`, data),
  delete: (id) => api.delete(`/labs/${id}`),
};

// ─── PCs ───────────────────────────────────────────────────────────────────
export const pcService = {
  list: (params = {}) => api.get('/pcs', { params }),
  get: (id) => api.get(`/pcs/${id}`),
  create: (data) => api.post('/pcs', data),
  update: (id, data) => api.patch(`/pcs/${id}`, data),
  delete: (id) => api.delete(`/pcs/${id}`),
};

// ─── Inventory ─────────────────────────────────────────────────────────────
export const inventoryService = {
  list: (params = {}) => api.get('/inventory', { params }),
  get: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  getCategories: () => api.get('/inventory/categories'),
};

// ─── Users ─────────────────────────────────────────────────────────────────
export const userService = {
  list: (params = {}) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  deactivate: (id) => api.delete(`/users/${id}`),
};

// ─── Complaints (Phase 3 & Phase 5C AI Priority) ───────────────────────────
export const complaintService = {
  list: (params = {}) => api.get('/complaints', { params }),
  get: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.patch(`/complaints/${id}`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
  getStats: () => api.get('/complaints/stats'),
  getTypes: () => api.get('/complaints/types'),
  predictPriority: (data) => api.post('/complaints/predict-priority', data),
  getAIModelStats: () => api.get('/complaints/ai-model-stats'),
  // Resolve a complaint — sets status to Resolved, saves notes, optionally restores PC to Working
  resolve: (id, { notes, set_pc_working }) =>
    api.patch(`/complaints/${id}`, {
      status: 'resolved',
      notes,
      set_pc_working,
    }),
};


// ─── Maintenance (Phase 3) ────────────────────────────────────────────────
export const maintenanceService = {
  list: (params = {}) => api.get('/maintenance', { params }),
  get: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.patch(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
  getTypes: () => api.get('/maintenance/types'),
  getPCHistory: (pcId) => api.get(`/maintenance/pc/${pcId}`),
};

// ─── Lab Bookings (Phase 4) ────────────────────────────────────────────────
export const bookingService = {
  list: (params = {}) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  updateStatus: (id, data) => api.patch(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  getTodaySchedule: () => api.get('/bookings/today'),
  getAvailability: (checkDate) => api.get('/bookings/availability', { params: checkDate ? { check_date: checkDate } : {} }),
  getStats: () => api.get('/bookings/stats'),
};

// ─── PC Health Monitoring & AI (Phase 5A) ──────────────────────────────────
export const pcHealthService = {
  getLatest: () => api.get('/pc-health/latest').then((res) => res.data),
  getHistory: (pcId, params = {}) => api.get(`/pc-health/history/${pcId}`, { params }).then((res) => res.data),
  recordMetrics: (data) => api.post('/pc-health', data).then((res) => res.data),
  predictHealth: (data) => api.post('/pc-health/predict', data).then((res) => res.data),
};

// ─── Lab Utilization & AI K-Means (Phase 5B) ──────────────────────────────
export const utilizationService = {
  getStats: () => api.get('/utilization/stats'),
  getSessions: (params = {}) => api.get('/utilization/sessions', { params }),
  createSession: (data) => api.post('/utilization/sessions', data),
  predict: (data) => api.post('/utilization/predict', data),
  syncBookings: () => api.post('/utilization/sync-bookings'),
};

// ─── Reports & Analytics (Phase 6) ─────────────────────────────────────────
export const reportsService = {
  getPCHealth: (params = {}) => api.get('/reports/pc-health', { params }),
  getMaintenance: (params = {}) => api.get('/reports/maintenance', { params }),
  getComplaints: (params = {}) => api.get('/reports/complaints', { params }),
  getUtilization: (params = {}) => api.get('/reports/utilization', { params }),
  getInventory: (params = {}) => api.get('/reports/inventory', { params }),
  getBookings: (params = {}) => api.get('/reports/bookings', { params }),
  exportCSV: (type, params = {}) => api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
};

export default api;


