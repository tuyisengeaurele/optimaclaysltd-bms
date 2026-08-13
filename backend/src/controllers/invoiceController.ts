import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

function computeIsOverdue(invoice: { due_date: Date | null; total: number }, paid: number): boolean {
  if (!invoice.due_date) return false;
  return new Date() > invoice.due_date && paid < invoice.total;
}

export async function listInvoices(req: Request, res: Response) {
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, order: { deletedAt: null } },
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

  const year = new Date().getFullYear();
  // Serializable so the duplicate-invoice check and the create can't both pass
  // for two requests racing on the same order, and so count + create for the
  // invoice number stay atomic under concurrent requests.
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findFirst({ where: { orderId, deletedAt: null } });
      if (existingInvoice) throw new Error(`DUPLICATE_INVOICE:${existingInvoice.number}`);

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
    }, { isolationLevel: 'Serializable' });

    return created(res, invoice);
  } catch (err: any) {
    if (typeof err.message === 'string' && err.message.startsWith('DUPLICATE_INVOICE:')) {
      return badRequest(res, `This order was already invoiced as ${err.message.split(':')[1]}`);
    }
    if (err.code === 'P2034') {
      return badRequest(res, 'This order is being invoiced by another request, please try again');
    }
    throw err;
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!invoice) return notFound(res, 'Invoice not found');
  await prisma.invoice.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { message: 'Invoice deleted' });
}

export async function getInvoice(req: Request, res: Response) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { items: true, order: { include: { customer: true } }, payments: true },
  });
  if (!invoice) return notFound(res, 'Invoice not found');
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const is_overdue = computeIsOverdue(invoice, paid);
  return ok(res, { ...invoice, paid, balance: invoice.total - paid, is_overdue });
}
