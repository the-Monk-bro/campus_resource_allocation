# Campus Resource Allocation System (CRAS)

A database-centric, multi-tier reservation and governance platform designed for high-contention campus infrastructure (auditoriums, computing labs, lecture amphitheaters, seminar halls, and sports complexes).

Built for the **CS257: Database and Information Systems** course, CRAS implements a **Database-First / Thick Database Architecture** where MySQL 8.0 acts as the single source of truth—executing ACID transactions, pessimistic concurrency locks, autonomous trigger state machines, declarative domain constraints, and automated lifecycle schedulers.

---

## 🚀 Key Highlights & Database Features

- **Pessimistic Concurrency Control**: Prevents double-booking race conditions during simultaneous reservation requests using row-level exclusive locks (`SELECT ... FOR UPDATE`) in `sp_create_resource_request`.
- **Autonomous Trigger State Machine**: Multi-level sequential approvals are enforced at the database level (`trg_enforce_sequential_approval`). Final-level approval automatically promotes the request to `APPROVED` and generates a confirmed allocation record (`trg_approval_step_after_update`).
- **Declarative Domain Integrity**: Strict mathematical `CHECK` constraints on table definitions guarantee temporal bounds (`endtime > starttime`), valid contact numbers (10-digit regex), and valid email syntax.
- **Double-Booking Defense**: An explicit `BEFORE INSERT` trigger on allocations (`trg_prevent_allocation_overlap`) checks `fn_check_resource_availability`, physically preventing overlapping bookings from ever existing in the storage engine.
- **Automated Lifecycle Sweeps**: Background event scheduler (`evt_auto_complete_allocations`) runs every 15 minutes calling `sp_update_allocation_statuses` to advance bookings:
  $$\text{SCHEDULED} \longrightarrow \text{ONGOING} \longrightarrow \text{COMPLETED}$$
- **Analytical & Operational Views**: 6 formal relational views in `sql/views.sql` providing real-time data abstraction, capacity utilization metrics, and step-by-step audit trails.

---

## 🛠️ Tech Stack

- **Application Tier**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with multi-role RBAC and Scope bindings
- **Database Engine**: [MySQL 8.0+](https://www.mysql.com/) (InnoDB Storage Engine)
- **Database Driver**: `mysql2/promise` (Dedicated connection pools, raw parameterized SQL statements, zero ORM overhead)
- **Language**: TypeScript, Procedural SQL (Triggers, Stored Procedures, Functions, Events, Views)

---

## 📦 Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v18.18.0` or later (`v20+` recommended)
- **MySQL Server**: `v8.0` or later running on port `3306`

### 1. Clone the Repository
```bash
git clone https://github.com/the-Monk-bro/campus_resource_allocation.git
cd campus_resource_allocation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=campus_resource_allocation

# NextAuth Configuration
AUTH_SECRET=your_super_secret_key_minimum_32_characters_long
NEXTAUTH_URL=http://localhost:3000
```
*(Leave `DB_PASSWORD=` empty if your local root user has no password).*

### 4. Initialize Database & Seed Demo Data
CRAS includes automated database initialization scripts that drop and recreate the schema, compile all triggers, stored procedures, functions, events, views, and populate realistic test data:

```bash
# Full reset and demo seed (users, roles, resources, sample requests, approvals, allocations):
npm run db:reset

# Or minimal reset (schema, rules, and core entities without sample transactions):
npm run db:reset:minimal
```

*(Ensure the MySQL Event Scheduler is enabled on your server by running `SET GLOBAL event_scheduler = ON;` in MySQL).*

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Accounts

All seeded demo accounts use the default password: **`password123`**

| Role / Designation | Scope / Department | Email Address | Access Level |
|---|---|---|---|
| **CRAS Admin** | Campus-Wide (CRAS) | `admin.cras@campus.edu` | Full System Admin (`/admin`) |
| **HOD CSE** | Department of CSE | `admin@campus.edu` | Approver (HOD Tier) |
| **Faculty Advisor** | Electrical Engg / Club | `faculty@campus.edu` | Approver (Advisor Tier) |
| **Student** | CSE (TA CS257) | `student@campus.edu` | Requester & TA Approver |
| **Club Coordinator** | Coding Club & ME | `coordinator@campus.edu` | Requester |
| **General Secretary** | Institute Admin | `gensec@campus.edu` | Executive Approver |
| **President Gymkhana**| Campus Gymkhana | `president@campus.edu` | Final Tier Approver |
| **Staff Officer** | School of Innovation | `staff@campus.edu` | Facility Manager |

---

## 📂 Project Structure

```
campus_resource_allocation/
├── actions/                  # Next.js Server Actions (Lightweight SQL wrappers)
│   ├── allocationAction.ts   # Calls sp_update_allocation_statuses
│   ├── approvalActions.ts    # Calls sp_process_approval_action
│   └── requestActions.ts     # Calls sp_create_resource_request & sp_cancel_request
├── app/                      # Next.js App Router (Pages, Layouts & Admin Console)
│   ├── admin/                # System administration (resources, users, roles)
│   ├── dashboard/            # User portal (facilities, requests, approvals, allocations)
│   └── api/auth/             # NextAuth authentication endpoints
├── components/               # Reusable React components (Tailwind UI)
├── lib/                      # Core helpers (mysql2 connection pool, NextAuth config)
├── scripts/                  # Automated database management scripts
│   ├── reset-db.ts           # Full schema reset, procedures, triggers, views & demo seed
│   └── reset-db-minimal.ts   # Minimal reset script
├── sql/                      # Relational Database Engine Definitions
│   ├── procedures_approval.sql # sp_process_approval_action
│   ├── procedures_request.sql  # sp_create_resource_request, sp_cancel_request
│   ├── triggers_approval.sql   # Workflow progression & sequential guards
│   ├── integrity.sql           # Overlap prevention trigger, stored functions, event
│   └── views.sql               # 6 analytical, operational & governance views
├── schema.sql                # Normalized 3NF/BCNF DDL with CHECK & FK constraints
└── DATABASE_SETUP.md         # Detailed manual database deployment instructions
```

---

## 🧪 Building for Production

To create an optimized production build:
```bash
npm run build
npm start
```
