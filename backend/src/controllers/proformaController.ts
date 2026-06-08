import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';
import fs from 'fs';
import path from 'path';

function getNextProformaNumber(year: number, count: number) {
  return `PRO-${year}-${String(count + 1).padStart(3, '0')}`;
}

const PRODUCT_CATALOGUE: Record<string, { name: string; dimensions: string; application: string }> = {
  BRICK_10:     { name: 'Brick 10',      dimensions: '21 × 10 × 6.5 cm', application: 'Structural & non-structural' },
  PAVING_BLOCK: { name: 'Paving Block',  dimensions: '20 × 10 × 6 cm',   application: 'External paving' },
  HALF_BRICK:   { name: 'Half Brick',    dimensions: '21 × 5 × 6.5 cm',  application: 'Finishing & detailing' },
  LOW_ROCK_BOND:{ name: 'Low Rock Bond', dimensions: '21 × 5.5 × 10 cm', application: 'Feature & landscape' },
  CUSTOM:       { name: 'Custom',        dimensions: 'As specified',      application: 'Custom order' },
};

// ── LIST ────────────────────────────────────────────────────────────────────
export async function listProformas(req: Request, res: Response) {
  const proformas = await prisma.proformaInvoice.findMany({
    include: { customer: true, order: true },
    orderBy: { date_issued: 'desc' },
  });
  return ok(res, proformas);
}

// ── CREATE (standalone — no order required) ──────────────────────────────────
export async function createProforma(req: Request, res: Response) {
  const { customerId, brick_type, custom_name, quantity, unit_price, notes, valid_until } = req.body;

  if (!customerId)   return badRequest(res, 'Customer is required');
  if (!brick_type)   return badRequest(res, 'Brick type is required');
  if (!quantity)     return badRequest(res, 'Quantity is required');
  if (!unit_price)   return badRequest(res, 'Unit price is required');

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return notFound(res, 'Customer not found');

  const qty     = Number(quantity);
  const price   = Number(unit_price);
  const subtotal = qty * price;

  const year  = new Date().getFullYear();
  const count = await prisma.proformaInvoice.count({ where: { number: { startsWith: `PRO-${year}-` } } });
  const number = getNextProformaNumber(year, count);

  const dateIssued = new Date();
  const validUntil = valid_until
    ? new Date(valid_until)
    : new Date(dateIssued.getTime() + 30 * 24 * 60 * 60 * 1000);

  const proforma = await prisma.proformaInvoice.create({
    data: {
      number,
      customerId,
      brick_type,
      custom_name: custom_name || null,
      quantity: qty,
      unit_price: price,
      date_issued: dateIssued,
      valid_until: validUntil,
      subtotal,
      total: subtotal,
      notes: notes || null,
    },
    include: { customer: true, order: true },
  });
  return created(res, proforma);
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function deleteProforma(req: Request, res: Response) {
  const proforma = await prisma.proformaInvoice.findUnique({ where: { id: req.params.id } });
  if (!proforma) return notFound(res, 'Proforma invoice not found');
  await prisma.proformaInvoice.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'Proforma invoice deleted' });
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function getProforma(req: Request, res: Response) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, order: true },
  });
  if (!proforma) return notFound(res, 'Proforma invoice not found');
  return ok(res, proforma);
}

