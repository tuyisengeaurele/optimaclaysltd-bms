import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../utils/response';

export async function listAuditLogs(req: Request, res: Response) {
  const { resource, user_id, from, to, page = '1', limit = '50' } = req.query;
  const where: any = {};
  if (resource) where.resource = resource;
  if (user_id) where.user_id = user_id;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string);
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
    prisma.auditLog.count({ where }),
  ]);
  return ok(res, { logs, total, page: Number(page), limit: Number(limit) });
}
