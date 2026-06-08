import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { deliveryApi, orderApi } from '../services/api';
import Modal from '../components/ui/Modal';
import Badge, { statusBadge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getErrorMessage, fmtDate, fmtRWF } from '../hooks/useToastHelper';

const STATUSES = ['SCHEDULED','IN_TRANSIT','DELIVERED','RETURNED'];

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'status' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({ orderId: '', vehicle_plate: '', driver_name: '', scheduled_date: '', quantity_loaded: 0, fuel_cost: 0, driver_fee: 0, hired_truck_cost: 0 });

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => deliveryApi.list().then(r => r.data.data),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.list().then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => deliveryApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries'] }); toast('Delivery scheduled', 'success'); setModal(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes, actual_delivery_date }: any) => deliveryApi.updateStatus(id, { status, notes, actual_delivery_date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries'] }); toast('Status updated', 'success'); setModal(null); },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-accent">Deliveries</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ orderId: '', vehicle_plate: '', driver_name: '', scheduled_date: new Date().toISOString().slice(0,10), quantity_loaded: 0, fuel_cost: 0, driver_fee: 0, hired_truck_cost: 0 }); setModal('create'); }}>
          <Plus size={16} /> Schedule Delivery
        </button>
      </div>

      <div className="card">
        {isLoading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  {['Customer','Driver','Vehicle','Scheduled','Qty','Total Cost','Status','Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d: any) => {
                  const cost = d.costs?.reduce((s: number, c: any) => s + c.fuel_cost + c.driver_fee + c.hired_truck_cost, 0) || 0;
                  return (
                    <tr key={d.id} className="border-b border-border hover:bg-background">
                      <td className="px-3 py-3">{d.order?.customer?.company_name || d.order?.customer?.full_name || '-'}</td>
                      <td className="px-3 py-3">{d.driver_name || '-'}</td>
                      <td className="px-3 py-3 font-mono text-xs">{d.vehicle_plate || '-'}</td>
                      <td className="px-3 py-3">{d.scheduled_date ? fmtDate(d.scheduled_date) : '-'}</td>
                      <td className="px-3 py-3">{d.quantity_loaded?.toLocaleString()}</td>
                      <td className="px-3 py-3">{fmtRWF(cost)}</td>
                      <td className="px-3 py-3"><Badge variant={statusBadge(d.status)}>{d.status}</Badge></td>
                      <td className="px-3 py-3">
                        <button onClick={() => { setSelected(d); setModal('status'); }} className="text-xs text-primary hover:underline">Update</button>
                      </td>
                    </tr>
                  );
                })}
                {deliveries.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No deliveries yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Schedule Delivery" size="lg">
        <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Order <span className="text-primary">*</span></label>
            <select className="input" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} required>
              <option value="">-- Select Order --</option>
              {orders.filter((o: any) => ['CONFIRMED','READY'].includes(o.status)).map((o: any) => (
                <option key={o.id} value={o.id}>{o.customer?.company_name || o.customer?.full_name} — {o.brick_type}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Driver Name</label><input className="input" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} /></div>
            <div><label className="label">Vehicle Plate</label><input className="input" value={form.vehicle_plate} onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} /></div>
            <div><label className="label">Scheduled Date</label><input type="date" className="input" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div><label className="label">Quantity Loaded</label><input type="number" className="input" value={form.quantity_loaded} onChange={e => setForm({ ...form, quantity_loaded: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Fuel Cost (RWF)</label><input type="number" className="input" value={form.fuel_cost} onChange={e => setForm({ ...form, fuel_cost: Number(e.target.value) })} /></div>
            <div><label className="label">Driver Fee (RWF)</label><input type="number" className="input" value={form.driver_fee} onChange={e => setForm({ ...form, driver_fee: Number(e.target.value) })} /></div>
            <div><label className="label">Truck Cost (RWF)</label><input type="number" className="input" value={form.hired_truck_cost} onChange={e => setForm({ ...form, hired_truck_cost: Number(e.target.value) })} /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Schedule'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'status'} onClose={() => setModal(null)} title="Update Delivery Status">
        <div className="space-y-4">
          <div>
            <label className="label">Status</label>
            <select className="input" defaultValue={selected?.status} id="del-status">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Actual Delivery Date</label>
            <input type="date" className="input" id="del-date" defaultValue={new Date().toISOString().slice(0,10)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" id="del-notes" />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => {
              const status = (document.getElementById('del-status') as HTMLSelectElement).value;
              const actual_delivery_date = (document.getElementById('del-date') as HTMLInputElement).value;
              const notes = (document.getElementById('del-notes') as HTMLInputElement).value;
              updateStatus.mutate({ id: selected.id, status, actual_delivery_date, notes });
            }} disabled={updateStatus.isPending}>Update</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
