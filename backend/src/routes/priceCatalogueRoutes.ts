import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { listPrices, upsertPrice, deletePrice } from '../controllers/priceCatalogueController';

const router = Router();

router.use(authenticate);
router.use(auditLog('price_catalogue'));

router.get('/', listPrices);
router.post('/', authorize('ADMIN'), upsertPrice);
router.delete('/:id', authorize('ADMIN'), deletePrice);

export default router;
