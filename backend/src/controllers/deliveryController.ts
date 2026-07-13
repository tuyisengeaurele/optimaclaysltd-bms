import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';
import { renderPdf } from '../lib/pdf';

export async function listDeliveries(req: Request, res: Response) {
  const { status, from, to } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (from) where.scheduled_date = { ...where.scheduled_date, gte: new Date(from as string) };
  if (to) where.scheduled_date = { ...where.scheduled_date, lte: new Date(to as string) };

  const deliveries = await prisma.delivery.findMany({
    where,
    include: { order: { include: { customer: true } }, costs: true },
    orderBy: { scheduled_date: 'desc' },
  });
  return ok(res, deliveries);
}

export async function createDelivery(req: Request, res: Response) {
  const { delivery_fee, orderId, vehicle_plate, driver_name, scheduled_date, quantity_loaded, notes } = req.body;
  if (!orderId) return badRequest(res, 'orderId is required');

  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) return notFound(res, 'Order not found');

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      vehicle_plate: vehicle_plate || null,
      driver_name: driver_name || null,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : undefined,
      quantity_loaded: quantity_loaded ? Number(quantity_loaded) : 0,
      notes: notes || null,
      costs: {
        create: { fuel_cost: 0, driver_fee: Number(delivery_fee) || 0, hired_truck_cost: 0 },
      },
    },
    include: { order: { include: { customer: true } }, costs: true },
  });
  return created(res, delivery);
}

export async function updateDeliveryStatus(req: Request, res: Response) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: req.params.id },
    include: { order: true },
  });
  if (!delivery) return notFound(res, 'Delivery not found');

  const { status, actual_delivery_date, receiver_name, damage_qty, damage_notes, notes } = req.body;

  const wasDelivered = delivery.status !== 'DELIVERED' && status === 'DELIVERED';

  const updated = await prisma.delivery.update({
    where: { id: req.params.id },
    data: {
      status: status || undefined,
      actual_delivery_date: actual_delivery_date ? new Date(actual_delivery_date) : (wasDelivered ? new Date() : undefined),
      receiver_name: receiver_name !== undefined ? (receiver_name || null) : undefined,
      damage_qty: damage_qty != null ? Number(damage_qty) : undefined,
      damage_notes: damage_notes !== undefined ? (damage_notes || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
    },
    include: { order: { include: { customer: true } }, costs: true },
  });

  if (wasDelivered && delivery.order) {
    const deliveredQty = delivery.quantity_loaded - (Number(damage_qty) || 0);
    if (deliveredQty > 0) {
      const stock = await prisma.finishedGoodsStock.findFirst({
        where: { brick_type: delivery.order.brick_type, quality_grade: delivery.order.quality_grade },
        orderBy: { date: 'asc' },
      });
      if (stock && stock.quantity >= deliveredQty) {
        await prisma.finishedGoodsStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deliveredQty } },
        });
      }
    }
    await prisma.order.update({ where: { id: delivery.order.id }, data: { status: 'DELIVERED' } });
  }

  return ok(res, updated);
}

export async function recordDamage(req: Request, res: Response) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: req.params.id },
    include: { order: { include: { invoices: true } } },
  });
  if (!delivery) return notFound(res, 'Delivery not found');
  const { damage_qty, damage_notes } = req.body;
  if (damage_qty == null || isNaN(Number(damage_qty)) || Number(damage_qty) < 0) {
    return badRequest(res, 'damage_qty must be a non-negative number');
  }
  const qty = Number(damage_qty);
  const updated = await prisma.delivery.update({
    where: { id: req.params.id },
    data: { damage_qty: qty, damage_notes: damage_notes || null },
    include: { order: { include: { customer: true } }, costs: true },
  });
  return ok(res, updated);
}

