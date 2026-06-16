import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listExpenses(req: Request, res: Response) {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.date = { ...where.date, gte: new Date(from as string) };
  if (to) where.date = { ...where.date, lte: new Date(to as string) };
  const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
  return ok(res, expenses);
}

export async function createExpense(req: Request, res: Response) {
  const { category, amount, date, description } = req.body;
  if (!category?.trim()) return badRequest(res, 'category is required');
  if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) return badRequest(res, 'amount must be a positive number');
  if (!date) return badRequest(res, 'date is required');

  const expense = await prisma.expense.create({
    data: {
      category: category.trim(),
      amount: Number(amount),
      date: new Date(date),
      description: description || null,
    },
  });
  return created(res, expense);
}

export async function deleteExpense(req: Request, res: Response) {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!expense) return notFound(res, 'Expense not found');
  await prisma.expense.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'Expense deleted' });
}
