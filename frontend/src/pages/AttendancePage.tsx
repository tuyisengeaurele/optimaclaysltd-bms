import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarCheck } from 'lucide-react';
import { attendanceApi, employeeApi } from '../services/api';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import Badge, { statusBadge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, MONTHS, fmtDate } from '../hooks/useToastHelper';

const STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'];

export default function AttendancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modal, setModal] = useState<'single' | 'bulk' | null>(null);
  const [form, setForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), status: 'PRESENT', notes: '' });

  // Bulk attendance state: { employeeId -> status }
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkRows, setBulkRows] = useState<Record<string, string>>({});

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['attendance', month, year],
    queryFn: () => attendanceApi.list({ month, year }).then(r => r.data.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.list().then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: (data: any) => attendanceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast('Attendance recorded', 'success');
      setModal(null);
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  function openBulk() {
    // Pre-fill all active employees as PRESENT
    const rows: Record<string, string> = {};
    (employees as any[]).filter((e: any) => e.is_active).forEach((e: any) => { rows[e.id] = 'PRESENT'; });
    setBulkRows(rows);
    setModal('bulk');
  }

  function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    const entries = Object.entries(bulkRows).map(([employeeId, status]) => ({
      employeeId,
      date: bulkDate,
      status,
    }));
    save.mutate({ entries });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-accent">Attendance</h1>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={openBulk}>
            <CalendarCheck size={16} /> Bulk Entry
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setModal('single')}>
            <Plus size={16} /> Single Entry
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="label">Month</label>
            <select className="input w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" className="input w-24" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                {['Employee', 'Date', 'Status', 'Notes'].map(h => (
                  <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-border">
                  <td className="px-3 py-3 font-medium">{log.employee?.full_name}</td>
                  <td className="px-3 py-3">{fmtDate(log.date)}</td>
                  <td className="px-3 py-3"><Badge variant={statusBadge(log.status)}>{log.status}</Badge></td>
                  <td className="px-3 py-3 text-muted-foreground">{log.notes || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No attendance records for this period</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Single entry modal */}
      <Modal isOpen={modal === 'single'} onClose={() => setModal(null)} title="Record Attendance">
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Employee <span className="text-primary">*</span></label>
            <select className="input" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
              <option value="">-- Select Employee --</option>
              {(employees as any[]).map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Bulk entry modal */}
      <Modal isOpen={modal === 'bulk'} onClose={() => setModal(null)} title="Bulk Attendance Entry">
        <form onSubmit={submitBulk} className="space-y-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input w-48" value={bulkDate} onChange={e => setBulkDate(e.target.value)} required />
          </div>
          <div className="max-h-80 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-background sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(employees as any[]).filter((e: any) => e.is_active).map((emp: any) => (
                  <tr key={emp.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{emp.full_name}</td>
                    <td className="px-3 py-2">
                      <select
                        className="input py-1 text-sm"
                        value={bulkRows[emp.id] ?? 'PRESENT'}
                        onChange={e => setBulkRows(r => ({ ...r, [emp.id]: e.target.value }))}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving...' : `Save All (${Object.keys(bulkRows).length} employees)`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
