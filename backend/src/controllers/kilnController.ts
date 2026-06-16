import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listKilns(req: Request, res: Response) {
  const kilns = await prisma.kiln.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { batches: true } } },
  });
  return ok(res, kilns);
}

export async function createKiln(req: Request, res: Response) {
  const { name, capacity, status, last_service_date, notes } = req.body;
  if (!name?.trim()) return badRequest(res, 'name is required');
  const kiln = await prisma.kiln.create({
    data: {
      name: name.trim(),
      capacity: Number(capacity) || 0,
      status: status || 'ACTIVE',
      last_service_date: last_service_date ? new Date(last_service_date) : null,
      notes: notes || null,
    },
  });
  return created(res, kiln);
}

export async function updateKiln(req: Request, res: Response) {
  const kiln = await prisma.kiln.findUnique({ where: { id: req.params.id } });
  if (!kiln) return notFound(res, 'Kiln not found');
  const { name, capacity, status, last_service_date, notes } = req.body;
  const updated = await prisma.kiln.update({
    where: { id: req.params.id },
    data: {
      name: name?.trim() || undefined,
      capacity: capacity != null ? Number(capacity) : undefined,
      status: status || undefined,
      last_service_date: last_service_date ? new Date(last_service_date) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
    },
  });
  return ok(res, updated);
}

export async function deleteKiln(req: Request, res: Response) {
  const kiln = await prisma.kiln.findUnique({ where: { id: req.params.id } });
  if (!kiln) return notFound(res, 'Kiln not found');
  const batchCount = await prisma.productionBatch.count({ where: { kilnId: req.params.id } });
  if (batchCount > 0) return badRequest(res, 'Cannot delete kiln with existing production batches');
  await prisma.kiln.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
}
