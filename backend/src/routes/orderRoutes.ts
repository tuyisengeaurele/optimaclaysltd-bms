import { Router } from 'express';
import { listOrders, createOrder, getOrder, updateOrderStatus } from '../controllers/orderController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listOrders);
router.post('/', createOrder);
router.get('/:id', getOrder);
router.put('/:id/status', updateOrderStatus);

export default router;
