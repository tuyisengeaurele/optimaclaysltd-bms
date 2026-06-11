import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: { customer: true },
    orderBy: { order_date: 'desc' },
  });
  return ok(res, orders);
}

export async function createOrder(req: Request, res: Response) {
  const { customerId, brick_type, quantity, unit_price, quality_grade, notes, order_date } = req.body;

  if (!customerId) return badRequest(res, 'customerId is required');
  if (!brick_type) return badRequest(res, 'brick_type is required');
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) return badRequest(res, 'quantity must be a positive number');
  if (!unit_price || isNaN(Number(unit_price)) || Number(unit_price) <= 0) return badRequest(res, 'unit_price must be a positive number');

  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) return notFound(res, 'Customer not found');

  const qty = Number(quantity);
  const price = Number(unit_price);

  const order = await prisma.order.create({
    data: {
      customerId,
      brick_type,
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
      quality_grade: quality_grade || 'GRADE_A',
      notes: notes || null,
      order_date: order_date ? new Date(order_date) : new Date(),
    },
    include: { customer: true },
  });
  return created(res, order);
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { customer: true, invoices: true, deliveries: true },
  });
  if (!order) return notFound(res, 'Order not found');
  return ok(res, order);
}

export async function deleteOrder(req: Request, res: Response) {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!order) return notFound(res, 'Order not found');
  await prisma.order.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { message: 'Order deleted' });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!order) return notFound(res, 'Order not found');

  const { status, notes } = req.body;
  if (!status) return badRequest(res, 'status is required');

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status, ...(notes !== undefined ? { notes } : {}) },
    include: { customer: true },
  });
  return ok(res, updated);
}
