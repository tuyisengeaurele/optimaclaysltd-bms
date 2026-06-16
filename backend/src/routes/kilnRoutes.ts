import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listKilns, createKiln, updateKiln, deleteKiln } from '../controllers/kilnController';

const router = Router();

router.use(authenticate);

router.get('/', listKilns);
router.post('/', authorize('ADMIN', 'PRODUCTION_SUPERVISOR'), createKiln);
router.put('/:id', authorize('ADMIN', 'PRODUCTION_SUPERVISOR'), updateKiln);
router.delete('/:id', authorize('ADMIN'), deleteKiln);

export default router;
