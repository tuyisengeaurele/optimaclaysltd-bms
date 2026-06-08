import { Router } from 'express';
import { listAttendance, createAttendance, updateAttendance, getMonthlySummary } from '../controllers/attendanceController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listAttendance);
router.post('/', createAttendance);
router.put('/:id', updateAttendance);
router.get('/summary', getMonthlySummary);

export default router;
