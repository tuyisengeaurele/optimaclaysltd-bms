import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listEmployees(req: Request, res: Response) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { full_name: 'asc' },
  });
  return ok(res, employees);
}

export async function createEmployee(req: Request, res: Response) {
  const {
    full_name, national_id, job_title,
    bank_name, bank_account_number,
    wage_type, base_salary,
    hire_date, phone,
  } = req.body;

  if (!full_name) return badRequest(res, 'full_name is required');
  if (!national_id) return badRequest(res, 'national_id is required');
  if (!wage_type) return badRequest(res, 'wage_type is required');

  const employee = await prisma.employee.create({
    data: {
      full_name,
      national_id,
      job_title: job_title || null,
      bank_name: bank_name || null,
      bank_account_number: bank_account_number || null,
      wage_type,
      base_salary: base_salary ? Number(base_salary) : 0,
      hire_date: hire_date ? new Date(hire_date) : null,
      phone: phone || null,
      is_active: true,
    },
  });
  return created(res, employee);
}

export async function getEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!employee) return notFound(res, 'Employee not found');
  return ok(res, employee);
}

export async function updateEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!employee) return notFound(res, 'Employee not found');

  const {
    full_name, job_title,
    bank_name, bank_account_number,
    wage_type, base_salary,
    hire_date, phone, is_active,
  } = req.body;

  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      full_name: full_name ?? employee.full_name,
      job_title: job_title !== undefined ? job_title : employee.job_title,
      bank_name: bank_name !== undefined ? bank_name : employee.bank_name,
      bank_account_number: bank_account_number !== undefined ? bank_account_number : employee.bank_account_number,
      wage_type: wage_type ?? employee.wage_type,
      base_salary: base_salary !== undefined ? Number(base_salary) : employee.base_salary,
      hire_date: hire_date ? new Date(hire_date) : employee.hire_date,
      phone: phone !== undefined ? phone : employee.phone,
      is_active: is_active !== undefined ? is_active : employee.is_active,
    },
  });
  return ok(res, updated);
}

export async function deleteEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!employee) return notFound(res, 'Employee not found');
  await prisma.employee.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), is_active: false },
  });
  return ok(res, null, 'Employee deleted');
}
