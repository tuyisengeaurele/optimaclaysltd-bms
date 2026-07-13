import { Router } from 'express';
import { listBatches, createBatch, updateBatch, completeBatch, deleteBatch, getStats } from '../controllers/productionController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('production'));

router.get('/', listBatches);
router.get('/stats', getStats);
router.post('/', createBatch);
router.put('/:id', updateBatch);
router.put('/:id/complete', completeBatch);
router.delete('/:id', authorize('ADMIN', 'PRODUCTION_SUPERVISOR'), deleteBatch);

export default router;
