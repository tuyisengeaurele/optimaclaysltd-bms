import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in .env');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL must be set in .env');
  process.exit(1);
}

import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import payrollRoutes from './routes/payrollRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import productionRoutes from './routes/productionRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import customerRoutes from './routes/customerRoutes';
import orderRoutes from './routes/orderRoutes';
import proformaRoutes from './routes/proformaRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import expenseRoutes from './routes/expenseRoutes';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import settingsRoutes from './routes/settingsRoutes';
import kilnRoutes from './routes/kilnRoutes';
import supplierRoutes from './routes/supplierRoutes';
import reconciliationRoutes from './routes/reconciliationRoutes';
import priceCatalogueRoutes from './routes/priceCatalogueRoutes';
import expenseCategoryRoutes from './routes/expenseCategoryRoutes';
import auditRoutes from './routes/auditRoutes';
import notificationRoutes from './routes/notificationRoutes';
import importRoutes from './routes/importRoutes';
import { errorHandler } from './middleware/errorHandler';
import { runNotificationChecks } from './controllers/notificationController';

const app = express();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV === 'production') {
      return cb(null, origin === process.env.FRONTEND_URL);
    }
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
    cb(null, isLocalhost);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/api/v1', apiLimiter);

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/kilns', kilnRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/reconciliations', reconciliationRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/proforma', proformaRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/expense-categories', expenseCategoryRoutes);
app.use('/api/v1/price-catalogue', priceCatalogueRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/import', importRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OPTIMA CLAYS API running on port ${PORT}`);
});

// Low stock and overdue invoice checks used to only run when someone had the
// app open, so a shortage or a missed payment could go unnoticed for days if
// nobody happened to visit. Run it on startup and then hourly regardless.
runNotificationChecks().catch(err => console.error('Notification check failed:', err));
setInterval(() => {
  runNotificationChecks().catch(err => console.error('Notification check failed:', err));
}, 60 * 60 * 1000);

export default app;
