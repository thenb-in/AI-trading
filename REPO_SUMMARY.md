# REPO_SUMMARY.md — One-Page Repository Summary

---

## Identity

| Field | Value |
|-------|-------|
| **Name** | NB Next — Starter Application Template |
| **Version** | 1.0.35 (monorepo) |
| **Type** | Full-stack web application template |
| **License** | Private |
| **Primary Language** | JavaScript (Node.js + React) |

---

## Purpose

A production-ready monorepo template providing authentication, multi-tenant company management, role-based access control, file storage, audit logging, and an admin dashboard — so new projects can skip boilerplate and focus on business logic.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + Material-UI + Tailwind CSS |
| **Backend** | Express 5 + Sequelize ORM |
| **Database** | PostgreSQL |
| **Auth** | JWT (access + refresh tokens) + bcrypt + TOTP |
| **Real-time** | Socket.io (scaffolded) |
| **Quality** | ESLint (custom rules) + Prettier + Husky + Commitlint |
| **CI/CD** | GitHub Actions |

---

## Structure

```
startup/
├── client/     → React SPA (157+ source files)
├── server/     → Express API (80+ source files)
├── scripts/    → Build/dev utilities (11 scripts)
├── tests/      → E2E + integration test scaffolding
├── deploy/     → nginx + systemd configs
└── db-scripts/ → Manual SQL migrations
```

---

## Key Features

- JWT authentication with token rotation and concurrent request deduplication
- TOTP-based two-factor authentication
- Multi-company support with company switching
- Role-based access control with global and company-specific roles
- Admin dashboard (users, roles, permissions, subscriptions, audit log)
- File management (NBnext Drive) with company-scoped access
- Customizable data grid layouts per user
- In-app help & support ticket system
- Global search palette
- Activity audit logging with external sync
- Device access control (desktop/mobile web/mobile app)

---

## Architecture Pattern

```
Routes → Middleware (auth, permissions) → Controllers → Services → Models → PostgreSQL
```

- **Startup framework:** Generic code in `startup/` dirs, app-specific code outside
- **Model access rule:** Models only imported in services; one primary model per service
- **Config:** Centralized env config via `dotenv-safe`

---

## Maturity Assessment

| Area | Status |
|------|--------|
| Core functionality | Stable |
| Authentication | Production-ready (with minor log-hygiene fixes needed) |
| Authorization | Functional (some permission checks commented out) |
| Testing | Scaffolding present, test coverage is low |
| Documentation | Generated (this set) + existing setup guides |
| CI/CD | Basic linting and build workflows |
| Security | Good foundation, needs hardening (rate limiting, input validation) |

---

## Quick Start

```bash
npm install
cp server/.env.example server/.env   # Configure database + secrets
cp client/.env.example client/.env   # Configure API URL
npm run dev                           # Start client + server
```

---

## Issue Summary

| Priority | Count | Category |
|----------|-------|----------|
| P0 (Critical) | 1 | Hardcoded config |
| P1 (High) | 5 | Disabled security checks, missing validation |
| P2 (Medium) | 11 | Performance, architecture, security |
| P3 (Low) | 5 | Cleanup, dead code |

---

## Documentation Index

| Document | Content |
|----------|---------|
| [index.md](./index.md) | Entry point, overview, quick start |
| [APPLICATION_DOC.md](./APPLICATION_DOC.md) | Business & functional documentation |
| [TECHNICAL_DOC.md](./TECHNICAL_DOC.md) | Architecture, models, API reference |
| [USER_DOCS.md](./USER_DOCS.md) | End-user feature guides |
| [TODO.md](./TODO.md) | Actionable issues and improvements |
| [ROADMAP.md](./ROADMAP.md) | Project evolution plan |

---

*Auto-generated from full codebase analysis.*
