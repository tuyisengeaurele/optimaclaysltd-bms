import { Request, Response } from 'express';
import { Employee } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

// MONTHLY staff are paid a flat base_salary regardless of daily attendance, so their
// wage_earned is left unused. PIECE_RATE depends on actual output for that day, which
// nobody can guess, so it always starts at 0 for manual entry. DAILY workers are the
// only ones with a sensible default: base_salary as the day rate, halved for a half
// day, zero for absence, all still editable afterward.
function defaultWage(employee: Pick<Employee, 'wage_type' | 'base_salary'>, status: string): number {
  if (employee.wage_type !== 'DAILY') return 0;
  switch (status) {
    case 'PRESENT': return employee.base_salary || 0;
    case 'HALF_DAY': return (employee.base_salary || 0) / 2;
    default: return 0;
  }
}

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
  // Bulk: { entries: [{ employeeId, date, status, notes, wage_earned? }] }
  if (Array.isArray(req.body.entries)) {
    const employeeIds = req.body.entries.map((e: any) => e.employeeId);
    const employees = await prisma.employee.findMany({ where: { id: { in: employeeIds } } });
    const employeeById = new Map(employees.map(e => [e.id, e]));

    const results = await Promise.all(req.body.entries.map((entry: any) => {
      const employee = employeeById.get(entry.employeeId);
      const wage = entry.wage_earned != null ? Number(entry.wage_earned) : (employee ? defaultWage(employee, entry.status) : 0);
      return prisma.attendanceLog.upsert({
        where: { employeeId_date: { employeeId: entry.employeeId, date: new Date(entry.date) } },
        update: { status: entry.status, notes: entry.notes, wage_earned: wage },
        create: { employeeId: entry.employeeId, date: new Date(entry.date), status: entry.status, notes: entry.notes, wage_earned: wage },
      });
    }));
    return created(res, results);
  }
  const { employeeId, date, status, notes, wage_earned } = req.body;
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return notFound(res, 'Employee not found');
  const wage = wage_earned != null ? Number(wage_earned) : defaultWage(employee, status);

  const log = await prisma.attendanceLog.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { status, notes, wage_earned: wage },
    create: { employeeId, date: new Date(date), status, notes, wage_earned: wage },
    include: { employee: true },
  });
  return created(res, log);
}

export async function updateAttendance(req: Request, res: Response) {
  const log = await prisma.attendanceLog.findUnique({ where: { id: req.params.id }, include: { employee: true } });
  if (!log) return notFound(res, 'Attendance log not found');
  const { status, notes, wage_earned } = req.body;
  const resolvedStatus = status ?? log.status;
  const wage = wage_earned != null ? Number(wage_earned) : (status ? defaultWage(log.employee, resolvedStatus) : log.wage_earned);

  const updated = await prisma.attendanceLog.update({
    where: { id: req.params.id },
    data: { status, notes, wage_earned: wage },
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
