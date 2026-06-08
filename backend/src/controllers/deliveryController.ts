import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound } from '../utils/response';



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
  const { delivery_fee, ...deliveryData } = req.body;
  const delivery = await prisma.delivery.create({
    data: {
      ...deliveryData,
      scheduled_date: deliveryData.scheduled_date ? new Date(deliveryData.scheduled_date) : undefined,
      costs: {
        // Store delivery_fee as driver_fee; fuel_cost and hired_truck_cost are zeroed out
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
