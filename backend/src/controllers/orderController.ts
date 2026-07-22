import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';
import { getAvailableStock } from './inventoryController';

export async function listOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: { customer: true, invoices: { select: { id: true } } },
    orderBy: { order_date: 'desc' },
  });
  return ok(res, orders);
}

export async function createOrder(req: Request, res: Response) {
  const { customerId, brick_type, quantity, unit_price, quality_grade, notes, order_date, custom_name } = req.body;

  if (!customerId) return badRequest(res, 'customerId is required');
  if (!brick_type) return badRequest(res, 'brick_type is required');
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) return badRequest(res, 'quantity must be a positive number');
  if (!unit_price || isNaN(Number(unit_price)) || Number(unit_price) <= 0) return badRequest(res, 'unit_price must be a positive number');

  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) return notFound(res, 'Customer not found');

  const qty = Number(quantity);
  const price = Number(unit_price);
  const total = qty * price;
  const grade = quality_grade || 'GRADE_A';

  if (brick_type !== 'CUSTOM') {
    const available = await getAvailableStock(brick_type, grade);
    if (available < qty) {
      return badRequest(res, `Not enough stock. Available: ${available.toLocaleString()}, requested: ${qty.toLocaleString()}`);
    }
  }

  if (customer.credit_limit > 0) {
    const outstanding = await getCustomerOutstanding(customerId);
    if (outstanding + total > customer.credit_limit) {
      return badRequest(res, `Order total exceeds customer credit limit. Outstanding: ${outstanding.toFixed(2)}, Limit: ${customer.credit_limit}`);
    }
  }

  const order = await prisma.order.create({
    data: {
      customerId,
      brick_type,
      custom_name: custom_name || null,
      quantity: qty,
      unit_price: price,
      total_amount: total,
      quality_grade: grade,
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
    include: { customer: true, invoices: { include: { payments: true } }, deliveries: true },
  });
  if (!order) return notFound(res, 'Order not found');
  return ok(res, order);
}

export async function updateOrder(req: Request, res: Response) {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!order) return notFound(res, 'Order not found');
  if (order.status !== 'PENDING') return badRequest(res, 'Only PENDING orders can be amended');

  const { quantity, unit_price, notes, required_delivery_date } = req.body;
  const qty = quantity != null ? Number(quantity) : order.quantity;
  const price = unit_price != null ? Number(unit_price) : order.unit_price;
  if (qty <= 0) return badRequest(res, 'quantity must be positive');
  if (price <= 0) return badRequest(res, 'unit_price must be positive');

  if (qty > order.quantity && order.brick_type !== 'CUSTOM') {
    const available = await getAvailableStock(order.brick_type, order.quality_grade);
    if (available < qty) {
      return badRequest(res, `Not enough stock. Available: ${available.toLocaleString()}, requested: ${qty.toLocaleString()}`);
    }
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
      notes: notes !== undefined ? (notes || null) : undefined,
      required_delivery_date: required_delivery_date ? new Date(required_delivery_date) : undefined,
    },
    include: { customer: true },
  });
  return ok(res, updated);
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

export async function getCustomerStatement(req: Request, res: Response) {
  const { customerId } = req.params;
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) return notFound(res, 'Customer not found');

  const orders = await prisma.order.findMany({
    where: { customerId, deletedAt: null },
    include: {
      invoices: { include: { payments: true, items: true } },
      deliveries: true,
    },
    orderBy: { order_date: 'desc' },
  });

  let totalOrdered = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;

  for (const o of orders) {
    totalOrdered += o.total_amount;
    for (const inv of o.invoices) {
      totalInvoiced += inv.total;
      for (const p of inv.payments) {
        totalPaid += p.amount;
      }
    }
  }

  return ok(res, {
    customer,
    orders,
    summary: {
      totalOrdered,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
      creditLimit: customer.credit_limit,
    },
  });
}

async function getCustomerOutstanding(customerId: string): Promise<number> {
  const invoices = await prisma.invoice.findMany({
    where: { order: { customerId, deletedAt: null } },
    include: { payments: true },
  });
  let outstanding = 0;
  for (const inv of invoices) {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    outstanding += Math.max(0, inv.total - paid);
  }
  return outstanding;
}
