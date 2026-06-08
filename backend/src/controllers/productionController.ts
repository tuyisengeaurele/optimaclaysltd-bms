import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound } from '../utils/response';

const prisma = new PrismaClient();

export async function listBatches(req: Request, res: Response) {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.date = { ...where.date, gte: new Date(from as string) };
  if (to) where.date = { ...where.date, lte: new Date(to as string) };
  const batches = await prisma.productionBatch.findMany({ where, orderBy: { date: 'desc' } });
  return ok(res, batches);
}

export async function createBatch(req: Request, res: Response) {
  const batch = await prisma.productionBatch.create({ data: req.body });
  return created(res, batch);
}

export async function updateBatch(req: Request, res: Response) {
  const batch = await prisma.productionBatch.findUnique({ where: { id: req.params.id } });
  if (!batch) return notFound(res, 'Production batch not found');
  const updated = await prisma.productionBatch.update({ where: { id: req.params.id }, data: req.body });
  return ok(res, updated);
}

export async function getStats(req: Request, res: Response) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const batches = await prisma.productionBatch.findMany({
    where: { date: { gte: thirtyDaysAgo } },
    orderBy: { date: 'asc' },
  });

  // Group by date
  const byDate: Record<string, { produced: number; rejected: number }> = {};
  for (const b of batches) {
    const d = b.date.toISOString().slice(0, 10);
    if (!byDate[d]) byDate[d] = { produced: 0, rejected: 0 };
    byDate[d].produced += b.bricks_produced;
    byDate[d].rejected += b.bricks_rejected;
  }

  const daily = Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
  const totalProduced = batches.reduce((s, b) => s + b.bricks_produced, 0);
  const totalRejected = batches.reduce((s, b) => s + b.bricks_rejected, 0);

  return ok(res, { daily, totalProduced, totalRejected, rejectionRate: totalProduced ? (totalRejected / totalProduced * 100).toFixed(2) : 0 });
}
