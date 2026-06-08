import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound } from '../utils/response';

const prisma = new PrismaClient();

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

export async function updateOrderStatus(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!order) return notFound(res, 'Order not found');
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: req.body.status, ...req.body },
    include: { customer: true },
  });
  return ok(res, updated);
}
