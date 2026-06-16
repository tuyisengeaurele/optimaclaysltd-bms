import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/expenseCategoryController';

const router = Router();

router.use(authenticate);

router.get('/', listCategories);
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), createCategory);
router.put('/:id', authorize('ADMIN', 'ACCOUNTANT'), updateCategory);
router.delete('/:id', authorize('ADMIN'), deleteCategory);

export default router;
