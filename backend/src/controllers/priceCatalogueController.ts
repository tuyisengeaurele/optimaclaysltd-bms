import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, notFound, badRequest } from '../utils/response';

export async function listPrices(req: Request, res: Response) {
  const prices = await prisma.priceCatalogue.findMany({ orderBy: { brick_type: 'asc' } });
  return ok(res, prices);
}

export async function upsertPrice(req: Request, res: Response) {
  const { brick_type, unit_price, is_active } = req.body;
  if (!brick_type) return badRequest(res, 'brick_type is required');
  if (unit_price == null || isNaN(Number(unit_price)) || Number(unit_price) < 0) {
    return badRequest(res, 'unit_price must be a non-negative number');
  }
  const price = await prisma.priceCatalogue.upsert({
    where: { brick_type },
    update: { unit_price: Number(unit_price), is_active: is_active !== undefined ? Boolean(is_active) : undefined },
    create: { brick_type, unit_price: Number(unit_price), is_active: is_active !== false },
  });
  return ok(res, price);
}

export async function deletePrice(req: Request, res: Response) {
  const price = await prisma.priceCatalogue.findUnique({ where: { id: req.params.id } });
  if (!price) return notFound(res, 'Price entry not found');
  await prisma.priceCatalogue.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
}
