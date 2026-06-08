import { Router } from 'express';
import { listOrders, createOrder, getOrder, updateOrderStatus, deleteOrder } from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listOrders);
router.post('/', createOrder);
router.get('/:id', getOrder);
router.put('/:id/status', updateOrderStatus);
router.delete('/:id', authorize('ADMIN'), deleteOrder);

export default router;
