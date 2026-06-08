import { Request, Response } from 'express';
import { MaterialType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ok, created, notFound } from '../utils/response';



export async function listRawMaterials(req: Request, res: Response) {
  const stocks = await prisma.rawMaterialStock.findMany({ orderBy: { date: 'desc' } });
  const consumptions = await prisma.rawMaterialConsumption.findMany();
  const thresholds = await prisma.stockThreshold.findMany();

  // Calculate current stock per material
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
  return ok(res, stocks);
}

export async function addFinishedGoods(req: Request, res: Response) {
  const stock = await prisma.finishedGoodsStock.create({ data: req.body });
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
