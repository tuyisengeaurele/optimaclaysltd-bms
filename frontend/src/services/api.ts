import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthMutationEndpoint =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !original._retry && !isAuthMutationEndpoint) {
      original._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(original);
      } catch {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
  updateProfile: (data: { full_name?: string; email?: string }) => api.put('/auth/profile', data),
  listUsers: () => api.get('/auth/users'),
  createUser: (data: any) => api.post('/auth/users', data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
};

export const employeeApi = {
  list: () => api.get('/employees'),
  get: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

export const payrollApi = {
  list: () => api.get('/payroll'),
  get: (runId: string) => api.get(`/payroll/${runId}`),
  create: (data: { month: number; year: number }) => api.post('/payroll', data),
  updateEntry: (runId: string, entryId: string, data: any) => api.put(`/payroll/${runId}/entries/${entryId}`, data),
  finalize: (runId: string) => api.post(`/payroll/${runId}/finalize`),
  delete: (runId: string) => api.delete(`/payroll/${runId}`),
  exportUrl: (runId: string) => `${api.defaults.baseURL}/payroll/${runId}/export`,
  payslipUrl: (runId: string, employeeId: string) => `${api.defaults.baseURL}/payroll/${runId}/payslip/${employeeId}`,
};

export const attendanceApi = {
  list: (params?: any) => api.get('/attendance', { params }),
  create: (data: any) => api.post('/attendance', data),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
  summary: (params: any) => api.get('/attendance/summary', { params }),
};

export const productionApi = {
  list: (params?: any) => api.get('/production', { params }),
  stats: () => api.get('/production/stats'),
  create: (data: any) => api.post('/production', data),
  update: (id: string, data: any) => api.put(`/production/${id}`, data),
  delete: (id: string) => api.delete(`/production/${id}`),
};

export const kilnApi = {
  list: () => api.get('/kilns'),
  create: (data: any) => api.post('/kilns', data),
  update: (id: string, data: any) => api.put(`/kilns/${id}`, data),
  delete: (id: string) => api.delete(`/kilns/${id}`),
};

export const inventoryApi = {
  listRaw: () => api.get('/inventory/raw-materials'),
  addRaw: (data: any) => api.post('/inventory/raw-materials', data),
  consume: (data: any) => api.post('/inventory/raw-materials/consume', data),
  listFinished: () => api.get('/inventory/finished-goods'),
  addFinished: (data: any) => api.post('/inventory/finished-goods', data),
  setThreshold: (data: any) => api.post('/inventory/thresholds', data),
};

export const supplierApi = {
  list: () => api.get('/suppliers'),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const reconciliationApi = {
  list: () => api.get('/reconciliations'),
  get: (id: string) => api.get(`/reconciliations/${id}`),
  create: (data: any) => api.post('/reconciliations', data),
};

export const customerApi = {
  list: () => api.get('/customers'),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const orderApi = {
  list: () => api.get('/orders'),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
  updateStatus: (id: string, data: any) => api.put(`/orders/${id}/status`, data),
  delete: (id: string) => api.delete(`/orders/${id}`),
  getStatement: (customerId: string) => api.get(`/orders/statement/${customerId}`),
};

export const priceCatalogueApi = {
  list: () => api.get('/price-catalogue'),
  upsert: (data: any) => api.post('/price-catalogue', data),
  delete: (id: string) => api.delete(`/price-catalogue/${id}`),
};

export const proformaApi = {
  list: () => api.get('/proforma'),
  create: (data: {
    customerId?: string; orderId?: string; brick_type?: string; custom_name?: string;
    quantity?: number; unit_price?: number; notes?: string; valid_until?: string;
    payment_terms?: string; delivery_period?: string;
  }) => api.post('/proforma', data),
  get: (id: string) => api.get(`/proforma/${id}`),
  delete: (id: string) => api.delete(`/proforma/${id}`),
  printUrl: (id: string) => `${api.defaults.baseURL}/proforma/${id}/print`,
};

export const invoiceApi = {
  list: () => api.get('/invoices'),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
};

export const paymentApi = {
  list: (params?: any) => api.get('/payments', { params }),
  create: (data: any) => api.post('/payments', data),
};

export const deliveryApi = {
  list: (params?: any) => api.get('/deliveries', { params }),
  create: (data: any) => api.post('/deliveries', data),
  updateStatus: (id: string, data: any) => api.put(`/deliveries/${id}/status`, data),
  recordDamage: (id: string, data: any) => api.put(`/deliveries/${id}/damage`, data),
  delete: (id: string) => api.delete(`/deliveries/${id}`),
  waybillUrl: (id: string) => `${api.defaults.baseURL}/deliveries/${id}/waybill`,
};

export const expenseApi = {
  list: (params?: any) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const expenseCategoryApi = {
  list: () => api.get('/expense-categories'),
  create: (data: { name: string }) => api.post('/expense-categories', data),
  update: (id: string, data: any) => api.put(`/expense-categories/${id}`, data),
  delete: (id: string) => api.delete(`/expense-categories/${id}`),
};

export const reportApi = {
  production: (params?: any) => api.get('/reports/production', { params }),
  sales: (params?: any) => api.get('/reports/sales', { params }),
  payroll: (params?: any) => api.get('/reports/payroll', { params }),
  financials: (params?: any) => api.get('/reports/financials', { params }),
  exportInvoicesUrl: (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/reports/export/invoices${q ? '?' + q : ''}`;
  },
  exportExpensesUrl: (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/reports/export/expenses${q ? '?' + q : ''}`;
  },
  exportPaymentsUrl: (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return `${api.defaults.baseURL}/reports/export/payments${q ? '?' + q : ''}`;
  },
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const settingsApi = {
  getCompany: () => api.get('/settings/company'),
  updateCompany: (data: any) => api.put('/settings/company', data),
  getPinnedKpis: () => api.get('/settings/kpis'),
  updatePinnedKpis: (pinned_kpis: string[]) => api.put('/settings/kpis', { pinned_kpis }),
};

export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }),
};

export const notificationApi = {
  get: () => api.get('/notifications'),
  markRead: (ids: string[] | 'all') => api.post('/notifications/read', { ids }),
  generate: () => api.post('/notifications/generate'),
};

export const importApi = {
  customers: (csv: string) => api.post('/import/customers', { csv }),
  employees: (csv: string) => api.post('/import/employees', { csv }),
};
