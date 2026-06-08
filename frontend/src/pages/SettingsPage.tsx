import React, { useState, useEffect } from 'react';
import { KeyRound, User, Pencil } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { getErrorMessage } from '../hooks/useToastHelper';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Sync profile form whenever user data is available / changes
  useEffect(() => {
    if (user) {
      setProfileForm({ full_name: user.full_name || '', email: user.email || '' });
    }
  }, [user?.email, user?.full_name]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      toast('Full name cannot be empty', 'error');
      return;
    }
    if (!profileForm.email.trim()) {
      toast('Email cannot be empty', 'error');
      return;
    }
    setProfileLoading(true);
    try {
      await authApi.updateProfile({ full_name: profileForm.full_name, email: profileForm.email });
      await refreshUser();
      toast('Profile updated successfully', 'success');
      setEditingProfile(false);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast('Password changed successfully', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* Profile section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <User size={18} className="text-accent" />
            <h2 className="font-semibold text-accent">Profile</h2>
          </div>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={profileForm.full_name}
                onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <span className="text-gray-500 text-sm">Role</span>
              <p className="font-medium mt-0.5 capitalize text-sm">{user?.role?.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditingProfile(false);
                  setProfileForm({ full_name: user?.full_name || '', email: user?.email || '' });
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={profileLoading} className="btn-primary">
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Full Name</span>
              <p className="font-medium mt-0.5">{user?.full_name}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <span className="text-gray-500">Role</span>
              <p className="font-medium mt-0.5 capitalize">{user?.role?.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={18} className="text-accent" />
          <h2 className="font-semibold text-accent">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={pwLoading} className="btn-primary">
              {pwLoading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      </div>{/* end grid */}
    </div>
  );
}
