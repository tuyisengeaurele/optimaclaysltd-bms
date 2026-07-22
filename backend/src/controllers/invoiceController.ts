import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

function computeIsOverdue(invoice: { due_date: Date | null; total: number }, paid: number): boolean {
  if (!invoice.due_date) return false;
  return new Date() > invoice.due_date && paid < invoice.total;
}

export async function listInvoices(req: Request, res: Response) {
  const invoices = await prisma.invoice.findMany({
    include: { order: { include: { customer: true } }, items: true, payments: true },
    orderBy: { date: 'desc' },
  });
  const result = invoices.map(inv => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    const balance = inv.total - paid;
    // Always compute is_overdue dynamically — don't rely on the stored flag
    const is_overdue = computeIsOverdue(inv, paid);
    return { ...inv, paid, balance, is_overdue };
  });
  return ok(res, result);
}

export async function createInvoice(req: Request, res: Response) {
  const { orderId, due_date } = req.body;
  if (!orderId) return badRequest(res, 'orderId is required');

  const order = await prisma.order.findFirst({
    where: { id: orderId, deletedAt: null },
    include: { customer: true },
  });
  if (!order) return notFound(res, 'Order not found');

  const existingInvoice = await prisma.invoice.findFirst({ where: { orderId } });
  if (existingInvoice) return badRequest(res, `This order was already invoiced as ${existingInvoice.number}`);

  const year = new Date().getFullYear();
  // Use a transaction so count + create are atomic — prevents duplicate numbers under concurrent requests
  const invoice = await prisma.$transaction(async (tx) => {
    const count = await tx.invoice.count({ where: { number: { startsWith: `OCL-${year}-` } } });
    const number = `OCL-${year}-${String(count + 1).padStart(3, '0')}`;
    return tx.invoice.create({
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
  });

  return created(res, invoice);
}

export async function deleteInvoice(req: Request, res: Response) {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return notFound(res, 'Invoice not found');
  await prisma.payment.deleteMany({ where: { invoiceId: req.params.id } });
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
  await prisma.invoice.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'Invoice deleted' });
}

export async function getInvoice(req: Request, res: Response) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, order: { include: { customer: true } }, payments: true },
  });
  if (!invoice) return notFound(res, 'Invoice not found');
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const is_overdue = computeIsOverdue(invoice, paid);
  return ok(res, { ...invoice, paid, balance: invoice.total - paid, is_overdue });
}
