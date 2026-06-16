import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listSuppliers(req: Request, res: Response) {
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
  return ok(res, suppliers);
}

export async function createSupplier(req: Request, res: Response) {
  const { name, contact_name, phone, material_types, payment_terms, notes } = req.body;
  if (!name?.trim()) return badRequest(res, 'name is required');
  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      contact_name: contact_name || null,
      phone: phone || null,
      material_types: Array.isArray(material_types) ? material_types : [],
      payment_terms: payment_terms || null,
      notes: notes || null,
    },
  });
  return created(res, supplier);
}

export async function updateSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!supplier) return notFound(res, 'Supplier not found');
  const { name, contact_name, phone, material_types, payment_terms, notes, is_active } = req.body;
  const updated = await prisma.supplier.update({
    where: { id: req.params.id },
    data: {
      name: name?.trim() || undefined,
      contact_name: contact_name !== undefined ? (contact_name || null) : undefined,
      phone: phone !== undefined ? (phone || null) : undefined,
      material_types: Array.isArray(material_types) ? material_types : undefined,
      payment_terms: payment_terms !== undefined ? (payment_terms || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
    },
  });
  return ok(res, updated);
}

export async function deleteSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!supplier) return notFound(res, 'Supplier not found');
  await prisma.supplier.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { deleted: true });
}
