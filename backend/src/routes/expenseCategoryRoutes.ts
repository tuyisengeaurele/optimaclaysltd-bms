import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/expenseCategoryController';

const router = Router();

router.use(authenticate);
router.use(auditLog('expense_category'));

router.get('/', listCategories);
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), createCategory);
router.put('/:id', authorize('ADMIN', 'ACCOUNTANT'), updateCategory);
router.delete('/:id', authorize('ADMIN'), deleteCategory);

export default router;
