import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import ExcelJS from 'exceljs';
import { ok, created, notFound, badRequest } from '../utils/response';
import { renderPdf } from '../lib/pdf';
import fs from 'fs';
import path from 'path';



const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export async function listPayrollRuns(req: Request, res: Response) {
  const runs = await prisma.payrollRun.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { entries: true } } },
  });
  return ok(res, runs);
}

export async function deletePayrollRun(req: Request, res: Response) {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.runId } });
  if (!run) return notFound(res, 'Payroll run not found');
  if (run.finalized) return badRequest(res, 'Cannot delete a finalized payroll run');
  // Cascade delete entries first
  await prisma.payrollEntry.deleteMany({ where: { payrollRunId: run.id } });
  await prisma.payrollRun.delete({ where: { id: run.id } });
  return ok(res, { deleted: true });
}

export async function createPayrollRun(req: Request, res: Response) {
  const { month, year } = req.body;
  const existing = await prisma.payrollRun.findFirst({ where: { month, year } });
  if (existing) return badRequest(res, 'Payroll run for this month/year already exists');

  const employees = await prisma.employee.findMany({ where: { deletedAt: null, is_active: true } });
  const monStr = MONTHS[month - 1];
  const run = await prisma.payrollRun.create({
    data: {
      month, year,
      entries: {
        create: employees.map(e => ({
          employeeId: e.id,
          gross_salary: e.base_salary || 0,
          net_salary: e.base_salary || 0,
          narration: `Monthly-salary-${monStr}-${year}`,
        })),
      },
    },
    include: { entries: { include: { employee: true } } },
  });
  return created(res, run);
}

export async function getPayrollRun(req: Request, res: Response) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: req.params.runId },
    include: { entries: { include: { employee: true } } },
  });
  if (!run) return notFound(res, 'Payroll run not found');
  return ok(res, run);
}

export async function updateEntry(req: Request, res: Response) {
  const { runId, entryId } = req.params;
  const { gross_salary, payment_status, payment_date } = req.body;

  const entry = await prisma.payrollEntry.findFirst({ where: { id: entryId, payrollRunId: runId } });
  if (!entry) return notFound(res, 'Entry not found');

  const updated = await prisma.payrollEntry.update({
    where: { id: entryId },
    data: {
      gross_salary: gross_salary ?? entry.gross_salary,
      net_salary: gross_salary ?? entry.net_salary,
      payment_status: payment_status ?? entry.payment_status,
      payment_date: payment_date ? new Date(payment_date) : entry.payment_date,
    },
    include: { employee: true },
  });
  return ok(res, updated);
}

export async function finalizeRun(req: Request, res: Response) {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.runId } });
  if (!run) return notFound(res, 'Payroll run not found');
  if (run.finalized) return badRequest(res, 'Payroll run is already finalized');
  const updated = await prisma.payrollRun.update({
    where: { id: req.params.runId },
    data: { finalized: true },
  });
  return ok(res, updated);
}

export async function exportPayroll(req: Request, res: Response) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: req.params.runId },
    include: { entries: { include: { employee: true } } },
  });
  if (!run) return notFound(res, 'Payroll run not found');

  const monStr = MONTHS[run.month - 1];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${monStr}-${run.year}`);

  // Row 1: title merged
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = `MONTHLY SALARIES ${monStr.toUpperCase()} ${run.year} ${process.env.COMPANY_NAME}`;
  ws.getCell('A1').font = { bold: true, size: 13 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  // Row 2: headers
  const headers = ['RESERVED','BENEFICIARY NAME','BANK NAME','BENEFICIARY ACCOUNT NUMBER','CREDIT AMOUNT (RWF)','NARRATION','RECONCILIATION ACC','RESERVED'];
  ws.getRow(2).values = headers;
  ws.getRow(2).font = { bold: true };

  let total = 0;
  run.entries.forEach((entry, i) => {
    const row = i + 3;
    ws.getRow(row).values = [
      '',
      entry.employee.full_name,
      entry.employee.bank_name || '',
      entry.employee.bank_account_number || '',
      Math.round(entry.net_salary),
      entry.narration,
      process.env.RECONCILIATION_ACCOUNT,
      '',
    ];
    total += entry.net_salary;
  });

  const totalRow = run.entries.length + 3;
  ws.getRow(totalRow).values = ['', '', '', 'TOTAL=', Math.round(total), '', '', ''];
  ws.getRow(totalRow).font = { bold: true };

  ws.getRow(totalRow + 1).values = [`PREPARED AND APPROVED BY: ${process.env.MD_NAME}`];
  ws.getRow(totalRow + 2).values = [`Managing Director of ${process.env.COMPANY_NAME}`];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${monStr}-${run.year}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
}

async function buildPayslipHtml(runId: string, employeeId: string): Promise<{ html: string; employeeName: string } | null> {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) return null;

  const entry = await prisma.payrollEntry.findFirst({
    where: { payrollRunId: runId, employeeId },
    include: { employee: true },
  });
  if (!entry) return null;

  const monStr = MONTHS[run.month - 1];
  const fmt = (n: number) => n.toLocaleString('en-RW');

  // Read logo
  let logoHtml = '<div style="background:#C0392B;color:white;padding:20px;font-size:24px;font-weight:bold;">OPTIMA CLAYS LTD</div>';
  try {
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      const ext = path.extname(logoPath).slice(1).replace('jpg', 'jpeg');
      const b64 = fs.readFileSync(logoPath).toString('base64');
      logoHtml = `<img src="data:image/${ext};base64,${b64}" style="height:80px;" />`;
    }
  } catch {}

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Payslip - ${entry.employee.full_name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #2C3E50; }
  .header { background: #C0392B; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  td, th { border: 1px solid #ddd; padding: 10px; }
  th { background: #F5F0EB; font-weight: bold; }
  .total-row td { font-weight: bold; background: #F5F0EB; }
</style>
</head>
<body>
<div class="header">
  <div>${logoHtml}</div>
  <div>
    <h1>PAYSLIP</h1>
    <div>${monStr} ${run.year}</div>
  </div>
</div>
<table style="margin-top:20px;">
  <tr><th>Employee Name</th><td>${entry.employee.full_name}</td></tr>
  <tr><th>Job Title</th><td>${entry.employee.job_title || '-'}</td></tr>
  <tr><th>Period</th><td>${monStr} ${run.year}</td></tr>
  <tr><th>Bank</th><td>${entry.employee.bank_name || '-'}</td></tr>
  <tr><th>Account Number</th><td>${entry.employee.bank_account_number || '-'}</td></tr>
</table>
<table style="margin-top:20px;">
  <tr><th>Description</th><th>Amount (RWF)</th></tr>
  <tr><td>Gross Salary</td><td style="text-align:right;">${fmt(entry.gross_salary)}</td></tr>
  <tr class="total-row"><td>NET SALARY</td><td style="text-align:right;">${fmt(entry.net_salary)}</td></tr>
</table>
</body>
</html>`;

  return { html, employeeName: entry.employee.full_name };
}

export async function downloadPayslipPdf(req: Request, res: Response) {
  const { runId, employeeId } = req.params;
  const doc = await buildPayslipHtml(runId, employeeId);
  if (!doc) return notFound(res, 'Payslip not found');

  const pdf = await renderPdf(doc.html);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Payslip-${doc.employeeName.replace(/\s+/g, '-')}.pdf"`);
  res.send(pdf);
}
