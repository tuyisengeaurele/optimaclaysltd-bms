import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listReconciliations, getReconciliation, createReconciliation } from '../controllers/reconciliationController';

const router = Router();

router.use(authenticate);

router.get('/', listReconciliations);
router.get('/:id', getReconciliation);
router.post('/', authorize('ADMIN', 'STORE_MANAGER'), createReconciliation);

export default router;
