import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

const DEFAULT_CATEGORIES = [
  { name: 'Maintenance', sort_order: 0 },
  { name: 'Utilities', sort_order: 1 },
  { name: 'Transport', sort_order: 2 },
  { name: 'Raw Materials', sort_order: 3 },
  { name: 'Labour', sort_order: 4 },
  { name: 'Equipment', sort_order: 5 },
  { name: 'Administration', sort_order: 6 },
  { name: 'Other', sort_order: 7 },
];

export async function listCategories(req: Request, res: Response) {
  let categories = await prisma.expenseCategoryConfig.findMany({ orderBy: { sort_order: 'asc' } });
  if (categories.length === 0) {
    await prisma.expenseCategoryConfig.createMany({ data: DEFAULT_CATEGORIES, skipDuplicates: true });
    categories = await prisma.expenseCategoryConfig.findMany({ orderBy: { sort_order: 'asc' } });
  }
  return ok(res, categories);
}

export async function createCategory(req: Request, res: Response) {
  const { name } = req.body;
  if (!name?.trim()) return badRequest(res, 'name is required');
  const exists = await prisma.expenseCategoryConfig.findUnique({ where: { name: name.trim() } });
  if (exists) return badRequest(res, 'Category with this name already exists');
  const maxOrder = await prisma.expenseCategoryConfig.aggregate({ _max: { sort_order: true } });
  const category = await prisma.expenseCategoryConfig.create({
    data: { name: name.trim(), sort_order: (maxOrder._max.sort_order ?? -1) + 1 },
  });
  return created(res, category);
}

export async function updateCategory(req: Request, res: Response) {
  const category = await prisma.expenseCategoryConfig.findUnique({ where: { id: req.params.id } });
  if (!category) return notFound(res, 'Category not found');
  const { name, is_active } = req.body;
  if (name?.trim()) {
    const exists = await prisma.expenseCategoryConfig.findFirst({
      where: { name: name.trim(), NOT: { id: req.params.id } },
    });
    if (exists) return badRequest(res, 'Category with this name already exists');
  }
  const updated = await prisma.expenseCategoryConfig.update({
    where: { id: req.params.id },
    data: {
      name: name?.trim() || undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
    },
  });
  return ok(res, updated);
}

export async function deleteCategory(req: Request, res: Response) {
  const category = await prisma.expenseCategoryConfig.findUnique({ where: { id: req.params.id } });
  if (!category) return notFound(res, 'Category not found');
  const inUse = await prisma.expense.count({ where: { category: category.name } });
  if (inUse > 0) return badRequest(res, `Cannot delete — ${inUse} expense(s) use this category`);
  await prisma.expenseCategoryConfig.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
}
