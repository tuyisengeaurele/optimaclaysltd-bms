import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listBatches(req: Request, res: Response) {
  const { from, to, page = '1', limit = '50' } = req.query;
  const where: any = { deletedAt: null };
  if (from) where.date = { ...where.date, gte: new Date(from as string) };
  if (to) where.date = { ...where.date, lte: new Date(to as string) };
  const skip = (Number(page) - 1) * Number(limit);
  const [batches, total] = await Promise.all([
    prisma.productionBatch.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: Number(limit),
      include: { kiln: true },
    }),
    prisma.productionBatch.count({ where }),
  ]);
  return ok(res, { batches, total, page: Number(page), limit: Number(limit) });
}

export async function createBatch(req: Request, res: Response) {
  const { date, shift, kiln_number, kilnId, bricks_target, bricks_produced, bricks_rejected, rejection_reason, defect_types, reject_disposition, current_stage } = req.body;
  if (!date || bricks_produced == null) return badRequest(res, 'date and bricks_produced are required');
  if (bricks_produced < 0 || (bricks_rejected ?? 0) < 0) return badRequest(res, 'Brick counts cannot be negative');
  if ((bricks_rejected ?? 0) > bricks_produced) return badRequest(res, 'Rejected cannot exceed produced');
  const batch = await prisma.productionBatch.create({
    data: {
      date: new Date(date),
      shift,
      kiln_number: kiln_number || '',
      kilnId: kilnId || null,
      bricks_target: bricks_target ?? 0,
      bricks_produced,
      bricks_rejected: bricks_rejected ?? 0,
      rejection_reason: rejection_reason || null,
      defect_types: Array.isArray(defect_types) ? defect_types : [],
      reject_disposition: reject_disposition || null,
      current_stage,
    },
    include: { kiln: true },
  });
  return created(res, batch);
}

export async function updateBatch(req: Request, res: Response) {
  const batch = await prisma.productionBatch.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!batch) return notFound(res, 'Production batch not found');
  const { date, shift, kiln_number, kilnId, bricks_target, bricks_produced, bricks_rejected, rejection_reason, defect_types, reject_disposition, current_stage } = req.body;
  const updated = await prisma.productionBatch.update({
    where: { id: req.params.id },
    data: {
      date: date ? new Date(date) : undefined,
      shift,
      kiln_number: kiln_number || undefined,
      kilnId: kilnId !== undefined ? (kilnId || null) : undefined,
      bricks_target,
      bricks_produced,
      bricks_rejected,
      rejection_reason: rejection_reason !== undefined ? (rejection_reason || null) : undefined,
      defect_types: Array.isArray(defect_types) ? defect_types : undefined,
      reject_disposition: reject_disposition !== undefined ? (reject_disposition || null) : undefined,
      current_stage,
    },
    include: { kiln: true },
  });
  return ok(res, updated);
}

export async function deleteBatch(req: Request, res: Response) {
  const batch = await prisma.productionBatch.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!batch) return notFound(res, 'Production batch not found');
  await prisma.productionBatch.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { deleted: true });
}

export async function getStats(req: Request, res: Response) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const batches = await prisma.productionBatch.findMany({
    where: { date: { gte: thirtyDaysAgo }, deletedAt: null },
    orderBy: { date: 'asc' },
  });

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

  const defectBreakdown: Record<string, number> = {};
  for (const b of batches) {
    for (const d of b.defect_types) {
      defectBreakdown[d] = (defectBreakdown[d] || 0) + 1;
    }
  }

  return ok(res, {
    daily,
    totalProduced,
    totalRejected,
    rejectionRate: totalProduced ? (totalRejected / totalProduced * 100).toFixed(2) : 0,
    defectBreakdown,
  });
}
