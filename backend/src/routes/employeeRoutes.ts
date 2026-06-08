import { Router } from 'express';
import { listEmployees, createEmployee, getEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listEmployees);
router.post('/', createEmployee);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
