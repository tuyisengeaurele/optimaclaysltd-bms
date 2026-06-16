import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../utils/response';

export async function getNotifications(req: Request, res: Response) {
  const user = (req as any).user;
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ user_id: user.id }, { user_id: null }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = notifications.filter(n => !n.is_read).length;
  return ok(res, { notifications, unreadCount });
}

export async function markRead(req: Request, res: Response) {
  const user = (req as any).user;
  const { ids } = req.body;
  if (ids === 'all') {
    await prisma.notification.updateMany({
      where: { OR: [{ user_id: user.id }, { user_id: null }] },
      data: { is_read: true },
    });
  } else if (Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, OR: [{ user_id: user.id }, { user_id: null }] },
      data: { is_read: true },
    });
  }
  return ok(res, { updated: true });
}

export async function generateNotifications(req: Request, res: Response) {
  await runNotificationChecks();
  return ok(res, { generated: true });
}

export async function runNotificationChecks() {
  const now = new Date();

  const thresholds = await prisma.stockThreshold.findMany();
  for (const threshold of thresholds) {
    const stocks = await prisma.rawMaterialStock.findMany({
      where: { material_type: threshold.material_type },
    });
    const totalQty = stocks.reduce((s, r) => s + r.quantity, 0);
    const consumptions = await prisma.rawMaterialConsumption.findMany({
      where: { material_type: threshold.material_type },
    });
    const totalConsumed = consumptions.reduce((s, r) => s + r.quantity_used, 0);
    const remaining = totalQty - totalConsumed;

    if (remaining <= threshold.threshold) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'LOW_STOCK',
          resource: threshold.material_type,
          is_read: false,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            type: 'LOW_STOCK',
            title: 'Low Stock Alert',
            message: `${threshold.material_type.replace(/_/g, ' ')} is at ${remaining.toFixed(1)} ${threshold.unit} — below threshold of ${threshold.threshold} ${threshold.unit}`,
            resource: threshold.material_type,
          },
        });
      }
    }
  }

  const settings = await prisma.companySettings.findUnique({ where: { id: 'singleton' } });
  const graceDays = settings?.overdue_grace_days ?? 0;
  const cutoff = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);

  const overdueInvoices = await prisma.invoice.findMany({
    where: { due_date: { lt: cutoff }, is_overdue: false },
    include: { payments: true, order: { include: { customer: true } } },
  });

  for (const invoice of overdueInvoices) {
    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    if (paid < invoice.total) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { is_overdue: true } });
      const existing = await prisma.notification.findFirst({
        where: { type: 'OVERDUE_INVOICE', resource_id: invoice.id, is_read: false },
      });
      if (!existing) {
        const customer = invoice.order?.customer;
        const name = customer?.company_name || customer?.full_name || 'Unknown';
        await prisma.notification.create({
          data: {
            type: 'OVERDUE_INVOICE',
            title: 'Overdue Invoice',
            message: `Invoice ${invoice.number} for ${name} is overdue`,
            resource: 'invoice',
            resource_id: invoice.id,
          },
        });
      }
    }
  }
}
