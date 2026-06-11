import { Router } from 'express';
import { listEmployees, createEmployee, getEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), createEmployee);
router.put('/:id', authorize('ADMIN', 'ACCOUNTANT'), updateEmployee);
router.delete('/:id', authorize('ADMIN'), deleteEmployee);

export default router;
