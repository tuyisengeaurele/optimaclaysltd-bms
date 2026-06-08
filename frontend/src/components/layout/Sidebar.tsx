import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, Calendar, Factory, Package,
  ShoppingCart, FileText, Truck, TrendingUp, BarChart2, ChevronLeft,
  ChevronRight, UserCheck, ClipboardList
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/attendance', icon: UserCheck, label: 'Attendance' },
  { to: '/payroll', icon: DollarSign, label: 'Payroll' },
  { to: '/production', icon: Factory, label: 'Production' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/customers', icon: ClipboardList, label: 'Customers' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/deliveries', icon: Truck, label: 'Deliveries' },
  { to: '/financials', icon: TrendingUp, label: 'Financials' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-accent text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'} min-h-screen flex-shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">OC</span>
        </div>
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

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 border-t border-white/10 hover:bg-white/10 transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
