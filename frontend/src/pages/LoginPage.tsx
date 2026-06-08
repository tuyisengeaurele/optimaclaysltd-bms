import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { getErrorMessage } from '../hooks/useToastHelper';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-accent px-8 py-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">OC</span>
          </div>
          <h1 className="text-white font-bold text-xl">OPTIMA CLAYS LTD</h1>
          <p className="text-white/60 text-sm mt-1">Business Management System</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <h2 className="font-semibold text-accent mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@optimaclays.rw"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
