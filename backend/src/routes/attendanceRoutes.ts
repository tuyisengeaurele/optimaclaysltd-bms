import { Router } from 'express';
import { listAttendance, createAttendance, updateAttendance, getMonthlySummary } from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', getMonthlySummary);
router.get('/', listAttendance);
router.post('/', authorize('ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT'), createAttendance);
router.put('/:id', authorize('ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT'), updateAttendance);

export default router;
