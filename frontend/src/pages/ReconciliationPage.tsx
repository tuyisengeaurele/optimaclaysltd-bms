import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { reconciliationApi } from '../services/api';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, fmtDate } from '../hooks/useToastHelper';

const MATERIAL_TYPES = ['CLAY', 'SAND', 'FUEL_FIREWOOD', 'FUEL_COAL', 'DIESEL', 'CEMENT', 'OTHER'];

interface ReconciliationItem {
  material_type: string;
  system_quantity: number;
  physical_quantity: number;
  notes: string;
}

const emptyItem = (): ReconciliationItem => ({ material_type: 'CLAY', system_quantity: 0, physical_quantity: 0, notes: '' });

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<ReconciliationItem[]>([emptyItem()]);
  const [notes, setNotes] = useState('');

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: () => reconciliationApi.list().then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => reconciliationApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliations'] });
      toast('Reconciliation recorded', 'success');
      setModal(false);
      setItems([emptyItem()]);
      setNotes('');
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  function updateItem(idx: number, field: keyof ReconciliationItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ notes, items });
  }

  const varianceColor = (v: number) => v === 0 ? 'text-muted-foreground' : v > 0 ? 'text-success' : 'text-danger';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">Stock Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">Compare physical stock counts against system records</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal(true)}>
          <Plus size={16} /> New Reconciliation
        </button>
      </div>

      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <div>
            {(reconciliations as any[]).length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No reconciliations yet.</p>
            ) : (
              (reconciliations as any[]).map((rec: any) => (
                <div key={rec.id} className="border-b border-border last:border-0">
                  <button
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-background transition-colors text-left"
                    onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                  >
                    <div>
                      <span className="font-medium text-accent">{fmtDate(rec.createdAt)}</span>
                      <span className="ml-4 text-sm text-muted-foreground">By {rec.reconciled_by}</span>
                      {rec.notes && <span className="ml-4 text-sm text-muted-foreground italic">{rec.notes}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{rec.items?.length} item(s)</span>
                      {expanded === rec.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>
                  {expanded === rec.id && (
                    <div className="px-4 pb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="table-header">
                            {['Material', 'System Qty', 'Physical Qty', 'Variance', 'Notes'].map(h => (
                              <th key={h} className="px-3 py-2 text-left first:rounded-l last:rounded-r">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rec.items?.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-border">
                              <td className="px-3 py-2">{item.material_type}</td>
                              <td className="px-3 py-2">{item.system_quantity?.toLocaleString()}</td>
                              <td className="px-3 py-2">{item.physical_quantity?.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-semibold ${varianceColor(item.variance)}`}>
                                {item.variance > 0 ? '+' : ''}{item.variance?.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{item.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Stock Reconciliation" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Overall Notes</label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about this count..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Items</label>
              <button type="button" onClick={addItem} className="text-sm text-primary hover:underline flex items-center gap-1">
                <Plus size={13} /> Add item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-background rounded-lg p-3">
                  <div className="col-span-3">
                    {idx === 0 && <label className="label text-xs">Material</label>}
                    <select className="input" value={item.material_type} onChange={e => updateItem(idx, 'material_type', e.target.value)}>
                      {MATERIAL_TYPES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label text-xs">System Qty</label>}
                    <input type="number" className="input" value={item.system_quantity} onChange={e => updateItem(idx, 'system_quantity', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="label text-xs">Physical Qty</label>}
                    <input type="number" className="input" value={item.physical_quantity} onChange={e => updateItem(idx, 'physical_quantity', Number(e.target.value))} />
                  </div>
                  <div className="col-span-1 text-center">
                    {idx === 0 && <div className="label text-xs">Var</div>}
                    <div className={`text-sm font-semibold ${varianceColor(item.physical_quantity - item.system_quantity)}`}>
                      {item.physical_quantity - item.system_quantity > 0 ? '+' : ''}{item.physical_quantity - item.system_quantity}
                    </div>
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <label className="label text-xs">Notes</label>}
                    <input className="input" value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-danger text-xs hover:underline">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Saving...' : 'Save Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
