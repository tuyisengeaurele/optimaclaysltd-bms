import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { payrollApi } from '../services/api';
import { PayrollRun } from '../types';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import Badge, { statusBadge } from '../components/ui/Badge';
import { getErrorMessage, MONTHS } from '../hooks/useToastHelper';

export default function PayrollPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: () => payrollApi.list().then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: () => payrollApi.create({ month, year }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
      toast('Payroll run created', 'success');
      setModal(false);
      navigate(`/payroll/${res.data.data.id}`);
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-accent">Payroll</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={16} /> New Payroll Run
        </button>
      </div>

      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                {['Period','Entries','Status','Finalized','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r: any) => (
                <tr key={r.id} className="border-b border-border hover:bg-background">
                  <td className="px-3 py-3 font-medium">{MONTHS[r.month - 1]} {r.year}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r.entries?.length || 0} employees</td>
                  <td className="px-3 py-3"><Badge variant={statusBadge(r.status)}>{r.status}</Badge></td>
                  <td className="px-3 py-3"><Badge variant={r.finalized ? 'success' : 'muted'}>{r.finalized ? 'Yes' : 'No'}</Badge></td>
                  <td className="px-3 py-3">
                    <button onClick={() => navigate(`/payroll/${r.id}`)} className="flex items-center gap-1 text-primary hover:underline text-xs">
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No payroll runs yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Payroll Run">
        <div className="space-y-4">
          <div>
            <label className="label">Month</label>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" className="input" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2100} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
