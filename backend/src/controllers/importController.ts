import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest } from '../utils/response';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

export async function importCustomers(req: Request, res: Response) {
  const { csv } = req.body;
  if (!csv) return badRequest(res, 'csv data is required');
  const rows = parseCSV(csv);
  if (rows.length === 0) return badRequest(res, 'No valid rows found in CSV');

  const required = ['customer_type', 'full_name'];
  const errors: string[] = [];
  const toCreate: any[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.customer_type) { errors.push(`Row ${rowNum}: customer_type is required`); return; }
    if (row.customer_type === 'INDIVIDUAL' && !row.full_name && !row.company_name) {
      errors.push(`Row ${rowNum}: full_name is required for individual`); return;
    }
    if (row.customer_type === 'COMPANY' && !row.company_name) {
      errors.push(`Row ${rowNum}: company_name is required for company`); return;
    }
    toCreate.push({
      customer_type: row.customer_type,
      full_name: row.full_name || null,
      company_name: row.company_name || null,
      tin_number: row.tin_number || null,
      phone: row.phone || null,
      location: row.location || null,
      notes: row.notes || null,
      credit_limit: row.credit_limit ? Number(row.credit_limit) : 0,
    });
  });

  if (errors.length > 0 && toCreate.length === 0) return badRequest(res, errors.join('; '));

  const created = await prisma.customer.createMany({ data: toCreate, skipDuplicates: true });
  return ok(res, { imported: created.count, errors });
}

export async function importEmployees(req: Request, res: Response) {
  const { csv } = req.body;
  if (!csv) return badRequest(res, 'csv data is required');
  const rows = parseCSV(csv);
  if (rows.length === 0) return badRequest(res, 'No valid rows found in CSV');

  const errors: string[] = [];
  const toCreate: any[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.full_name) { errors.push(`Row ${rowNum}: full_name is required`); return; }
    const wage_type = row.wage_type || 'MONTHLY';
    if (!['MONTHLY', 'DAILY', 'PIECE_RATE'].includes(wage_type)) {
      errors.push(`Row ${rowNum}: wage_type must be MONTHLY, DAILY, or PIECE_RATE`); return;
    }
    toCreate.push({
      full_name: row.full_name,
      national_id: row.national_id || null,
      phone: row.phone || null,
      job_title: row.job_title || null,
      wage_type,
      base_salary: row.base_salary ? Number(row.base_salary) : 0,
      bank_name: row.bank_name || null,
      bank_account_number: row.bank_account_number || null,
    });
  });

  if (errors.length > 0 && toCreate.length === 0) return badRequest(res, errors.join('; '));

  const created = await prisma.employee.createMany({ data: toCreate, skipDuplicates: true });
  return ok(res, { imported: created.count, errors });
}
