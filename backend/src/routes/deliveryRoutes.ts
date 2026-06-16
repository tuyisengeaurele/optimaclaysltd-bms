import { Router } from 'express';
import { listDeliveries, createDelivery, updateDeliveryStatus, recordDamage, printWaybill, deleteDelivery } from '../controllers/deliveryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listDeliveries);
router.post('/', createDelivery);
router.get('/:id/waybill', printWaybill);
router.put('/:id/status', updateDeliveryStatus);
router.put('/:id/damage', recordDamage);
router.delete('/:id', authorize('ADMIN'), deleteDelivery);

export default router;
