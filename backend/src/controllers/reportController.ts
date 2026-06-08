import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../utils/response';



function dateRange(req: any) {
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(req.query.to) : new Date();
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

  const payments = await prisma.payment.findMany({
    where: { date: { gte: from, lte: to } },
  });
  const income = payments.reduce((s, p) => s + p.amount, 0);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
  });
  const manualExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const rawMaterials = await prisma.rawMaterialStock.findMany({
    where: { date: { gte: from, lte: to } },
  });
  const rawMaterialCost = rawMaterials.reduce((s, r) => s + r.total_cost, 0);

  const payrollEntries = await prisma.payrollEntry.findMany({
    where: { payment_status: 'PAID', payment_date: { gte: from, lte: to } },
  });
  const payrollCost = payrollEntries.reduce((s, e) => s + e.net_salary, 0);

  const deliveryCosts = await prisma.deliveryCost.findMany({
    include: { delivery: true },
  });
  const filteredDeliveryCost = deliveryCosts
    .filter(dc => dc.createdAt >= from && dc.createdAt <= to)
    .reduce((s, dc) => s + dc.fuel_cost + dc.driver_fee + dc.hired_truck_cost, 0);

  const totalExpenses = manualExpenses + rawMaterialCost + payrollCost + filteredDeliveryCost;
  const profit = income - totalExpenses;

  return ok(res, {
    income,
    expenses: {
      total: totalExpenses,
      manual: manualExpenses,
      rawMaterials: rawMaterialCost,
      payroll: payrollCost,
      delivery: filteredDeliveryCost,
    },
    profit,
    expenseBreakdown: expenses,
  });
}
