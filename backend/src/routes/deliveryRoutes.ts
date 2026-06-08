import { Router } from 'express';
import { listDeliveries, createDelivery, updateDeliveryStatus, deleteDelivery } from '../controllers/deliveryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listDeliveries);
router.post('/', createDelivery);
router.put('/:id/status', updateDeliveryStatus);
router.delete('/:id', authorize('ADMIN'), deleteDelivery);

export default router;
