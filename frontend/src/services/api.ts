import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(original);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
};

// Employees
export const employeeApi = {
  list: () => api.get('/employees'),
  get: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// Payroll
export const payrollApi = {
  list: () => api.get('/payroll'),
  get: (runId: string) => api.get(`/payroll/${runId}`),
  create: (data: { month: number; year: number }) => api.post('/payroll', data),
  updateEntry: (runId: string, entryId: string, data: any) => api.put(`/payroll/${runId}/entries/${entryId}`, data),
  finalize: (runId: string) => api.post(`/payroll/${runId}/finalize`),
  exportUrl: (runId: string) => `${api.defaults.baseURL}/payroll/${runId}/export`,
  payslipUrl: (runId: string, employeeId: string) => `${api.defaults.baseURL}/payroll/${runId}/payslip/${employeeId}`,
};

// Attendance
export const attendanceApi = {
  list: (params?: any) => api.get('/attendance', { params }),
  create: (data: any) => api.post('/attendance', data),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
  summary: (params: any) => api.get('/attendance/summary', { params }),
};

// Production
export const productionApi = {
  list: (params?: any) => api.get('/production', { params }),
  stats: () => api.get('/production/stats'),
  create: (data: any) => api.post('/production', data),
  update: (id: string, data: any) => api.put(`/production/${id}`, data),
};

// Inventory
export const inventoryApi = {
  listRaw: () => api.get('/inventory/raw-materials'),
  addRaw: (data: any) => api.post('/inventory/raw-materials', data),
  consume: (data: any) => api.post('/inventory/raw-materials/consume', data),
  listFinished: () => api.get('/inventory/finished-goods'),
  addFinished: (data: any) => api.post('/inventory/finished-goods', data),
  setThreshold: (data: any) => api.post('/inventory/thresholds', data),
};

// Customers
export const customerApi = {
  list: () => api.get('/customers'),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// Orders
export const orderApi = {
  list: () => api.get('/orders'),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  updateStatus: (id: string, data: any) => api.put(`/orders/${id}/status`, data),
};

// Proforma
export const proformaApi = {
  create: (data: { orderId: string }) => api.post('/proforma', data),
  get: (id: string) => api.get(`/proforma/${id}`),
  printUrl: (id: string) => `${api.defaults.baseURL}/proforma/${id}/print`,
};

// Invoices
export const invoiceApi = {
  list: () => api.get('/invoices'),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
};

// Payments
export const paymentApi = {
  list: (params?: any) => api.get('/payments', { params }),
  create: (data: any) => api.post('/payments', data),
};

// Deliveries
export const deliveryApi = {
  list: (params?: any) => api.get('/deliveries', { params }),
  create: (data: any) => api.post('/deliveries', data),
  updateStatus: (id: string, data: any) => api.put(`/deliveries/${id}/status`, data),
};

// Expenses
export const expenseApi = {
  list: (params?: any) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
};

// Reports
export const reportApi = {
  production: (params?: any) => api.get('/reports/production', { params }),
  sales: (params?: any) => api.get('/reports/sales', { params }),
  payroll: (params?: any) => api.get('/reports/payroll', { params }),
  financials: (params?: any) => api.get('/reports/financials', { params }),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};
