import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listReconciliations(req: Request, res: Response) {
  const reconciliations = await prisma.stockReconciliation.findMany({
    orderBy: { date: 'desc' },
    include: { items: true },
    take: 50,
  });
  return ok(res, reconciliations);
}

export async function getReconciliation(req: Request, res: Response) {
  const rec = await prisma.stockReconciliation.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!rec) return notFound(res, 'Reconciliation not found');
  return ok(res, rec);
}

export async function createReconciliation(req: Request, res: Response) {
  const { notes, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return badRequest(res, 'At least one item is required');
  const user = (req as any).user;

  const rec = await prisma.stockReconciliation.create({
    data: {
      // the JWT payload only carries id/email/role, not full_name
      reconciled_by: user?.full_name || user?.email || 'Unknown',
      notes: notes || null,
      items: {
        create: items.map((item: any) => ({
          item_type: item.item_type,
          material_type: item.material_type || null,
          brick_type: item.brick_type || null,
          quality_grade: item.quality_grade || null,
          system_quantity: Number(item.system_quantity),
          physical_quantity: Number(item.physical_quantity),
          variance: Number(item.physical_quantity) - Number(item.system_quantity),
          notes: item.notes || null,
        })),
      },
    },
    include: { items: true },
  });
  return created(res, rec);
}
