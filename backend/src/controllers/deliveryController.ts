import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listDeliveries(req: Request, res: Response) {
  const { status, from, to } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (from) where.scheduled_date = { ...where.scheduled_date, gte: new Date(from as string) };
  if (to) where.scheduled_date = { ...where.scheduled_date, lte: new Date(to as string) };

  const deliveries = await prisma.delivery.findMany({
    where,
    include: { order: { include: { customer: true } }, costs: true },
    orderBy: { scheduled_date: 'desc' },
  });
  return ok(res, deliveries);
}

export async function createDelivery(req: Request, res: Response) {
  const { delivery_fee, orderId, vehicle_plate, driver_name, scheduled_date, quantity_loaded, notes } = req.body;
  if (!orderId) return badRequest(res, 'orderId is required');

  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) return notFound(res, 'Order not found');

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      vehicle_plate: vehicle_plate || null,
      driver_name: driver_name || null,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : undefined,
      quantity_loaded: quantity_loaded ? Number(quantity_loaded) : 0,
      notes: notes || null,
      costs: {
        create: { fuel_cost: 0, driver_fee: Number(delivery_fee) || 0, hired_truck_cost: 0 },
      },
    },
    include: { order: { include: { customer: true } }, costs: true },
  });
  return created(res, delivery);
}

export async function deleteDelivery(req: Request, res: Response) {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
  if (!delivery) return notFound(res, 'Delivery not found');
  await prisma.deliveryCost.deleteMany({ where: { deliveryId: req.params.id } });
  await prisma.delivery.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'Delivery deleted' });
}

export async function updateDeliveryStatus(req: Request, res: Response) {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
  if (!delivery) return notFound(res, 'Delivery not found');
  const updated = await prisma.delivery.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      actual_delivery_date: req.body.actual_delivery_date ? new Date(req.body.actual_delivery_date) : undefined,
      notes: req.body.notes,
    },
    include: { order: { include: { customer: true } }, costs: true },
  });
  return ok(res, updated);
}
