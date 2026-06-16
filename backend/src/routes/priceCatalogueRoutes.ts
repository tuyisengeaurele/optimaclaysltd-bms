import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listPrices, upsertPrice, deletePrice } from '../controllers/priceCatalogueController';

const router = Router();

router.use(authenticate);

router.get('/', listPrices);
router.post('/', authorize('ADMIN'), upsertPrice);
router.delete('/:id', authorize('ADMIN'), deletePrice);

export default router;
