import { Router } from 'express';
import { listDeliveries, createDelivery, updateDeliveryStatus } from '../controllers/deliveryController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listDeliveries);
router.post('/', createDelivery);
router.put('/:id/status', updateDeliveryStatus);

export default router;
