import { Router } from 'express';
import { listRawMaterials, addRawMaterial, consumeRawMaterial, listFinishedGoods, addFinishedGoods, setThreshold } from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('inventory'));

router.get('/raw-materials', listRawMaterials);
router.post('/raw-materials', addRawMaterial);
router.post('/raw-materials/consume', consumeRawMaterial);
router.get('/finished-goods', listFinishedGoods);
router.post('/finished-goods', addFinishedGoods);
router.post('/thresholds', setThreshold);

export default router;
