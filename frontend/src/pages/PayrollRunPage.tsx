import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, ArrowLeft, Lock, FileText } from 'lucide-react';
import { payrollApi } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { TableSkeleton } from '../components/ui/Skeleton';
import Badge, { statusBadge } from '../components/ui/Badge';
import { getErrorMessage, MONTHS, fmtRWF } from '../hooks/useToastHelper';

export default function PayrollRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: run, isLoading } = useQuery({
    queryKey: ['payroll', runId],
    queryFn: () => payrollApi.get(runId!).then(r => r.data.data),
  });

  const updateEntry = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: any }) =>
      payrollApi.updateEntry(runId!, entryId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', runId] }),
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  const finalize = useMutation({
    mutationFn: () => payrollApi.finalize(runId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', runId] });
      toast('Payroll run finalized', 'success');
    },
    onError: err => toast(getErrorMessage(err), 'error'),
  });

  function handleExport() {
    const url = payrollApi.exportUrl(runId!);
    window.open(url, '_blank');
  }

  function handlePayslip(employeeId: string) {
    const url = payrollApi.payslipUrl(runId!, employeeId);
    window.open(url, '_blank');
  }

  if (isLoading) return <div className="p-6"><TableSkeleton /></div>;
  if (!run) return <div className="p-6 text-muted-foreground">Payroll run not found</div>;

  const period = `${MONTHS[run.month - 1]} ${run.year}`;
  const totalNet = run.entries?.reduce((s: number, e: any) => s + e.net_salary, 0) || 0;

  return (
    <div>
      <button onClick={() => navigate('/payroll')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent mb-4">
        <ArrowLeft size={14} /> Back to Payroll
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">{period} Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {run.entries?.length} employees · Total Net: <strong>{fmtRWF(totalNet)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          {!run.finalized && (
            <button className="btn-outline flex items-center gap-2" onClick={() => finalize.mutate()} disabled={finalize.isPending}>
              <Lock size={14} /> Finalize
            </button>
          )}
          {run.finalized && (
            <button className="btn-primary flex items-center gap-2" onClick={handleExport}>
              <Download size={14} /> Export Bank File
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                {['Employee','Bank','Account','Gross Salary (RWF)','Net Salary (RWF)','Narration','Status','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left first:rounded-l last:rounded-r">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.entries?.map((entry: any) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  finalized={run.finalized}
                  onUpdate={data => updateEntry.mutate({ entryId: entry.id, data })}
                  onPayslip={() => handlePayslip(entry.employeeId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EntryRow({ entry, finalized, onUpdate, onPayslip }: any) {
  const [editing, setEditing] = useState(false);
  const [gross, setGross] = useState(String(entry.gross_salary));

  function save() {
    onUpdate({ gross_salary: Number(gross) });
    setEditing(false);
  }

  return (
    <tr className="border-b border-border hover:bg-background">
      <td className="px-3 py-3 font-medium">{entry.employee?.full_name}</td>
      <td className="px-3 py-3 text-xs">{entry.employee?.bank_name || '-'}</td>
      <td className="px-3 py-3 font-mono text-xs">{entry.employee?.bank_account_number || '-'}</td>
      <td className="px-3 py-3">
        {editing && !finalized ? (
          <div className="flex gap-1">
            <input type="number" className="input w-28 py-1 text-xs" value={gross} onChange={e => setGross(e.target.value)} />
            <button onClick={save} className="btn-primary text-xs px-2 py-1">Save</button>
            <button onClick={() => setEditing(false)} className="btn-outline text-xs px-2 py-1">×</button>
          </div>
        ) : (
          <span className="cursor-pointer hover:text-primary" onDoubleClick={() => !finalized && setEditing(true)} title={!finalized ? 'Double-click to edit' : ''}>
            {Number(gross).toLocaleString()}
          </span>
        )}
      </td>
      <td className="px-3 py-3">{Number(gross).toLocaleString()}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground">{entry.narration}</td>
      <td className="px-3 py-3">
        <select
          className="text-xs border border-border rounded px-1 py-0.5"
          value={entry.payment_status}
          onChange={e => onUpdate({ payment_status: e.target.value, payment_date: e.target.value === 'PAID' ? new Date().toISOString() : null })}
          disabled={finalized && entry.payment_status === 'PAID'}
        >
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <button onClick={onPayslip} className="flex items-center gap-1 text-primary hover:underline text-xs">
          <FileText size={12} /> Payslip
        </button>
      </td>
    </tr>
  );
}