async function buildWaybillHtml(id: string): Promise<{ html: string; number: string } | null> {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { order: { include: { customer: true } }, costs: true },
  });
  if (!delivery) return null;

  const settings = await prisma.companySettings.findUnique({ where: { id: 'singleton' } });
  const logoPath = path.join(__dirname, '../../assets/logo.png');
  let logoBase64 = '';
  try {
    logoBase64 = fs.readFileSync(logoPath).toString('base64');
  } catch { /* logo not found — continue without it */ }

  const order = delivery.order;
  const customer = order?.customer;
  const customerName = customer?.company_name || customer?.full_name || 'N/A';
  const brickType = (order?.brick_type || '').replace(/_/g, ' ');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Delivery Note DN-${delivery.id.slice(0, 8).toUpperCase()}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #222; padding-bottom: 12px; }
  .logo { height: 60px; }
  .company-name { font-size: 16px; font-weight: bold; }
  .doc-title { text-align: right; font-size: 18px; font-weight: bold; color: #c00; }
  .doc-number { font-size: 11px; color: #555; margin-top: 4px; }
  .section { margin: 12px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .label { font-weight: bold; font-size: 10px; text-transform: uppercase; color: #555; }
  .value { font-size: 13px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #222; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .sig-line { border-top: 1px solid #222; padding-top: 4px; font-size: 11px; color: #555; }
  .footer { margin-top: 20px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <div>
    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="logo" />` : ''}
    <div class="company-name">${settings?.tin ? `OPTIMA CLAYS LTD &nbsp;|&nbsp; TIN: ${settings.tin}` : 'OPTIMA CLAYS LTD'}</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${settings?.address || 'Muhanga, Shyogwe, Ruli, Rwanda'}</div>
  </div>
  <div style="text-align:right">
    <div class="doc-title">DELIVERY NOTE</div>
    <div class="doc-number">DN-${delivery.id.slice(0, 8).toUpperCase()}</div>
    <div class="doc-number">Date: ${delivery.actual_delivery_date ? new Date(delivery.actual_delivery_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</div>
  </div>
</div>

<div class="grid">
  <div class="section">
    <div class="label">Deliver To</div>
    <div class="value" style="font-weight:bold">${customerName}</div>
    ${customer?.location ? `<div class="value">${customer.location}</div>` : ''}
    ${customer?.phone ? `<div class="value">Tel: ${customer.phone}</div>` : ''}
  </div>
  <div class="section">
    <div class="label">Transport Details</div>
    <div class="value">Driver: ${delivery.driver_name || 'N/A'}</div>
    <div class="value">Vehicle: ${delivery.vehicle_plate || 'N/A'}</div>
    <div class="value">Scheduled: ${delivery.scheduled_date ? new Date(delivery.scheduled_date).toLocaleDateString('en-GB') : 'N/A'}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Description</th>
      <th>Quality Grade</th>
      <th style="text-align:right">Quantity Loaded</th>
      ${delivery.damage_qty > 0 ? '<th style="text-align:right">Damaged</th><th style="text-align:right">Net Delivered</th>' : ''}
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>${brickType}${order?.custom_name ? ` (${order.custom_name})` : ''}</td>
      <td>${(order?.quality_grade || '').replace(/_/g, ' ')}</td>
      <td style="text-align:right">${delivery.quantity_loaded.toLocaleString()}</td>
      ${delivery.damage_qty > 0 ? `<td style="text-align:right;color:#c00">${delivery.damage_qty.toLocaleString()}</td><td style="text-align:right;font-weight:bold">${(delivery.quantity_loaded - delivery.damage_qty).toLocaleString()}</td>` : ''}
    </tr>
  </tbody>
</table>

${delivery.damage_qty > 0 ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:8px 12px;border-radius:4px;font-size:11px;margin-bottom:12px"><strong>Damage Note:</strong> ${delivery.damage_notes || `${delivery.damage_qty} units damaged in transit`}</div>` : ''}

${delivery.notes ? `<div class="section"><div class="label">Notes</div><div class="value">${delivery.notes}</div></div>` : ''}

<div class="sig-grid">
  <div>
    <div style="height:40px"></div>
    <div class="sig-line">Dispatched by (Optima Clays)</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${settings?.director_name || ''}</div>
  </div>
  <div>
    <div style="height:40px"></div>
    <div class="sig-line">Received by (Customer)</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${delivery.receiver_name || 'Name & Signature'}</div>
  </div>
</div>

<div class="footer">
  OPTIMA CLAYS LTD &nbsp;|&nbsp; ${settings?.phone || ''} &nbsp;|&nbsp; ${settings?.email || ''} &nbsp;|&nbsp; Bank: ${settings?.bank_name || ''} &nbsp;|&nbsp; Acc: ${settings?.bank_account || ''}
</div>

</body>
</html>`;

  return { html, number: `DN-${delivery.id.slice(0, 8).toUpperCase()}` };
}

export async function downloadWaybillPdf(req: Request, res: Response) {
  const doc = await buildWaybillHtml(req.params.id);
  if (!doc) return notFound(res, 'Delivery not found');

  const pdf = await renderPdf(doc.html);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Waybill-${doc.number}.pdf"`);
  res.send(pdf);
}

export async function deleteDelivery(req: Request, res: Response) {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
  if (!delivery) return notFound(res, 'Delivery not found');
  await prisma.deliveryCost.deleteMany({ where: { deliveryId: req.params.id } });
  await prisma.delivery.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'Delivery deleted' });
}
