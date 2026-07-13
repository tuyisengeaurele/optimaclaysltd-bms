import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest } from '../utils/response';

export async function getCompanySettings(req: Request, res: Response) {
  let settings = await prisma.companySettings.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {
        id: 'singleton',
        tin: '102724630',
        bank_name: 'Bank of Kigali',
        bank_account: '000490774630268',
        phone: '0788640901',
        email: 'optimaclaysltd@gmail.com',
        address: 'Rwanda, Southern Province, Muhanga, Shyogwe, Ruli',
        director_name: 'Eurelie MUREKEYISONI',
        director_title: 'Managing Director',
        default_payment_terms: '50% advance, 25% upon completion of 75% of the order, and the remaining 25% before final delivery',
        default_delivery_period: '45 days from receipt of advance payment',
        overdue_grace_days: 0,
      },
    });
  }
  return ok(res, settings);
}

export async function updateCompanySettings(req: Request, res: Response) {
  const {
    tin, bank_name, bank_account, phone, email, address,
    director_name, director_title, default_payment_terms, default_delivery_period,
    overdue_grace_days,
  } = req.body;

  if (!tin) return badRequest(res, 'TIN is required');
  if (!bank_name) return badRequest(res, 'Bank name is required');
  if (!bank_account) return badRequest(res, 'Bank account is required');
  if (!director_name) return badRequest(res, 'Director name is required');

  const settings = await prisma.companySettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      tin: tin || '',
      bank_name: bank_name || '',
      bank_account: bank_account || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      director_name: director_name || '',
      director_title: director_title || '',
      default_payment_terms: default_payment_terms || '',
      default_delivery_period: default_delivery_period || '',
      overdue_grace_days: overdue_grace_days != null ? Number(overdue_grace_days) : 0,
    },
    update: {
      tin, bank_name, bank_account, phone, email, address,
      director_name, director_title, default_payment_terms, default_delivery_period,
      overdue_grace_days: overdue_grace_days != null ? Number(overdue_grace_days) : undefined,
    },
  });
  return ok(res, settings);
}

export async function getPinnedKpis(req: Request, res: Response) {
  const user = (req as any).user;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  return ok(res, { pinned_kpis: dbUser?.pinned_kpis || [] });
}

export async function updatePinnedKpis(req: Request, res: Response) {
  const user = (req as any).user;
  const { pinned_kpis } = req.body;
  if (!Array.isArray(pinned_kpis)) return badRequest(res, 'pinned_kpis must be an array');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { pinned_kpis },
  });
  return ok(res, { pinned_kpis: updated.pinned_kpis });
}
