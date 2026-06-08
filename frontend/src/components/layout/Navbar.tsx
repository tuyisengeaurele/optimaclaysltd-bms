import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between no-print">
      <div className="text-sm text-muted-foreground">
        OPTIMA CLAYS LTD — Business Management System
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <div className="font-medium text-accent text-xs">{user?.full_name}</div>
            <div className="text-muted-foreground text-xs">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <Link to="/profile" className="p-1.5 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-accent">
          <Settings size={16} />
        </Link>
        <button onClick={handleLogout} className="p-1.5 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-danger">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
