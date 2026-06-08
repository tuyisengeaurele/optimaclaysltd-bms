import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound } from '../utils/response';



export async function listOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: { customer: true },
    orderBy: { order_date: 'desc' },
  });
  return ok(res, orders);
}

export async function createOrder(req: Request, res: Response) {
  const { quantity, unit_price, ...rest } = req.body;
  const total_amount = quantity * unit_price;
  const order = await prisma.order.create({
    data: { ...rest, quantity, unit_price, total_amount },
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
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!order) return notFound(res, 'Order not found');
  const { status, notes } = req.body;
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status, ...(notes !== undefined ? { notes } : {}) },
    include: { customer: true },
  });
  return ok(res, updated);
}
