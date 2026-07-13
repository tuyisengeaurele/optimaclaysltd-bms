import { Router } from 'express';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expenseController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('expense'));

router.get('/', listExpenses);
router.post('/', createExpense);
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT'), deleteExpense);

export default router;
