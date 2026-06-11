# OPTIMA CLAYS LTD — Business Management System

A full-stack internal management system built for Optima Clays Ltd, a clay brick manufacturer based in Muhanga, Rwanda. The system covers the full business cycle: production, inventory, sales, deliveries, invoicing, payroll, and financial reporting — all in one place.

---

## Features

**Production & Inventory**
- Track daily production batches by shift, kiln, and stage
- Manage raw material stock and consumption with low-stock alerts
- Record finished goods inventory by brick type and quality grade

**Sales & Orders**
- Customer directory (individuals and companies with TIN support)
- Order management with status tracking
- Proforma invoice generation with professional print output
- Invoice creation and payment recording with overpayment protection
- Delivery scheduling and status tracking

**Finance**
- Expense tracking by category
- Revenue vs expenses dashboard with 6-month chart
- Excel export for payroll and financial reports

**HR & Payroll**
- Employee directory with wage type support (monthly, daily, piece rate)
- Attendance logging with monthly summaries
- Payroll run creation, entry editing, finalization, and payslip printing

**System**
- Role-based access control (Admin, Production Supervisor, Sales Officer, Store Manager, Accountant)
- JWT authentication with httpOnly cookies and refresh token rotation
- Company profile settings (TIN, bank details, director name, default payment terms)
- User management by Admin

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Security | Helmet, CORS, express-rate-limit, bcrypt (12 rounds) |
| Exports | ExcelJS (payroll/reports), HTML print (proforma, payslip) |

---

## Project Structure

```
optima-clays/
├── backend/
│   ├── assets/              # logo.png for print templates
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── controllers/     # one file per resource
│       ├── middleware/       # auth, errorHandler
│       ├── routes/          # one file per resource
│       ├── lib/             # Prisma singleton
│       └── utils/           # response helpers
└── frontend/
    ├── public/              # logo.png served by Vite
    └── src/
        ├── components/      # layout, ui primitives
        ├── context/         # AuthContext
        ├── pages/           # one file per page
        ├── services/        # axios API layer
        └── types/           # shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/tuyisengeaurele/optimaclaysltd-bms.git
cd optimaclaysltd-bms
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/optimaclays
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
PORT=5000
NODE_ENV=development
```

Push the schema and seed the admin user:

```bash
npm run db:push
npm run db:seed
```

Start the dev server:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Default Credentials

After running the seed, log in with:

```
Email:    admin@optimaclays.rw
Password: Admin@1234
```

Change the password immediately after first login.

---

## Available Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled production build |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed the admin user |
| `npm run db:studio` | Open Prisma Studio (database browser) |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |

---

## API Overview

All endpoints are prefixed with `/api/v1`. Every request except login requires a valid JWT cookie.

| Resource | Base path |
|---|---|
| Auth | `/auth` |
| Employees | `/employees` |
| Attendance | `/attendance` |
| Payroll | `/payroll` |
| Production | `/production` |
| Inventory | `/inventory` |
| Customers | `/customers` |
| Orders | `/orders` |
| Proforma Invoices | `/proforma` |
| Invoices | `/invoices` |
| Payments | `/payments` |
| Deliveries | `/deliveries` |
| Expenses | `/expenses` |
| Reports | `/reports` |
| Dashboard | `/dashboard` |
| Settings | `/settings` |

---

## User Roles

| Role | Access |
|---|---|
| `ADMIN` | Full access including user management and company settings |
| `PRODUCTION_SUPERVISOR` | Production batches, inventory, attendance |
| `SALES_OFFICER` | Customers, orders, proformas, invoices, deliveries |
| `STORE_MANAGER` | Inventory, deliveries |
| `ACCOUNTANT` | Employees, payroll, invoices, expenses, financials, reports |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |
| `PORT` | No | API port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Production only | Allowed CORS origin in production |

Company details (TIN, bank account, director name, etc.) are stored in the database and managed through the Settings page — not through environment variables.

---

## License

Private. All rights reserved — Optima Clays Ltd.
