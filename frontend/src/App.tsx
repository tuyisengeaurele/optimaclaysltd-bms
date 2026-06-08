import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';

import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import PayrollRunPage from './pages/PayrollRunPage';
import ProductionPage from './pages/ProductionPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import OrdersPage from './pages/OrdersPage';
import InvoicesPage from './pages/InvoicesPage';
import ProformasPage from './pages/ProformasPage';
import DeliveriesPage from './pages/DeliveriesPage';
import FinancialsPage from './pages/FinancialsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="payroll/:runId" element={<PayrollRunPage />} />
              <Route path="production" element={<ProductionPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="proformas" element={<ProformasPage />} />
              <Route path="deliveries" element={<DeliveriesPage />} />
              <Route path="financials" element={<FinancialsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
