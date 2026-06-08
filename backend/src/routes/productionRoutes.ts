import { Router } from 'express';
import { listBatches, createBatch, updateBatch, getStats } from '../controllers/productionController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listBatches);
router.get('/stats', getStats);
router.post('/', createBatch);
router.put('/:id', updateBatch);

export default router;
