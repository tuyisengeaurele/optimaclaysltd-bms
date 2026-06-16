import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listCustomers(req: Request, res: Response) {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, customers);
}

export async function createCustomer(req: Request, res: Response) {
  const {
    customer_type, full_name, company_name, tin_number,
    phone, location, notes,
    contact_person_name, contact_person_phone, credit_limit,
  } = req.body;

  if (!customer_type) return badRequest(res, 'customer_type is required');
  if (customer_type === 'INDIVIDUAL' && !full_name) return badRequest(res, 'full_name is required for individual customers');
  if (customer_type === 'COMPANY' && !company_name) return badRequest(res, 'company_name is required for company customers');
  if (customer_type === 'COMPANY' && !tin_number) return badRequest(res, 'TIN number is required for company customers');

  const customer = await prisma.customer.create({
    data: {
      customer_type,
      full_name: full_name || null,
      company_name: company_name || null,
      tin_number: tin_number || null,
      phone: phone || null,
      location: location || null,
      notes: notes || null,
      contact_person_name: contact_person_name || null,
      contact_person_phone: contact_person_phone || null,
      credit_limit: credit_limit != null ? Number(credit_limit) : 0,
    },
  });
  return created(res, customer);
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { orders: { where: { deletedAt: null } } },
  });
  if (!customer) return notFound(res, 'Customer not found');
  return ok(res, customer);
}

export async function updateCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!customer) return notFound(res, 'Customer not found');

  const {
    full_name, company_name, tin_number,
    phone, location, notes,
    contact_person_name, contact_person_phone, credit_limit,
  } = req.body;

  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      full_name: full_name ?? customer.full_name,
      company_name: company_name ?? customer.company_name,
      tin_number: tin_number ?? customer.tin_number,
      phone: phone ?? customer.phone,
      location: location ?? customer.location,
      notes: notes ?? customer.notes,
      contact_person_name: contact_person_name ?? customer.contact_person_name,
      contact_person_phone: contact_person_phone ?? customer.contact_person_phone,
      credit_limit: credit_limit != null ? Number(credit_limit) : customer.credit_limit,
    },
  });
  return ok(res, updated);
}

export async function deleteCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!customer) return notFound(res, 'Customer not found');
  await prisma.customer.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, null, 'Customer deleted');
}
