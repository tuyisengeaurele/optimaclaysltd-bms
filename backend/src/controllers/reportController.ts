import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../utils/response';

function dateRange(req: any) {
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  // A "to" of today's date alone parses as midnight, which would exclude every
  // record from today itself. Extend it to the end of that day so the range is
  // actually inclusive of the whole day the caller picked.
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export async function productionReport(req: Request, res: Response) {
  const { from, to } = dateRange(req);
  const batches = await prisma.productionBatch.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  });
  const totalProduced = batches.reduce((s, b) => s + b.bricks_produced, 0);
  const totalRejected = batches.reduce((s, b) => s + b.bricks_rejected, 0);
  const rejectionRate = totalProduced ? ((totalRejected / totalProduced) * 100).toFixed(2) : '0.00';
  return ok(res, { batches, totalProduced, totalRejected, rejectionRate });
}

export async function salesReport(req: Request, res: Response) {
  const { from, to } = dateRange(req);
  const orders = await prisma.order.findMany({
    where: { deletedAt: null, order_date: { gte: from, lte: to } },
    include: { customer: true },
    orderBy: { order_date: 'asc' },
  });
  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  return ok(res, { orders, totalRevenue });
}

export async function payrollReport(req: Request, res: Response) {
  const { month, year } = req.query;
  const where: any = {};
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);

  const runs = await prisma.payrollRun.findMany({
    where,
    include: { entries: { include: { employee: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return ok(res, runs);
}

export async function financialReport(req: Request, res: Response) {
  const { from, to } = dateRange(req);

  const payments = await prisma.payment.findMany({ where: { date: { gte: from, lte: to } } });
  const income = payments.reduce((s, p) => s + p.amount, 0);

  const expenses = await prisma.expense.findMany({ where: { date: { gte: from, lte: to } } });
  const manualExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const rawMaterials = await prisma.rawMaterialStock.findMany({ where: { date: { gte: from, lte: to } } });
  const rawMaterialCost = rawMaterials.reduce((s, r) => s + r.total_cost, 0);

  const payrollEntries = await prisma.payrollEntry.findMany({
    where: { payment_status: 'PAID', payment_date: { gte: from, lte: to } },
  });
  const payrollCost = payrollEntries.reduce((s, e) => s + e.net_salary, 0);

  const deliveryCosts = await prisma.deliveryCost.findMany({ include: { delivery: true } });
  const filteredDeliveryCost = deliveryCosts
    .filter(dc => dc.createdAt >= from && dc.createdAt <= to)
    .reduce((s, dc) => s + dc.fuel_cost + dc.driver_fee + dc.hired_truck_cost, 0);

  const totalExpenses = manualExpenses + rawMaterialCost + payrollCost + filteredDeliveryCost;

  return ok(res, {
    income,
    expenses: { total: totalExpenses, manual: manualExpenses, rawMaterials: rawMaterialCost, payroll: payrollCost, delivery: filteredDeliveryCost },
    profit: income - totalExpenses,
    expenseBreakdown: expenses,
  });
}

export async function exportInvoicesCSV(req: Request, res: Response) {
  const { from, to } = dateRange(req);
  const invoices = await prisma.invoice.findMany({
    where: { date: { gte: from, lte: to } },
    include: { order: { include: { customer: true } }, payments: true },
    orderBy: { date: 'asc' },
  });

  const rows = [
    ['Invoice #', 'Date', 'Due Date', 'Customer', 'Total', 'Paid', 'Balance', 'Overdue'].join(','),
    ...invoices.map(inv => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const customer = inv.order?.customer;
      const name = (customer?.company_name || customer?.full_name || '').replace(/,/g, ' ');
      return [
        inv.number,
        inv.date.toISOString().slice(0, 10),
        inv.due_date ? inv.due_date.toISOString().slice(0, 10) : '',
        name,
        inv.total.toFixed(2),
        paid.toFixed(2),
        (inv.total - paid).toFixed(2),
        inv.is_overdue ? 'Yes' : 'No',
      ].join(',');
    }),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="invoices_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`);
  return res.send(rows.join('\r\n'));
}

export async function exportExpensesCSV(req: Request, res: Response) {
  const { from, to } = dateRange(req);
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  });

  const rows = [
    ['Date', 'Category', 'Amount', 'Description'].join(','),
    ...expenses.map(e => [
      e.date.toISOString().slice(0, 10),
      e.category,
      e.amount.toFixed(2),
      (e.description || '').replace(/,/g, ' '),
    ].join(',')),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="expenses_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`);
  return res.send(rows.join('\r\n'));
}

export async function exportPaymentsCSV(req: Request, res: Response) {
  const { from, to } = dateRange(req);
  const payments = await prisma.payment.findMany({
    where: { date: { gte: from, lte: to } },
    include: { invoice: { include: { order: { include: { customer: true } } } } },
    orderBy: { date: 'asc' },
  });

  const rows = [
    ['Date', 'Invoice #', 'Customer', 'Amount', 'Method', 'Reference'].join(','),
    ...payments.map(p => {
      const customer = p.invoice?.order?.customer;
      const name = (customer?.company_name || customer?.full_name || '').replace(/,/g, ' ');
      return [
        p.date.toISOString().slice(0, 10),
        p.invoice?.number || '',
        name,
        p.amount.toFixed(2),
        p.method,
        p.reference || '',
      ].join(',');
    }),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="payments_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv"`);
  return res.send(rows.join('\r\n'));
}
