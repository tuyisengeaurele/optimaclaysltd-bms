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

// A batch only records what it is targeting for output when it starts. What actually
// came out of the kiln is only known once firing and quality check are done, so
// bricks_produced/bricks_rejected/defects are captured later through completeBatch.
export async function createBatch(req: Request, res: Response) {
  const { date, shift, kiln_number, kilnId, brick_type, custom_name, bricks_target, current_stage } = req.body;
  if (!date) return badRequest(res, 'date is required');
  if (!shift) return badRequest(res, 'shift is required');
  if (!bricks_target || Number(bricks_target) <= 0) return badRequest(res, 'bricks_target must be a positive number');
  if (current_stage === 'STOCKPILED') return badRequest(res, 'A new batch cannot start already stockpiled, complete it instead');

  const batch = await prisma.productionBatch.create({
    data: {
      date: new Date(date),
      shift,
      kiln_number: kiln_number || '',
      kilnId: kilnId || null,
      brick_type: brick_type || 'BRICK_10',
      custom_name: custom_name || null,
      bricks_target: Number(bricks_target),
      current_stage: current_stage || 'RAW_MIXING',
    },
    include: { kiln: true },
  });
  return created(res, batch);
}

// Updates the batch while it is still in progress: date, shift, kiln, target and stage
// (short of completion). Produced/rejected counts are not editable here, only through
// completeBatch, so a batch's recorded output always comes from one place.
export async function updateBatch(req: Request, res: Response) {
  const batch = await prisma.productionBatch.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!batch) return notFound(res, 'Production batch not found');
  if (batch.completed_at) return badRequest(res, 'Completed batches cannot be edited');

  const { date, shift, kiln_number, kilnId, brick_type, custom_name, bricks_target, current_stage } = req.body;
  if (current_stage === 'STOCKPILED') return badRequest(res, 'Use the complete action to move a batch to stockpiled');

  const updated = await prisma.productionBatch.update({
    where: { id: req.params.id },
    data: {
      date: date ? new Date(date) : undefined,
      shift,
      kiln_number: kiln_number || undefined,
      kilnId: kilnId !== undefined ? (kilnId || null) : undefined,
      brick_type,
      custom_name: custom_name !== undefined ? (custom_name || null) : undefined,
      bricks_target,
      current_stage,
    },
    include: { kiln: true },
  });
  return ok(res, updated);
}

// Marks a batch complete: records what actually came out of the kiln and moves the
// good output (and any downgraded rejects) into finished goods stock in one transaction,
// so completed production always shows up as sellable inventory automatically.
export async function completeBatch(req: Request, res: Response) {
  const batch = await prisma.productionBatch.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!batch) return notFound(res, 'Production batch not found');
  if (batch.completed_at) return badRequest(res, 'Batch is already completed');

  const { bricks_produced, bricks_rejected, rejection_reason, defect_types, reject_disposition } = req.body;
  const produced = Number(bricks_produced);
  const rejected = Number(bricks_rejected ?? 0);
  if (bricks_produced == null || isNaN(produced) || produced < 0) return badRequest(res, 'bricks_produced must be a non-negative number');
  if (isNaN(rejected) || rejected < 0) return badRequest(res, 'bricks_rejected must be a non-negative number');
  if (rejected > produced) return badRequest(res, 'Rejected cannot exceed produced');

  const goodQty = produced - rejected;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.productionBatch.update({
      where: { id: req.params.id },
      data: {
        bricks_produced: produced,
        bricks_rejected: rejected,
        rejection_reason: rejection_reason || null,
        defect_types: Array.isArray(defect_types) ? defect_types : [],
        reject_disposition: rejected > 0 ? (reject_disposition || null) : null,
        current_stage: 'STOCKPILED',
        completed_at: new Date(),
      },
      include: { kiln: true },
    });

    if (goodQty > 0) {
      await tx.finishedGoodsStock.create({
        data: {
          brick_type: result.brick_type,
          custom_name: result.custom_name,
          quality_grade: 'GRADE_A',
          quantity: goodQty,
          source: 'PRODUCTION',
          notes: `From batch ${result.id.slice(0, 8).toUpperCase()}`,
        },
      });
    }

    if (rejected > 0 && reject_disposition === 'DOWNGRADE_TO_B') {
      await tx.finishedGoodsStock.create({
        data: {
          brick_type: result.brick_type,
          custom_name: result.custom_name,
          quality_grade: 'GRADE_B',
          quantity: rejected,
          source: 'PRODUCTION',
          notes: `Downgraded rejects from batch ${result.id.slice(0, 8).toUpperCase()}`,
        },
      });
    }

    return result;
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
