import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { orderApi, customerApi, proformaApi } from '../services/api';
import { Order } from '../types';
import Modal from '../components/ui/Modal';
import Badge, { statusBadge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, fmtDate, fmtRWF } from '../hooks/useToastHelper';
import { PRODUCTS, getBrickLabel } from '../constants/products';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const BRICK_TYPES = Object.keys(PRODUCTS);
const GRADES = ['GRADE_A','GRADE_B','REJECT'];
const STATUSES = ['PENDING','CONFIRMED','IN_PRODUCTION','READY','DELIVERED','CANCELLED'];

const EMPTY = { customerId: '', brick_type: 'BRICK_10', quality_grade: 'GRADE_A', quantity: 0, unit_price: 0, order_date: new Date().toISOString().slice(0,10), required_delivery_date: '', notes: '' };

export default function OrdersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [modal, setModal] = useState<'create' | 'status' | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.list().then(r => r.data.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then(r => r.data.data),
  });

  const createOrder = useMutation({
    mutationFn: (data: any) => orderApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast('Order created', 'success'); setModal(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => orderApi.updateStatus(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast('Status updated', 'success'); setModal(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const deleteOrder = useMutation({
    mutationFn: (id: string) => orderApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast('Order deleted', 'success'); setDeleteId(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const generateProforma = useMutation({
    mutationFn: (orderId: string) => proformaApi.create({ orderId }),
    onSuccess: (res) => {
      const url = proformaApi.printUrl(res.data.data.id);
      window.open(url, '_blank');
      toast('Proforma invoice generated', 'success');
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const totalAmount = (form.quantity || 0) * (form.unit_price || 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-accent">Orders</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ ...EMPTY }); setModal('create'); }}>
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  {['Customer','Brick Type','Grade','Qty','Total','Date','Status','Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o: Order) => (
                  <tr key={o.id} className="border-b border-border hover:bg-background">
                    <td className="px-3 py-3 font-medium">{o.customer?.company_name || o.customer?.full_name || '-'}</td>
                    <td className="px-3 py-3">{getBrickLabel(o.brick_type, o.custom_name)}</td>
                    <td className="px-3 py-3"><Badge variant={o.quality_grade === 'GRADE_A' ? 'success' : o.quality_grade === 'GRADE_B' ? 'warning' : 'danger'}>{o.quality_grade}</Badge></td>
                    <td className="px-3 py-3">{o.quantity?.toLocaleString()}</td>
                    <td className="px-3 py-3 font-medium">{fmtRWF(o.total_amount)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{fmtDate(o.order_date)}</td>
                    <td className="px-3 py-3"><Badge variant={statusBadge(o.status)}>{o.status}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 items-center">
                        <button title="Update Status" onClick={() => { setSelected(o); setModal('status'); }} className="text-xs text-primary hover:underline">Status</button>
                        <span className="text-muted-foreground">·</span>
                        <button title="Proforma Invoice" onClick={() => generateProforma.mutate(o.id)} className="text-xs text-accent hover:underline flex items-center gap-1">
                          <FileText size={11} /> PRO
                        </button>
                        {isAdmin && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <button title="Delete Order" onClick={() => setDeleteId(o.id)} className="text-xs text-danger hover:underline flex items-center gap-1">
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="New Order" size="lg">
        <form onSubmit={e => { e.preventDefault(); createOrder.mutate({ ...form, total_amount: totalAmount }); }} className="space-y-4">
          <div>
            <label className="label">Customer <span className="text-primary">*</span></label>
            <select className="input" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required>
              <option value="">-- Select Customer --</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brick Type</label>
              <select className="input" value={form.brick_type} onChange={e => setForm({ ...form, brick_type: e.target.value })}>
                {BRICK_TYPES.map(b => <option key={b} value={b}>{PRODUCTS[b].name}{b !== 'CUSTOM' ? ` (${PRODUCTS[b].dimensions})` : ''}</option>)}
              </select>
            </div>
            {form.brick_type === 'CUSTOM' && (
              <div><label className="label">Custom Name</label><input className="input" value={form.custom_name || ''} onChange={e => setForm({ ...form, custom_name: e.target.value })} /></div>
            )}
            <div>
              <label className="label">Quality Grade</label>
              <select className="input" value={form.quality_grade} onChange={e => setForm({ ...form, quality_grade: e.target.value })}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="label">Unit Price (RWF)</label>
              <input type="number" className="input" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: Number(e.target.value) })} required />
            </div>
          </div>
          {totalAmount > 0 && (
            <div className="bg-background p-3 rounded-lg text-sm">
              <strong>Total Amount:</strong> {fmtRWF(totalAmount)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Order Date</label><input type="date" className="input" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} /></div>
            <div><label className="label">Required Delivery Date</label><input type="date" className="input" value={form.required_delivery_date} onChange={e => setForm({ ...form, required_delivery_date: e.target.value })} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createOrder.isPending}>{createOrder.isPending ? 'Creating...' : 'Create Order'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Order"
        message="This will permanently remove the order. This cannot be undone."
        onConfirm={() => deleteOrder.mutate(deleteId!)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Update Status Modal */}
      <Modal open={modal === 'status'} onClose={() => setModal(null)} title="Update Order Status">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Order: {selected?.customer?.company_name || selected?.customer?.full_name}</p>
          <div>
            <label className="label">New Status</label>
            <select className="input" defaultValue={selected?.status} onChange={e => updateStatus.mutate({ id: selected!.id, status: e.target.value })}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn-outline w-full" onClick={() => setModal(null)}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
