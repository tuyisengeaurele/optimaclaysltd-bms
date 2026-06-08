import { Router } from 'express';
import { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
