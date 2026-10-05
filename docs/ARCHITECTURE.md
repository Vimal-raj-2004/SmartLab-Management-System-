# System Architecture Documentation

## Overview
**AI-Based Smart Computer Laboratory Management and Asset Monitoring System** is a full-stack, modular web application designed for engineering colleges and universities.

## Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v6.
- **Backend**: Python FastAPI, SQLAlchemy ORM, Pydantic v2, Bcrypt, PyJWT (`python-jose`).
- **Database**: PostgreSQL / Supabase PostgreSQL (Supports SQLite for instant zero-dependency local testing).
- **Authentication**: Stateless JSON Web Tokens (JWT) with HMAC-SHA256 and RBAC.

## Role Hierarchy & Permissions
1. **Admin**: Highest level privileges. User management, system configuration, asset tracking, reports.
2. **Faculty**: Lab schedule booking, curriculum workstation reservations, student attendance overview.
3. **Lab Assistant**: PC hardware diagnostics, peripheral tracking, maintenance issue tickets.
4. **Student**: Workstation availability status, complaint submission, lab session viewing.
