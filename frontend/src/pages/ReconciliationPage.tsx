import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { reconciliationApi, inventoryApi } from '../services/api';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, fmtDate } from '../hooks/useToastHelper';

interface ReconciliationItem {
  material_type: string;
  system_quantity: number;
  physical_quantity: number;
  unit: string;
  notes: string;
}

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [notes, setNotes] = useState('');

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: () => reconciliationApi.list().then(r => r.data.data),
  });

  const { data: stockLevels = [], isFetching: stockFetching, refetch: refetchStock } = useQuery<any[]>({
    queryKey: ['inventory-raw'],
    queryFn: () => inventoryApi.listRaw().then(r => r.data.data),
  });

  function openModal() {
    // Seed one row per material that exists in the DB; physical qty starts at 0
    const seeded: ReconciliationItem[] = (stockLevels as any[]).map((s: any) => ({
      material_type: s.material_type,
      system_quantity: s.current ?? 0,
      physical_quantity: s.current ?? 0, // pre-fill with system qty so user only changes what differs
      unit: s.unit || '',
      notes: '',
    }));
    setItems(seeded.length ? seeded : [{ material_type: '', system_quantity: 0, physical_quantity: 0, unit: '', notes: '' }]);
    setNotes('');
    setModal(true);
  }

  const create = useMutation({
    mutationFn: (data: any) => reconciliationApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliations'] });
      toast('Reconciliation recorded', 'success');
      setModal(false);
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  function updateItem(idx: number, field: keyof ReconciliationItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ notes, items });
  }

  const varianceColor = (v: number) => v === 0 ? 'text-muted-foreground' : v > 0 ? 'text-success font-semibold' : 'text-danger font-semibold';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">Stock Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">System quantities are loaded from the database — just enter your physical count</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openModal} disabled={stockFetching}>
          <Plus size={16} /> New Reconciliation
        </button>
      </div>

      {/* History */}
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
                      {rec.notes && <span className="ml-4 text-sm text-muted-foreground italic">"{rec.notes}"</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {/* variance summary badges */}
                      {rec.items?.some((i: any) => i.variance < 0) && (
                        <span className="badge bg-red-100 text-red-700">{rec.items.filter((i: any) => i.variance < 0).length} shortage</span>
                      )}
                      {rec.items?.some((i: any) => i.variance > 0) && (
                        <span className="badge bg-green-100 text-green-700">{rec.items.filter((i: any) => i.variance > 0).length} surplus</span>
                      )}
                      <span>{rec.items?.length} material(s)</span>
                      {expanded === rec.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>

                  {expanded === rec.id && (
                    <div className="px-4 pb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="table-header">
                            {['Material', 'Unit', 'System Qty', 'Physical Qty', 'Variance', 'Notes'].map(h => (
                              <th key={h} className="px-3 py-2 text-left first:rounded-l last:rounded-r">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rec.items?.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 font-medium">{item.material_type?.replace(/_/g, ' ')}</td>
                              <td className="px-3 py-2 text-muted-foreground">{item.unit || '—'}</td>
                              <td className="px-3 py-2">{item.system_quantity?.toLocaleString()}</td>
                              <td className="px-3 py-2">{item.physical_quantity?.toLocaleString()}</td>
                              <td className={`px-3 py-2 ${varianceColor(item.variance)}`}>
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

      {/* New reconciliation modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Stock Reconciliation" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Info banner */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-800">
            <RefreshCw size={13} className="mt-0.5 flex-shrink-0" />
            <span>System quantities are loaded from the database as of right now. Adjust the <strong>Physical Count</strong> column to match what you counted on the floor.</span>
          </div>

          <div>
            <label className="label">Count Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. End-of-month count, after rain storage check…" />
          </div>

          <div>
            <div className="grid grid-cols-12 gap-2 px-1 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <div className="col-span-3">Material</div>
              <div className="col-span-2 text-right">System Qty</div>
              <div className="col-span-2">Physical Count</div>
              <div className="col-span-1 text-center">Var</div>
              <div className="col-span-3">Notes</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const variance = item.physical_quantity - item.system_quantity;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-background rounded-lg px-3 py-2.5">
                    {/* Material name — read-only */}
                    <div className="col-span-3 text-sm font-medium text-accent">
                      {item.material_type.replace(/_/g, ' ')}
                      {item.unit && <span className="ml-1 text-xs text-muted-foreground">({item.unit})</span>}
                    </div>

                    {/* System qty — read-only, from DB */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-mono bg-surface border border-border rounded px-2 py-1 text-muted-foreground">
                        {item.system_quantity.toLocaleString()}
                      </span>
                    </div>

                    {/* Physical count — editable */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        className="input text-center"
                        value={item.physical_quantity}
                        onChange={e => updateItem(idx, 'physical_quantity', Number(e.target.value))}
                      />
                    </div>

                    {/* Variance — live */}
                    <div className={`col-span-1 text-center text-sm ${varianceColor(variance)}`}>
                      {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                    </div>

                    {/* Notes */}
                    <div className="col-span-3">
                      <input
                        className="input text-xs"
                        placeholder="Reason…"
                        value={item.notes}
                        onChange={e => updateItem(idx, 'notes', e.target.value)}
                      />
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-danger text-xs transition-colors">✕</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No stock lines found. Add materials in Inventory first.</p>
            )}
          </div>

          {/* Totals summary */}
          {items.length > 0 && (
            <div className="flex gap-4 text-xs px-1">
              <span className="text-muted-foreground">
                {items.filter(i => i.physical_quantity - i.system_quantity < 0).length > 0 && (
                  <span className="text-danger font-medium mr-3">
                    {items.filter(i => i.physical_quantity - i.system_quantity < 0).length} shortage(s)
                  </span>
                )}
                {items.filter(i => i.physical_quantity - i.system_quantity > 0).length > 0 && (
                  <span className="text-success font-medium mr-3">
                    {items.filter(i => i.physical_quantity - i.system_quantity > 0).length} surplus(es)
                  </span>
                )}
                {items.every(i => i.physical_quantity === i.system_quantity) && (
                  <span className="text-success font-medium">All quantities match</span>
                )}
              </span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={create.isPending || items.length === 0}>
              {create.isPending ? 'Saving…' : 'Save Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
