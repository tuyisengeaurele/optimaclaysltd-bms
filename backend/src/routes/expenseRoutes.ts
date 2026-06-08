import { Router } from 'express';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expenseController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listExpenses);
router.post('/', createExpense);
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT'), deleteExpense);

export default router;
