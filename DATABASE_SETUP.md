# Database Setup Guide: Local MySQL & mysql2

This guide walks you through setting up and running the local MySQL database for the Campus Resource Allocation application.

---

## 1. Install and Start MySQL Locally

### Windows
- **Option A (MySQL Community Server & Installer):**
  1. Download the [MySQL Installer for Windows](https://dev.mysql.com/downloads/installer/).
  2. Run the installer and choose "Server only" or "Developer Default".
  3. During configuration, set your root password (e.g., empty or remember your chosen password) and default port `3306`.
  4. Ensure the MySQL Windows service is started (open `services.msc` and verify `MySQL80` / `MySQL` is Running).

- **Option B (XAMPP / Laragon):**
  - If using XAMPP, start the MySQL module from the XAMPP Control Panel.
  - If using Laragon, click "Start All".

### macOS (Homebrew)
```bash
brew install mysql
brew services start mysql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

---

## 2. Create the Database

Log in to the MySQL command line client:
```bash
mysql -u root -p
```
*(Press Enter if you do not have a password configured).*

Create the application database:
```sql
CREATE DATABASE IF NOT EXISTS campus_resource_allocation
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## 3. Import the SQL Schema

You can import the database schema using either of the following methods:

### Method A: Using the MySQL CLI
From the project root directory, run:
```bash
mysql -u root -p campus_resource_allocation < schema.sql
```

### Method B: Using MySQL Workbench / phpMyAdmin / DBeaver
1. Open your database management tool and connect to your local MySQL instance.
2. Open the file `schema.sql` located at the root of this project.
3. Execute the script to create all tables, indexes, enums, checks, and foreign key constraints.

### Method C: Using the Seed & Reset Script
The repository includes automated TypeScript scripts to reset and seed the database:
- **Full reset and demo seed (users, resources, hierarchies, sample requests, steps, allocations):**
  ```bash
  npm run db:reset
  ```
- **Minimal reset and seed (users, resources, hierarchies only):**
  ```bash
  npm run db:reset:minimal
  ```

---

## 4. Configure `.env.local`

Ensure your `.env.local` file contains the MySQL connection settings:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=campus_resource_allocation

# NextAuth Configuration
AUTH_SECRET=your_secret_key
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret

# Web Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@campus.edu
```

> **Note:** If your root user has no password, leave `DB_PASSWORD=` empty.

---

## 5. Install Dependencies

Ensure project dependencies are up-to-date:
```bash
npm install
```

---

## 6. Start the Next.js Application

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Verify Database Connection

To verify that your MySQL database connection works:
1. Run the database seed script:
   ```bash
   npm run db:reset
   ```
   If successful, you will see green checkmarks for table creation and data seeding.
2. Open [http://localhost:3000](http://localhost:3000) and sign in using one of the seeded demo accounts:
   - **Admin:** `admin@campus.edu` / `password123`
   - **Student:** `student@campus.edu` / `password123`
   - **Professor:** `faculty@campus.edu` / `password123`
   - **Coordinator:** `coordinator@campus.edu` / `password123`
   - **GenSec:** `gensec@campus.edu` / `password123`
   - **President:** `president@campus.edu` / `password123`
3. Navigate to:
   - `/dashboard/requests` to verify reading and submitting resource requests.
   - `/dashboard/approvals` to verify multi-level approval workflows.
   - `/dashboard/allocations` to view confirmed allocations.
   - `/dashboard/profile` to view and update user profile details.

