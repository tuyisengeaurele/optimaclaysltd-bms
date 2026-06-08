import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound } from '../utils/response';

const prisma = new PrismaClient();

export async function listAttendance(req: Request, res: Response) {
  const { employeeId, month, year } = req.query;
  const where: any = {};
  if (employeeId) where.employeeId = employeeId as string;
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    where.date = { gte: start, lt: end };
  }
  const logs = await prisma.attendanceLog.findMany({
    where,
    include: { employee: true },
    orderBy: { date: 'desc' },
  });
  return ok(res, logs);
}

export async function createAttendance(req: Request, res: Response) {
  const { employeeId, date, status, notes } = req.body;
  const log = await prisma.attendanceLog.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { status, notes },
    create: { employeeId, date: new Date(date), status, notes },
    include: { employee: true },
  });
  return created(res, log);
}

export async function updateAttendance(req: Request, res: Response) {
  const log = await prisma.attendanceLog.findUnique({ where: { id: req.params.id } });
  if (!log) return notFound(res, 'Attendance log not found');
  const updated = await prisma.attendanceLog.update({
    where: { id: req.params.id },
    data: req.body,
    include: { employee: true },
  });
  return ok(res, updated);
}

export async function getMonthlySummary(req: Request, res: Response) {
  const { employeeId, month, year } = req.query;
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 1);

  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: employeeId as string, date: { gte: start, lt: end } },
  });

  const summary = {
    total: logs.length,
    present: logs.filter(l => l.status === 'PRESENT').length,
    absent: logs.filter(l => l.status === 'ABSENT').length,
    halfDay: logs.filter(l => l.status === 'HALF_DAY').length,
    leave: logs.filter(l => l.status === 'LEAVE').length,
  };
  return ok(res, summary);
}
