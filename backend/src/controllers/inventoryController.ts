import { Request, Response } from 'express';
import { MaterialType, BrickType, QualityGrade } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ok, created, notFound, badRequest } from '../utils/response';

export async function listRawMaterials(req: Request, res: Response) {
  const stocks = await prisma.rawMaterialStock.findMany({ orderBy: { date: 'desc' } });
  const consumptions = await prisma.rawMaterialConsumption.findMany();
  const thresholds = await prisma.stockThreshold.findMany();

  const types = Object.values(MaterialType);
  const summary = types.map(type => {
    const totalIn = stocks.filter(s => s.material_type === type).reduce((s, r) => s + r.quantity, 0);
    const totalOut = consumptions.filter(c => c.material_type === type).reduce((s, r) => s + r.quantity_used, 0);
    const current = totalIn - totalOut;
    const threshold = thresholds.find(t => t.material_type === type);
    return {
      material_type: type,
      current_stock: current,
      unit: threshold?.unit || stocks.find(s => s.material_type === type)?.unit || 'kg',
      threshold: threshold?.threshold || 0,
      is_low: threshold ? current <= threshold.threshold : false,
    };
  });

  return ok(res, { stocks, summary });
}

export async function addRawMaterial(req: Request, res: Response) {
  const { material_type, quantity, unit, unit_cost, total_cost, supplier, date, notes } = req.body;
  const stock = await prisma.rawMaterialStock.create({
    data: { material_type, quantity: Number(quantity), unit, unit_cost: Number(unit_cost), total_cost: Number(total_cost), supplier, date: new Date(date), notes },
  });
  return created(res, stock);
}

export async function consumeRawMaterial(req: Request, res: Response) {
  const { material_type, quantity_used, date, notes } = req.body;
  const consumption = await prisma.rawMaterialConsumption.create({
    data: { material_type, quantity_used: Number(quantity_used), date: new Date(date), notes },
  });
  return created(res, consumption);
}

export async function listFinishedGoods(req: Request, res: Response) {
  const stocks = await prisma.finishedGoodsStock.findMany({ orderBy: { date: 'desc' } });

  const summary = new Map<string, { brick_type: string; quality_grade: string; current_stock: number }>();
  for (const s of stocks) {
    const key = `${s.brick_type}::${s.quality_grade}`;
    const existing = summary.get(key);
    if (existing) {
      existing.current_stock += s.quantity;
    } else {
      summary.set(key, { brick_type: s.brick_type, quality_grade: s.quality_grade, current_stock: s.quantity });
    }
  }

  return ok(res, { stocks, summary: Array.from(summary.values()) });
}

// Total units currently on hand for a brick type and grade, summed across every stock entry
export async function getAvailableStock(brick_type: BrickType, quality_grade: QualityGrade): Promise<number> {
  const result = await prisma.finishedGoodsStock.aggregate({
    where: { brick_type, quality_grade },
    _sum: { quantity: true },
  });
  return result._sum.quantity || 0;
}

export async function addFinishedGoods(req: Request, res: Response) {
  const { brick_type, quality_grade, quantity, date, notes } = req.body;
  if (!brick_type || quantity == null) return badRequest(res, 'brick_type and quantity are required');
  if (!quality_grade) return badRequest(res, 'quality_grade is required');
  const stock = await prisma.finishedGoodsStock.create({
    data: {
      brick_type,
      quality_grade,
      quantity: Number(quantity),
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
    },
  });
  return created(res, stock);
}

export async function setThreshold(req: Request, res: Response) {
  const { material_type, threshold, unit } = req.body;
  const t = await prisma.stockThreshold.upsert({
    where: { material_type },
    update: { threshold, unit },
    create: { material_type, threshold, unit },
  });
  return ok(res, t);
}
