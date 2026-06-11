import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';



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
  // Bulk: { entries: [{ employeeId, date, status, notes }] }
  if (Array.isArray(req.body.entries)) {
    const results = await Promise.all(req.body.entries.map((entry: any) =>
      prisma.attendanceLog.upsert({
        where: { employeeId_date: { employeeId: entry.employeeId, date: new Date(entry.date) } },
        update: { status: entry.status, notes: entry.notes },
        create: { employeeId: entry.employeeId, date: new Date(entry.date), status: entry.status, notes: entry.notes },
      })
    ));
    return created(res, results);
  }
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
  const { status, notes } = req.body;
  const updated = await prisma.attendanceLog.update({
    where: { id: req.params.id },
    data: { status, notes },
    include: { employee: true },
  });
  return ok(res, updated);
}

export async function getMonthlySummary(req: Request, res: Response) {
  const { employeeId, month, year } = req.query;
  if (!employeeId || !month || !year) return badRequest(res, 'employeeId, month, and year are required');
  const m = Number(month);
  const y = Number(year);
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) return badRequest(res, 'Invalid month or year');
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

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
