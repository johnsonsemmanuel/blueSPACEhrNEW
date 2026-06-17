# BlueSPACE Leave Management System

A standalone leave management application for BlueSPACE Africa.

## Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS + Framer Motion
- **Backend**: Node.js + Express + MySQL2
- **Auth**: JWT (bcrypt password verification)

## Prerequisites
- Node.js 18+
- MySQL/MariaDB running with the existing `bihlabsc_bluespacehrr` database

## Setup

### 1. Configure Database
Edit `server/.env` with your MySQL connection details:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bihlabsc_bluespacehrr
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Start the Application

**Terminal 1 - Backend API:**
```bash
npm run dev:server
```
Runs on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```
Runs on http://localhost:3000

### 4. Login
Open http://localhost:3000 and log in with existing user credentials from the database.

## Default Accounts (from existing DB)
| Name | Email | Type |
|------|-------|------|
| Emmanuel Johnson-Excellent | emmanuel@bluespaceafrica.com | Employee |
| Samuel Amanor | amanor.samuel@bluespaceafrica.com | Manager |
| Onyekachi (Super Admin) | onyekachi@bluespaceafrica.com | company |

## Roles
- **Staff** - Apply for leave, view balance, see calendar
- **Management** - Approve/reject leaves, manage leave types, view all employees

## Features
- Role-based login (Staff / Management)
- Leave application with balance validation
- Leave approval workflow
- Leave balance tracking
- Employee directory
- Leave calendar
- Leave type management
