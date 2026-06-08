import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Pencil } from 'lucide-react';
import { productionApi } from '../services/api';
import { ProductionBatch } from '../types';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, fmtDate } from '../hooks/useToastHelper';

const SHIFTS = ['MORNING', 'AFTERNOON', 'NIGHT'];
const STAGES = ['RAW_MIXING','MOLDING','DRYING','KILN_FIRING','QUALITY_CHECK','STOCKPILED'];

const EMPTY = { date: new Date().toISOString().slice(0,10), shift: 'MORNING', kiln_number: '', bricks_target: 0, bricks_produced: 0, bricks_rejected: 0, rejection_reason: '', current_stage: 'RAW_MIXING' };

export default function ProductionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ProductionBatch | null>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['production'],
    queryFn: () => productionApi.list().then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['production-stats'],
    queryFn: () => productionApi.stats().then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => selected ? productionApi.update(selected.id, data) : productionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production'] });
      qc.invalidateQueries({ queryKey: ['production-stats'] });
      toast(selected ? 'Batch updated' : 'Batch created', 'success');
      setModal(null);
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  function openCreate() { setSelected(null); setForm({ ...EMPTY }); setModal('create'); }
  function openEdit(b: ProductionBatch) { setSelected(b); setForm({ ...b, date: b.date.slice(0,10) }); setModal('edit'); }

  const stageColor: Record<string, any> = {
    RAW_MIXING: 'muted', MOLDING: 'info', DRYING: 'warning',
    KILN_FIRING: 'danger', QUALITY_CHECK: 'info', STOCKPILED: 'success',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Production</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Add Batch
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalProduced?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Produced (30 days)</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-danger">{stats.totalRejected?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Rejected (30 days)</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-warning">{stats.rejectionRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">Rejection Rate</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {stats?.daily?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-accent mb-4">Daily Output — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2D9D0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="produced" fill="#C0392B" radius={[3,3,0,0]} name="Produced" />
              <Bar dataKey="rejected" fill="#E74C3C" radius={[3,3,0,0]} name="Rejected" opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  {['Date','Shift','Kiln','Target','Produced','Rejected','Stage','Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b: ProductionBatch) => (
                  <tr key={b.id} className="border-b border-border hover:bg-background">
                    <td className="px-3 py-3">{fmtDate(b.date)}</td>
                    <td className="px-3 py-3">{b.shift}</td>
                    <td className="px-3 py-3">{b.kiln_number}</td>
                    <td className="px-3 py-3">{b.bricks_target?.toLocaleString()}</td>
                    <td className="px-3 py-3 font-medium">{b.bricks_produced?.toLocaleString()}</td>
                    <td className="px-3 py-3 text-danger">{b.bricks_rejected?.toLocaleString()}</td>
                    <td className="px-3 py-3"><Badge variant={stageColor[b.current_stage]}>{b.current_stage.replace('_',' ')}</Badge></td>
                    <td className="px-3 py-3">
                      <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-background rounded text-accent"><Pencil size={14} /></button>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No batches recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Batch' : 'Add Production Batch'} size="lg">
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Shift</label>
            <select className="input" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
              {SHIFTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Kiln Number</label>
            <input className="input" value={form.kiln_number} onChange={e => setForm({ ...form, kiln_number: e.target.value })} required />
          </div>
          <div>
            <label className="label">Current Stage</label>
            <select className="input" value={form.current_stage} onChange={e => setForm({ ...form, current_stage: e.target.value })}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Target</label>
            <input type="number" className="input" value={form.bricks_target} onChange={e => setForm({ ...form, bricks_target: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Produced</label>
            <input type="number" className="input" value={form.bricks_produced} onChange={e => setForm({ ...form, bricks_produced: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Rejected</label>
            <input type="number" className="input" value={form.bricks_rejected} onChange={e => setForm({ ...form, bricks_rejected: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <label className="label">Rejection Reason</label>
            <input className="input" value={form.rejection_reason} onChange={e => setForm({ ...form, rejection_reason: e.target.value })} />
          </div>
          <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
