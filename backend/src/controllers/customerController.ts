import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound, badRequest } from '../utils/response';

const prisma = new PrismaClient();

export async function listCustomers(req: Request, res: Response) {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, customers);
}

export async function createCustomer(req: Request, res: Response) {
  const { customer_type, tin_number } = req.body;
  if (customer_type === 'COMPANY' && !tin_number) {
    return badRequest(res, 'TIN number is required for company customers');
  }
  const customer = await prisma.customer.create({ data: req.body });
  return created(res, customer);
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { orders: true },
  });
  if (!customer) return notFound(res, 'Customer not found');
  return ok(res, customer);
}

export async function updateCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!customer) return notFound(res, 'Customer not found');
  const updated = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
  return ok(res, updated);
}

export async function deleteCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!customer) return notFound(res, 'Customer not found');
  await prisma.customer.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, null, 'Customer deleted');
}
