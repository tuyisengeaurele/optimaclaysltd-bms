import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound } from '../utils/response';

const prisma = new PrismaClient();

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
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return notFound(res, 'Invoice not found');

  const payment = await prisma.payment.create({
    data: { invoiceId, amount, date: date ? new Date(date) : new Date(), method, reference, notes },
  });

  // Check overdue
  const allPayments = await prisma.payment.findMany({ where: { invoiceId } });
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  const isOverdue = invoice.due_date
    ? new Date() > invoice.due_date && totalPaid < invoice.total
    : false;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { is_overdue: isOverdue } });

  return created(res, payment);
}
