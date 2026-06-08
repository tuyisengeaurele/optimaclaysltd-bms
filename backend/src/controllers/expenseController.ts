import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound } from '../utils/response';



export async function listExpenses(req: Request, res: Response) {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.date = { ...where.date, gte: new Date(from as string) };
  if (to) where.date = { ...where.date, lte: new Date(to as string) };
  const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
  return ok(res, expenses);
}

export async function createExpense(req: Request, res: Response) {
  const expense = await prisma.expense.create({ data: { ...req.body, date: new Date(req.body.date) } });
  return created(res, expense);
}

export async function deleteExpense(req: Request, res: Response) {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!expense) return notFound(res, 'Expense not found');
  await prisma.expense.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'Expense deleted' });
}
