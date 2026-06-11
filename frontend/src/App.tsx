import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute, { RequireRole } from './components/layout/ProtectedRoute';
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

              <Route path="employees" element={
                <RequireRole roles={['ADMIN', 'ACCOUNTANT']}>
                  <EmployeesPage />
                </RequireRole>
              } />
              <Route path="attendance" element={
                <RequireRole roles={['ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT']}>
                  <AttendancePage />
                </RequireRole>
              } />
              <Route path="payroll" element={
                <RequireRole roles={['ADMIN', 'ACCOUNTANT']}>
                  <PayrollPage />
                </RequireRole>
              } />
              <Route path="payroll/:runId" element={
                <RequireRole roles={['ADMIN', 'ACCOUNTANT']}>
                  <PayrollRunPage />
                </RequireRole>
              } />

              <Route path="production" element={
                <RequireRole roles={['ADMIN', 'PRODUCTION_SUPERVISOR']}>
                  <ProductionPage />
                </RequireRole>
              } />
              <Route path="inventory" element={
                <RequireRole roles={['ADMIN', 'STORE_MANAGER', 'PRODUCTION_SUPERVISOR']}>
                  <InventoryPage />
                </RequireRole>
              } />

              <Route path="customers" element={
                <RequireRole roles={['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']}>
                  <CustomersPage />
                </RequireRole>
              } />
              <Route path="orders" element={
                <RequireRole roles={['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']}>
                  <OrdersPage />
                </RequireRole>
              } />
              <Route path="invoices" element={
                <RequireRole roles={['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']}>
                  <InvoicesPage />
                </RequireRole>
              } />
              <Route path="proformas" element={
                <RequireRole roles={['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT']}>
                  <ProformasPage />
                </RequireRole>
              } />
              <Route path="deliveries" element={
                <RequireRole roles={['ADMIN', 'SALES_OFFICER', 'STORE_MANAGER']}>
                  <DeliveriesPage />
                </RequireRole>
              } />

              <Route path="financials" element={
                <RequireRole roles={['ADMIN', 'ACCOUNTANT']}>
                  <FinancialsPage />
                </RequireRole>
              } />
              <Route path="reports" element={
                <RequireRole roles={['ADMIN', 'ACCOUNTANT']}>
                  <ReportsPage />
                </RequireRole>
              } />

              <Route path="users" element={
                <RequireRole roles={['ADMIN']}>
                  <UsersPage />
                </RequireRole>
              } />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
