import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, created, notFound } from '../utils/response';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function getNextProformaNumber(year: number, count: number) {
  return `PRO-${year}-${String(count + 1).padStart(3, '0')}`;
}

export async function createProforma(req: Request, res: Response) {
  const { orderId } = req.body;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });
  if (!order) return notFound(res, 'Order not found');

  const year = new Date().getFullYear();
  const count = await prisma.proformaInvoice.count({
    where: { number: { startsWith: `PRO-${year}-` } },
  });
  const number = getNextProformaNumber(year, count);
  const dateIssued = new Date();
  const validUntil = new Date(dateIssued);
  validUntil.setDate(validUntil.getDate() + 30);

  const proforma = await prisma.proformaInvoice.create({
    data: {
      number,
      customerId: order.customerId,
      orderId,
      date_issued: dateIssued,
      valid_until: validUntil,
      subtotal: order.total_amount,
      total: order.total_amount,
    },
    include: { customer: true, order: true },
  });
  return created(res, proforma);
}

export async function getProforma(req: Request, res: Response) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, order: true },
  });
  if (!proforma) return notFound(res, 'Proforma invoice not found');
  return ok(res, proforma);
}

export async function printProforma(req: Request, res: Response) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, order: true },
  });
  if (!proforma) return notFound(res, 'Proforma invoice not found');

  const { customer, order } = proforma;
  const fmt = (n: number) => n.toLocaleString('en-RW');

  let logoHtml = `<div style="background:#C0392B;color:white;padding:15px 20px;font-size:22px;font-weight:bold;border-radius:4px;">OPTIMA CLAYS LTD</div>`;
  try {
    const logoPath = process.env.LOGO_PATH || '';
    if (logoPath && fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).slice(1).replace('jpg', 'jpeg');
      const b64 = fs.readFileSync(logoPath).toString('base64');
      logoHtml = `<img src="data:image/${ext};base64,${b64}" style="max-height:90px;max-width:200px;" />`;
    }
  } catch {}

  const billTo = customer.customer_type === 'INDIVIDUAL'
    ? `<div><strong>${customer.full_name}</strong></div><div>${customer.phone || ''}</div><div>${customer.location || ''}</div>`
    : `<div><strong>${customer.company_name}</strong></div><div>TIN: ${customer.tin_number || ''}</div><div>${customer.contact_person_name || ''} | ${customer.contact_person_phone || ''}</div><div>${customer.location || ''}</div>`;

  const brickLabel = order.brick_type === 'CUSTOM' ? order.custom_name || 'Custom' : order.brick_type.replace('_', ' ');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Proforma Invoice ${proforma.number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #2C3E50; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; }
  .header { background: #C0392B; color: white; padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; }
  .header-left .company-info { font-size: 11px; margin-top: 8px; opacity: 0.9; }
  .header-right { text-align: right; }
  .header-right h1 { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
  .header-right .doc-info { font-size: 12px; margin-top: 6px; }
  .bill-section { background: #F5F0EB; padding: 16px 30px; margin-top: 16px; border-radius: 4px; }
  .bill-section h3 { color: #C0392B; font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #2C3E50; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  td { padding: 9px 12px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #F9F6F3; }
  .text-right { text-align: right; }
  .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
  .totals table { width: 300px; }
  .totals td { border-bottom: none; padding: 6px 12px; }
  .totals .grand-total td { font-size: 16px; font-weight: bold; color: #C0392B; border-top: 2px solid #C0392B; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #7F8C8D; }
  .footer .tagline { font-weight: bold; color: #C0392B; font-size: 13px; text-align: center; margin-top: 10px; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div class="company-info">
        ${process.env.COMPANY_ADDRESS}<br/>
        Tel: ${process.env.COMPANY_PHONE} | ${process.env.COMPANY_EMAIL}<br/>
        TIN: ${process.env.COMPANY_TIN}
      </div>
    </div>
    <div class="header-right">
      <h1>PROFORMA INVOICE</h1>
      <div class="doc-info">
        <div><strong>No:</strong> ${proforma.number}</div>
        <div><strong>Date:</strong> ${proforma.date_issued.toLocaleDateString('en-GB')}</div>
        <div><strong>Valid Until:</strong> ${proforma.valid_until.toLocaleDateString('en-GB')}</div>
      </div>
    </div>
  </div>

  <div class="bill-section">
    <h3>BILL TO</h3>
    ${billTo}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Brick Type</th>
        <th>Quality Grade</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Unit Price (RWF)</th>
        <th class="text-right">Total (RWF)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Bricks Supply</td>
        <td>${brickLabel}</td>
        <td>${order.quality_grade.replace('_', ' ')}</td>
        <td class="text-right">${fmt(order.quantity)}</td>
        <td class="text-right">${fmt(order.unit_price)}</td>
        <td class="text-right">${fmt(order.total_amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="text-right">${fmt(proforma.subtotal)} RWF</td></tr>
      <tr><td>VAT</td><td class="text-right">As applicable</td></tr>
      <tr class="grand-total"><td><strong>TOTAL</strong></td><td class="text-right"><strong>${fmt(proforma.total)} RWF</strong></td></tr>
    </table>
  </div>

  <div class="footer">
    <div><strong>Payment Details:</strong> Bank: Bank of Kigali | Account No: ${process.env.RECONCILIATION_ACCOUNT}</div>
    <div style="margin-top:6px;">This proforma invoice is valid for 30 days from the date of issue.</div>
    <div style="margin-top:16px;">Authorized by: ________________________</div>
    <div class="tagline">OPTIMA CLAYS LTD — Quality Bricks, Built to Last</div>
  </div>

  <div class="no-print" style="margin-top:24px;text-align:center;">
    <button onclick="window.print()" style="background:#C0392B;color:white;border:none;padding:10px 24px;font-size:14px;cursor:pointer;border-radius:4px;">
      Print / Save as PDF
    </button>
  </div>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
