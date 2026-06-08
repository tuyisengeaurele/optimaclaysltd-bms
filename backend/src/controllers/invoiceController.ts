import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound } from '../utils/response';

const prisma = new PrismaClient();

function getNextInvoiceNumber(year: number, count: number) {
  return `OCL-${year}-${String(count + 1).padStart(3, '0')}`;
}

export async function listInvoices(req: Request, res: Response) {
  const invoices = await prisma.invoice.findMany({
    include: { order: { include: { customer: true } }, items: true, payments: true },
    orderBy: { date: 'desc' },
  });
  const result = invoices.map(inv => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return { ...inv, paid, balance: inv.total - paid };
  });
  return ok(res, result);
}

export async function createInvoice(req: Request, res: Response) {
  const { orderId, due_date } = req.body;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (!order) return notFound(res, 'Order not found');

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { number: { startsWith: `OCL-${year}-` } } });
  const number = getNextInvoiceNumber(year, count);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      orderId,
      due_date: due_date ? new Date(due_date) : undefined,
      subtotal: order.total_amount,
      total: order.total_amount,
      items: {
        create: [{
          description: 'Bricks Supply',
          brick_type: order.brick_type,
          quality_grade: order.quality_grade,
          quantity: order.quantity,
          unit_price: order.unit_price,
          total: order.total_amount,
        }],
      },
    },
    include: { items: true, order: { include: { customer: true } } },
  });
  return created(res, invoice);
}

export async function getInvoice(req: Request, res: Response) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, order: { include: { customer: true } }, payments: true },
  });
  if (!invoice) return notFound(res, 'Invoice not found');
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  return ok(res, { ...invoice, paid, balance: invoice.total - paid });
}
