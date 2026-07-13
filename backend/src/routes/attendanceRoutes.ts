import { Router } from 'express';
import { listAttendance, createAttendance, updateAttendance, getMonthlySummary } from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);
router.use(auditLog('attendance'));

router.get('/summary', getMonthlySummary);
router.get('/', listAttendance);
router.post('/', authorize('ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT'), createAttendance);
router.put('/:id', authorize('ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT'), updateAttendance);

export default router;
