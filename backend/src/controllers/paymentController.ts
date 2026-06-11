import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listPayments(req: Request, res: Response) {
  const { invoiceId } = req.query;
  const payments = await prisma.payment.findMany({
    where: invoiceId ? { invoiceId: invoiceId as string } : {},
    orderBy: { date: 'desc' },
  });
  return ok(res, payments);
}

export async function createPayment(req: Request, res: Response) {
  const { invoiceId, amount, date, method, reference, notes } = req.body;

  if (!invoiceId) return badRequest(res, 'invoiceId is required');
  if (!method) return badRequest(res, 'method is required');
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return badRequest(res, 'amount must be a positive number');
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return notFound(res, 'Invoice not found');

  const alreadyPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const balance = invoice.total - alreadyPaid;

  if (Number(amount) > balance + 0.01) {
    return badRequest(res, `Payment of ${Number(amount).toLocaleString()} exceeds the outstanding balance of ${balance.toLocaleString()} RWF`);
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      method,
      reference: reference || null,
      notes: notes || null,
    },
  });

  const newTotalPaid = alreadyPaid + Number(amount);
  const isOverdue = invoice.due_date
    ? new Date() > invoice.due_date && newTotalPaid < invoice.total
    : false;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { is_overdue: isOverdue } });

  return created(res, payment);
}
