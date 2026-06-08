import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound, badRequest } from '../utils/response';

const prisma = new PrismaClient();

export async function listEmployees(req: Request, res: Response) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { full_name: 'asc' },
  });
  return ok(res, employees);
}

export async function createEmployee(req: Request, res: Response) {
  const data = req.body;
  const employee = await prisma.employee.create({ data });
  return created(res, employee);
}

export async function getEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!employee) return notFound(res, 'Employee not found');
  return ok(res, employee);
}

export async function updateEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!employee) return notFound(res, 'Employee not found');
  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: req.body,
  });
  return ok(res, updated);
}

export async function deleteEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!employee) return notFound(res, 'Employee not found');
  await prisma.employee.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), is_active: false },
  });
  return ok(res, null, 'Employee deleted');
}