// ── PRINT (HTML) ─────────────────────────────────────────────────────────────
export async function printProforma(req: Request, res: Response) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, order: true },
  });
  if (!proforma) return notFound(res, 'Proforma invoice not found');

  const { customer } = proforma;
  const fmt = (n: number) => n.toLocaleString('en-RW');

  // Resolve product details — prefer standalone fields, fall back to linked order
  const brickCode = proforma.brick_type || proforma.order?.brick_type || 'CUSTOM';
  const product   = PRODUCT_CATALOGUE[brickCode] || PRODUCT_CATALOGUE['CUSTOM'];
  const isCustom  = brickCode === 'CUSTOM';
  const brickLabel       = isCustom ? (proforma.custom_name || proforma.order?.custom_name || 'Custom') : product.name;
  const brickDimensions  = isCustom ? 'As specified' : product.dimensions;
  const brickApplication = isCustom ? '—' : product.application;

  const qty       = proforma.quantity   ?? proforma.order?.quantity   ?? 0;
  const unitPrice = proforma.unit_price ?? proforma.order?.unit_price ?? 0;
  const total     = proforma.total;

  let logoHtml = `<span style="font-size:26px;font-weight:900;letter-spacing:2px;color:#fff;">OPTIMA CLAYS LTD</span>`;
  try {
    const logoPath = process.env.LOGO_PATH || '';
    if (logoPath && fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).slice(1).replace('jpg', 'jpeg');
      const b64 = fs.readFileSync(logoPath).toString('base64');
      logoHtml = `<img src="data:image/${ext};base64,${b64}" style="max-height:80px;max-width:180px;object-fit:contain;" />`;
    }
  } catch {}

  const clientName    = customer.customer_type === 'INDIVIDUAL' ? (customer.full_name || '—') : (customer.company_name || '—');
  const clientContact = customer.customer_type === 'INDIVIDUAL'
    ? customer.phone || '—'
    : `${customer.contact_person_name || ''}${customer.contact_person_phone ? ' · ' + customer.contact_person_phone : ''}`;
  const clientTin      = customer.tin_number ? `<tr><td>TIN Number:</td><td>${customer.tin_number}</td></tr>` : '';
  const clientLocation = customer.location   ? `<tr><td>Location:</td><td>${customer.location}</td></tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Proforma Invoice — ${proforma.number}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #f0f2f5; }
  .wrapper { max-width: 860px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.12); }

  .header { background: linear-gradient(135deg, #b71c1c 0%, #c0392b 60%, #e53935 100%); padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-company { display: flex; flex-direction: column; gap: 8px; }
  .header-company .tagline { font-size: 11px; color: rgba(255,255,255,0.75); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
  .company-meta { font-size: 11px; color: rgba(255,255,255,0.85); line-height: 1.6; margin-top: 6px; }
  .header-doc { text-align: right; }
  .header-doc .doc-title { font-size: 30px; font-weight: 800; color: #fff; letter-spacing: 3px; line-height: 1; }
  .header-doc .doc-number { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin-top: 8px; }
  .header-doc table { margin-top: 8px; margin-left: auto; }
  .header-doc table td { color: rgba(255,255,255,0.85); font-size: 12px; padding: 1px 0; text-align: right; }
  .header-doc table td:first-child { padding-right: 10px; opacity: 0.7; }

  .addresses { display: flex; gap: 0; border-bottom: 2px solid #f5f5f5; }
  .addr-block { flex: 1; padding: 22px 36px; }
  .addr-block + .addr-block { border-left: 1px solid #f0f0f0; }
  .addr-label { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #c0392b; margin-bottom: 10px; }
  .addr-block table td { font-size: 12.5px; padding: 2px 0; vertical-align: top; }
  .addr-block table td:first-child { color: #888; width: 90px; }
  .addr-block table td:last-child { font-weight: 600; color: #1a1a2e; padding-left: 10px; }

  .order-strip { background: #fafafa; border-bottom: 2px solid #f0f0f0; padding: 14px 36px; display: flex; gap: 32px; }
  .order-strip .strip-item { display: flex; flex-direction: column; gap: 3px; }
  .order-strip .strip-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #888; }
  .order-strip .strip-value { font-size: 13px; font-weight: 700; color: #1a1a2e; }

  .table-wrap { padding: 20px 36px; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items thead tr { background: #1a1a2e; }
  table.items thead th { color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 11px 14px; text-align: left; }
  table.items thead th.right { text-align: right; }
  table.items tbody tr:nth-child(even) { background: #fdf8f7; }
  table.items tbody td { padding: 13px 14px; border-bottom: 1px solid #f0eeec; font-size: 13px; vertical-align: top; }
  table.items tbody td.right { text-align: right; font-weight: 600; }
  .product-name { font-weight: 700; color: #1a1a2e; }
  .product-meta { font-size: 11px; color: #888; margin-top: 3px; }

  .totals-wrap { padding: 0 36px 24px; display: flex; justify-content: flex-end; }
  .totals-box { width: 300px; border: 1px solid #f0eeec; border-radius: 8px; overflow: hidden; }
  .totals-box table { width: 100%; border-collapse: collapse; }
  .totals-box table td { padding: 9px 16px; font-size: 13px; border-bottom: 1px solid #f5f5f5; }
  .totals-box table tr:last-child td { border-bottom: none; }
  .totals-box .total-label { color: #666; }
  .totals-box .total-value { text-align: right; font-weight: 600; }
  .totals-box .grand-row td { background: #c0392b; color: #fff !important; font-size: 16px; font-weight: 800; }

  .notes-section { padding: 0 36px 24px; }
  .notes-section .notes-title { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #c0392b; margin-bottom: 8px; }
  .notes-section p { font-size: 12px; color: #555; line-height: 1.6; }

  .footer-bar { background: #1a1a2e; padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; }
  .footer-bar .bank-info { font-size: 11px; color: rgba(255,255,255,0.8); }
  .footer-bar .bank-info strong { color: #fff; font-size: 12px; }
  .footer-bar .sig-block { text-align: right; }
  .footer-bar .sig-block .sig-line { border-top: 1px solid rgba(255,255,255,0.4); width: 160px; margin-top: 28px; padding-top: 6px; font-size: 11px; color: rgba(255,255,255,0.7); }

  .print-btn-wrap { padding: 24px; text-align: center; background: #f0f2f5; }
  .print-btn { background: #c0392b; color: white; border: none; padding: 12px 32px; font-size: 14px; font-weight: 700; cursor: pointer; border-radius: 6px; letter-spacing: 0.5px; }
  .print-btn:hover { background: #a93226; }

  @media print {
    body { background: #fff; }
    .wrapper { box-shadow: none; margin: 0; border-radius: 0; }
    .print-btn-wrap { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="wrapper">

  <!-- HEADER -->
  <div class="header">
    <div class="header-company">
      ${logoHtml}
      <div class="tagline">Premium Clay Brick Manufacturer — Rwanda</div>
      <div class="company-meta">
        ${process.env.COMPANY_ADDRESS || 'Rwanda, Muhanga, Shyogwe, Ruli'}<br/>
        Tel: ${process.env.COMPANY_PHONE || ''} &nbsp;|&nbsp; ${process.env.COMPANY_EMAIL || ''}<br/>
        TIN: ${process.env.COMPANY_TIN || ''}
      </div>
    </div>
    <div class="header-doc">
      <div class="doc-title">PROFORMA</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:2px;margin-top:2px;">INVOICE</div>
      <div class="doc-number">${proforma.number}</div>
      <table>
        <tr><td>Date Issued:</td><td>${proforma.date_issued.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</td></tr>
        <tr><td>Valid Until:</td><td>${proforma.valid_until.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</td></tr>
      </table>
    </div>
  </div>

  <!-- ADDRESSES -->
  <div class="addresses">
    <div class="addr-block">
      <div class="addr-label">From (Seller)</div>
      <table>
        <tr><td>Company:</td><td>${process.env.COMPANY_NAME || 'OPTIMA CLAYS LTD'}</td></tr>
        <tr><td>TIN:</td><td>${process.env.COMPANY_TIN || ''}</td></tr>
        <tr><td>Address:</td><td>${process.env.COMPANY_ADDRESS || 'Rwanda, Muhanga, Shyogwe, Ruli'}</td></tr>
        <tr><td>Phone:</td><td>${process.env.COMPANY_PHONE || ''}</td></tr>
        <tr><td>Email:</td><td>${process.env.COMPANY_EMAIL || ''}</td></tr>
      </table>
    </div>
    <div class="addr-block">
      <div class="addr-label">Bill To (Customer)</div>
      <table>
        <tr><td>Name:</td><td>${clientName}</td></tr>
        <tr><td>Type:</td><td>${customer.customer_type === 'COMPANY' ? 'Company' : 'Individual'}</td></tr>
        ${clientTin}
        <tr><td>Contact:</td><td>${clientContact || '—'}</td></tr>
        ${clientLocation}
      </table>
    </div>
  </div>

  <!-- REFERENCE STRIP -->
  <div class="order-strip">
    <div class="strip-item"><span class="strip-label">Reference No.</span><span class="strip-value">${proforma.number}</span></div>
    <div class="strip-item"><span class="strip-label">Date Issued</span><span class="strip-value">${proforma.date_issued.toLocaleDateString('en-GB')}</span></div>
    <div class="strip-item"><span class="strip-label">Valid Until</span><span class="strip-value">${proforma.valid_until.toLocaleDateString('en-GB')}</span></div>
    <div class="strip-item"><span class="strip-label">Currency</span><span class="strip-value">RWF</span></div>
  </div>

  <!-- LINE ITEMS TABLE -->
  <div class="table-wrap">
    <table class="items">
      <thead>
        <tr>
          <th style="width:35%">Product</th>
          <th>Dimensions</th>
          <th>Application</th>
          <th class="right">Qty (units)</th>
          <th class="right">Unit Price (RWF)</th>
          <th class="right">Amount (RWF)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="product-name">${brickLabel}</div>
            <div class="product-meta">Kiln-fired clay brick</div>
          </td>
          <td style="font-family:monospace;font-size:12px;">${brickDimensions}</td>
          <td style="font-size:12px;color:#555;">${brickApplication}</td>
          <td class="right">${fmt(qty)}</td>
          <td class="right">${fmt(unitPrice)}</td>
          <td class="right">${fmt(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <div class="totals-wrap">
    <div class="totals-box">
      <table>
        <tr><td class="total-label">Subtotal</td><td class="total-value">${fmt(proforma.subtotal)} RWF</td></tr>
        <tr><td class="total-label">VAT (18%)</td><td class="total-value" style="color:#888;">As applicable</td></tr>
        <tr class="grand-row"><td>TOTAL AMOUNT</td><td style="text-align:right;">${fmt(proforma.total)} RWF</td></tr>
      </table>
    </div>
  </div>

  <!-- NOTES -->
  <div class="notes-section">
    <div class="notes-title">Terms &amp; Notes</div>
    <p>
      • This proforma invoice is valid for <strong>30 days</strong> from the date of issue.<br/>
      • Payment should be made to the bank account below before delivery is confirmed.<br/>
      • Actual delivery schedule will be confirmed upon receipt of payment.<br/>
      • All prices are in Rwandan Francs (RWF). VAT will be applied as required by law.
      ${proforma.notes ? `<br/>• ${proforma.notes}` : ''}
    </p>
  </div>

  <!-- FOOTER BAR -->
  <div class="footer-bar">
    <div class="bank-info">
      <strong>Payment Details</strong><br/>
      Bank: Bank of Kigali<br/>
      Account No: ${process.env.RECONCILIATION_ACCOUNT || ''}<br/>
      Account Name: ${process.env.COMPANY_NAME || 'OPTIMA CLAYS LTD'}
    </div>
    <div class="sig-block">
      <div class="sig-line">Authorized Signatory<br/>${process.env.MD_NAME || 'Eurelie Murekeyisoni'}</div>
    </div>
  </div>

</div>
<div class="print-btn-wrap">
  <button class="print-btn" onclick="window.print()">⎙ &nbsp; Print / Save as PDF</button>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
