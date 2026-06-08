import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard } from 'lucide-react';
import { invoiceApi, paymentApi, orderApi } from '../services/api';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, fmtDate, fmtRWF } from '../hooks/useToastHelper';

const PAYMENT_METHODS = ['CASH','MOBILE_MONEY','BANK_TRANSFER'];

export default function InvoicesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'payment' | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [form, setForm] = useState<any>({ orderId: '', due_date: '' });
  const [payForm, setPayForm] = useState<any>({ amount: 0, date: new Date().toISOString().slice(0,10), method: 'BANK_TRANSFER', reference: '', notes: '' });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceApi.list().then(r => r.data.data),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.list().then(r => r.data.data),
  });

  const createInvoice = useMutation({
    mutationFn: (data: any) => invoiceApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast('Invoice created', 'success'); setModal(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const addPayment = useMutation({
    mutationFn: (data: any) => paymentApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast('Payment recorded', 'success'); setModal(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-accent">Invoices</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ orderId: '', due_date: '' }); setModal('create'); }}>
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  {['Invoice #','Customer','Date','Total','Paid','Balance','Status','Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-background">
                    <td className="px-3 py-3 font-mono text-xs font-medium">{inv.number}</td>
                    <td className="px-3 py-3">{inv.order?.customer?.company_name || inv.order?.customer?.full_name || '-'}</td>
                    <td className="px-3 py-3">{fmtDate(inv.date)}</td>
                    <td className="px-3 py-3 font-medium">{fmtRWF(inv.total)}</td>
                    <td className="px-3 py-3 text-success">{fmtRWF(inv.paid || 0)}</td>
                    <td className="px-3 py-3 font-medium text-danger">{fmtRWF(inv.balance || 0)}</td>
                    <td className="px-3 py-3">
                      {inv.is_overdue ? <Badge variant="danger">OVERDUE</Badge> :
                       inv.balance <= 0 ? <Badge variant="success">PAID</Badge> :
                       <Badge variant="warning">PENDING</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => { setSelectedInvoice(inv); setPayForm({ amount: inv.balance || 0, date: new Date().toISOString().slice(0,10), method: 'BANK_TRANSFER', reference: '', notes: '' }); setModal('payment'); }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <CreditCard size={12} /> Payment
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No invoices yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Invoice">
        <form onSubmit={e => { e.preventDefault(); createInvoice.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Order <span className="text-primary">*</span></label>
            <select className="input" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} required>
              <option value="">-- Select Order --</option>
              {orders.filter((o: any) => o.status !== 'CANCELLED').map((o: any) => (
                <option key={o.id} value={o.id}>{o.customer?.company_name || o.customer?.full_name} — {fmtRWF(o.total_amount)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Due Date</label>
            <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createInvoice.isPending}>{createInvoice.isPending ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title={`Record Payment — ${selectedInvoice?.number}`}>
        <form onSubmit={e => { e.preventDefault(); addPayment.mutate({ ...payForm, invoiceId: selectedInvoice.id }); }} className="space-y-4">
          <div className="bg-background p-3 rounded-lg text-sm">
            <div>Balance: <strong className="text-danger">{fmtRWF(selectedInvoice?.balance || 0)}</strong></div>
          </div>
          <div><label className="label">Amount (RWF)</label><input type="number" className="input" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: Number(e.target.value) })} required /></div>
          <div><label className="label">Date</label><input type="date" className="input" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="label">Reference</label><input className="input" value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} /></div>
          <div><label className="label">Notes</label><input className="input" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={addPayment.isPending}>{addPayment.isPending ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
