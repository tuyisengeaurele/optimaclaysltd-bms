import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, Calendar, Factory, Package,
  ShoppingCart, FileText, FileCheck, Truck, TrendingUp, BarChart2,
  PanelLeftClose, PanelLeftOpen, UserCheck, ClipboardList, ShieldCheck, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ALL_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: null },
  { to: '/employees', icon: Users, label: 'Employees', roles: ['ADMIN', 'ACCOUNTANT'] },
  { to: '/attendance', icon: UserCheck, label: 'Attendance', roles: ['ADMIN', 'PRODUCTION_SUPERVISOR'] },
  { to: '/payroll', icon: DollarSign, label: 'Payroll', roles: ['ADMIN', 'ACCOUNTANT'] },
  { to: '/production', icon: Factory, label: 'Production', roles: ['ADMIN', 'PRODUCTION_SUPERVISOR'] },
  { to: '/inventory', icon: Package, label: 'Inventory', roles: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION_SUPERVISOR'] },
  { to: '/customers', icon: ClipboardList, label: 'Customers', roles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT'] },
  { to: '/orders', icon: ShoppingCart, label: 'Orders', roles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT'] },
  { to: '/invoices', icon: FileText, label: 'Invoices', roles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT'] },
  { to: '/proformas', icon: FileCheck, label: 'Proformas', roles: ['ADMIN', 'SALES_OFFICER', 'ACCOUNTANT'] },
  { to: '/deliveries', icon: Truck, label: 'Deliveries', roles: ['ADMIN', 'SALES_OFFICER', 'STORE_MANAGER'] },
  { to: '/financials', icon: TrendingUp, label: 'Financials', roles: ['ADMIN', 'ACCOUNTANT'] },
  { to: '/reports', icon: BarChart2, label: 'Reports', roles: ['ADMIN', 'ACCOUNTANT'] },
  { to: '/users', icon: ShieldCheck, label: 'Users', roles: ['ADMIN'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: null },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const NAV = ALL_NAV.filter(item => !item.roles || item.roles.includes(user?.role ?? ''));

  return (
    <aside
      className={`relative flex flex-col bg-accent text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'} h-full flex-shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src="/logo.png"
          alt="OPTIMA CLAYS LTD"
          className={`object-contain flex-shrink-0 ${collapsed ? 'h-8 w-8' : 'h-10 w-auto max-w-[120px]'}`}
        />
        {!collapsed && (
          <div>
            <div className="font-bold text-sm leading-tight">OPTIMA CLAYS</div>
            <div className="text-xs text-white/60">Business System</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10 ${
                isActive ? 'bg-primary text-white' : 'text-white/70'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Floating collapse toggle — on the right edge */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3.5 top-6 z-20 flex items-center justify-center w-7 h-7 bg-surface border border-border rounded-full shadow-md text-muted-foreground hover:text-accent hover:border-accent transition-all duration-150"
      >
        {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>
    </aside>
  );
}
