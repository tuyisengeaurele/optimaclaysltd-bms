import { Router } from 'express';
import { listBatches, createBatch, updateBatch, deleteBatch, getStats } from '../controllers/productionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listBatches);
router.get('/stats', getStats);
router.post('/', createBatch);
router.put('/:id', updateBatch);
router.delete('/:id', authorize('ADMIN', 'PRODUCTION_SUPERVISOR'), deleteBatch);

export default router;
