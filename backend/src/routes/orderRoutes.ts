import { Router } from 'express';
import { listOrders, createOrder, getOrder, updateOrder, updateOrderStatus, deleteOrder, getCustomerStatement } from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listOrders);
router.post('/', createOrder);
router.get('/statement/:customerId', getCustomerStatement);
router.get('/:id', getOrder);
router.put('/:id', updateOrder);
router.put('/:id/status', updateOrderStatus);
router.delete('/:id', authorize('ADMIN'), deleteOrder);

export default router;
