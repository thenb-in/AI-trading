# TECHNICAL_DOC.md — Deep Technical Documentation

> Architecture, data models, API reference, security design, and development conventions.

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌────────────────────┐     ┌───────────────────────────┐     ┌──────────────┐
│   React Frontend   │────▶│   Express API Server      │────▶│  PostgreSQL   │
│   (Vite + MUI)     │◀────│   (Node.js)               │◀────│  Database     │
│   Port: 5173       │     │   Port: configurable       │     │              │
└────────────────────┘     └───────────────────────────┘     └──────────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │  External Wallet API  │
                           │  (Activity sync)      │
                           └──────────────────────┘
```

### 1.2 Backend Architecture Pattern: MVC + Service Layer

```
Request → Routes → (Middleware) → Controllers → Services → Models → Database
                                      │
                                      ▼
                                   Views (Response Formatters)
```

**Key rules (enforced by .cursorrules):**
- **Models** may only be imported in services (one primary model per service)
- **Services** encapsulate business logic; they call models and other services
- **Controllers** handle HTTP request/response; they call services
- **Views** format service output into API responses
- **Middleware** handles cross-cutting concerns (auth, logging, validation)

### 1.3 Frontend Architecture

```
Pages → Components → Hooks → Context / Services
```

- **Pages** are route-level components
- **Components** are reusable UI blocks
- **Hooks** encapsulate stateful logic
- **Context** (DataContext/AuthContext) provides global state
- **Services** (ApiService) handle HTTP communication

### 1.4 Monorepo Structure

```
startup/
├── client/           # React SPA (Vite build)
├── server/           # Express API
├── scripts/          # Dev/build/lint utilities
├── tests/            # E2E + integration tests
├── deploy/           # Deployment configs (nginx, systemd)
├── db-scripts/       # Manual SQL migrations
└── .github/          # CI/CD workflows
```

---

## 2. Data Models

### 2.1 Entity Relationship Diagram (Logical)

```
User ──────┬──── many-to-one ────── Company
           │
           ├──── one-to-one ─────── UserProfile
           │
           ├──── many-to-one ────── Role
           │
           └──── one-to-many ────── MultiCompanyModule ──── many-to-one ── Company

Role ──────── many-to-many ──── Permission  (via RolePermission)

Company ───── many-to-many ──── Subscription (via CompanySubscription)

Subscription ─ many-to-many ── Permission  (via SubscriptionPermission)

Activity ──── many-to-one ────── User (createdBy)
NBnextDrive ── many-to-one ───── User (createdBy)
Layout ──────── many-to-one ───── User (user_id)
UserDefaultLayout ─ many-to-one ── User + Layout
```

### 2.2 Core Models

#### User
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| username | STRING | Unique, used for login |
| password | STRING | bcrypt hashed |
| name | STRING | Display name |
| phone | STRING | Contact number |
| company_id | FK → Company | Current active company |
| role_id | FK → Role | Assigned role |
| isActive | BOOLEAN | Soft-delete flag |
| is_approved | BOOLEAN | Admin approval status |
| isSupportUser | BOOLEAN | Support user flag |
| refresh_token | TEXT | Current refresh token (null = revoked) |
| last_active | DATE | Null = first login pending |
| is_totp_enabled | BOOLEAN | 2FA enabled flag |
| totp_secret | STRING | Encrypted TOTP secret |
| mobileApp | BOOLEAN | Device access: mobile app |
| desktopWeb | BOOLEAN | Device access: desktop web |
| mobileWeb | BOOLEAN | Device access: mobile web |

#### Company
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | UUIDV4 default or custom |
| name | STRING | Company display name |
| mobileApp | BOOLEAN | Default device policy |
| desktopWeb | BOOLEAN | Default device policy |
| mobileWeb | BOOLEAN | Default device policy |

#### Role
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| name | STRING | Role name (unique per scope) |
| description | STRING | Optional description |
| companyId | FK → Company | Null = global role |

#### Permission
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| name | STRING | Permission key (e.g., "User.delete") |
| display_name | STRING | Human-readable name |
| description | STRING | Description |
| type | STRING | Category: "master" or "module" |

#### Activity
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| head | STRING | Category label (e.g., "User") |
| log | TEXT | Human-readable description |
| objectName | STRING | Related entity type |
| objectId | STRING | Related entity ID |
| createdBy | FK → User | Who performed the action |
| companyId | FK → Company | Company scope |
| type | INTEGER | 0=create, 1=update, 2=delete |
| isConfirmed | BOOLEAN | External sync status |
| timestamp | DATE | When the action occurred |

#### NBnextDrive
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| fileName | STRING | Original file name |
| filePath | STRING | Relative path on disk |
| fileSize | INTEGER | Size in bytes |
| mimeType | STRING | MIME type |
| objectName | STRING | Associated entity type |
| objectId | STRING | Associated entity ID |
| createdBy | FK → User | Uploader |
| companyId | FK → Company | Company scope |

#### Layout / UserDefaultLayout
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER (PK) | Auto-increment |
| document_name | STRING | Which data grid this layout applies to |
| layout_name | STRING | User-given name |
| type | STRING | "private" or "public" |
| column_config | JSON | Column visibility, order, widths |
| user_id | FK → User | Owner |
| company_id | FK → Company | Company scope |

---

## 3. API Reference

**Base URL:** `/api/v1`

### 3.1 Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | No | Register a new user |
| POST | `/login` | No | Login and receive tokens |
| POST | `/logout` | Yes | Revoke refresh token |
| POST | `/reset-password` | No | Reset password (with optional OTP) |
| POST | `/approve/:userId` | Yes | Admin approves a user |
| GET | `/roles` | Yes | List available roles |
| POST | `/generate-totp-secret` | Yes | Generate TOTP secret + QR |
| POST | `/verify-totp` | Yes | Verify TOTP code and enable 2FA |

### 3.2 Users (`/api/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List all users in current company |
| GET | `/me` | Yes | Get current user profile |
| POST | `/:userId/deactivate` | Yes + Permission | Deactivate a user |
| DELETE | `/:userId` | Yes + Permission | Delete a user |
| PUT | `/:userId/role` | Yes | Update user's role |
| PUT | `/:userId/deviceAccess` | Yes | Update device access flags |
| POST | `/userProfile` | Yes | Update user profile |

### 3.3 Company (`/api/v1/company`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | Yes + Permission | Get company settings |
| PUT | `/settings` | Yes + Permission | Update company settings |
| POST | `/create` | Yes + Permission | Create a new company |
| GET | `/my` | Yes | List user's companies |
| POST | `/switch` | Yes | Switch active company |
| POST | `/initial` | Yes | Create first company (onboarding) |
| POST | `/join` | Yes | Join an existing company |

### 3.4 Admin (`/api/v1/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/roles` | Yes + Admin | List roles with permissions |
| POST | `/roles` | Yes + Admin | Create a role |
| GET | `/permissions` | Yes + Admin | List all permissions |
| POST | `/permissions` | Yes + Admin | Create a permission |
| DELETE | `/permissions/:permissionId` | Yes + Admin | Delete a permission |
| POST | `/role-permissions/add` | Yes + Admin | Add permissions to a role |
| POST | `/role-permissions/remove` | Yes + Admin | Remove permission from a role |
| GET | `/users/sadmin` | Yes + Admin | List super admin users |
| GET | `/companies` | Yes + Admin | List all companies |
| POST | `/assign-user` | Yes + Admin | Assign user to company |
| POST | `/remove-user` | Yes + Admin | Remove user from company |
| GET | `/companies/:companyId/users` | Yes + Admin | List users in a company |

### 3.5 Layouts (`/api/v1/layouts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/document/:document_name` | Yes | Get layouts for a document |
| GET | `/layout/:layout_id` | Yes | Get a specific layout |
| POST | `/create-or-update-layout` | Yes | Create or update a layout |
| DELETE | `/layout/:layout_id` | Yes | Delete a layout |
| POST | `/set-default` | Yes | Set layout as default |
| POST | `/unset-default` | Yes | Remove default layout |

### 3.6 Activity (`/api/v1/activity`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List activities (with pagination) |
| GET | `/:head` | Yes | Filter activities by head/category |

### 3.7 NBnext Drive (`/api/v1/nbnext-drive`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List all files |
| GET | `/:id` | Yes | Get file metadata |
| POST | `/upload` | Yes | Upload a file |
| DELETE | `/:id` | Yes | Delete a file |
| GET | `/:id/download` | Yes | Download/stream a file |
| GET | `/object/:objectName/:objectId` | Yes | Files by associated object |

### 3.8 Help & Support (`/api/v1/help-support`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/open-ticket` | Yes | Submit a support ticket |

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
Login → bcrypt verify → JWT Access Token (short-lived) + Refresh Token (long-lived)
                         ↓
                    httpOnly cookies (secure in production)
                         ↓
             Each request: validate access token
                         ↓ (expired?)
             Rotate refresh token (with DB lock to prevent race conditions)
                         ↓
             New access + refresh tokens set in cookies
```

### 4.2 Token Security

- **Access tokens:** Short-lived (configurable via `JWT_ACCESS_EXPIRATION`), contain user ID and company ID
- **Refresh tokens:** Longer-lived, stored in database for revocation capability
- **Token rotation:** Every refresh rotates both tokens; old refresh token is invalidated
- **Concurrent request handling:** Deferred promise pattern with lock map prevents duplicate token rotations
- **Cookie settings:** `httpOnly`, `sameSite: strict`, `secure` in production
- **Mobile support:** Tokens also exposed via response headers (`x-new-access-token`, `x-new-refresh-token`) for React Native clients

### 4.3 Authorization Layers

1. **Route-level middleware** (`protect`): Validates JWT, refreshes if needed
2. **Admin middleware** (`admin`): Checks for "Admin" permission
3. **Permission middleware** (`requirePermission`): Checks for specific named permissions
4. **Controller-level checks**: `allowedPermissions()` utility for fine-grained checks
5. **Support user flag**: `isSupportUser` on User model for system-level operations

### 4.4 Security Headers & Middleware

- **Helmet.js** for HTTP security headers
- **CORS** configured for specific frontend origin only
- **express-validator** for input validation
- **dotenv-safe** ensures all required environment variables are present

---

## 5. Development Conventions

### 5.1 Code Organization Rules (from .cursorrules)

- **File length:** Warning at 300 lines, error at 500 lines
- **Function length:** Warning at 100 lines
- **Cyclomatic complexity:** Warning at 10
- **Naming:** snake_case directories, PascalCase models, camelCase functions
- **Model imports:** Only in services; one primary model per service
- **Constants:** Must live in `constants/` directory, never inline
- **IDs:** UUID for auth-related models, integer for regular models

### 5.2 Startup Framework Separation

```
server/src/
├── controllers/
│   ├── startup/        ← Reusable (template) controllers
│   └── *.js           ← App-specific controllers
├── services/
│   ├── startup/        ← Reusable services
│   └── *.js           ← App-specific services
└── models/
    ├── startup/        ← Reusable models
    └── *.js           ← App-specific models
```

Same pattern applies to client: `components/startup/`, `pages/startup/`, `services/startup/`, etc.

### 5.3 Git Conventions

- **Commit format:** Conventional Commits enforced by commitlint
- **Hooks:** Husky pre-commit (lint-staged), commit-msg (commitlint), pre-push (validation)
- **Supported types:** `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `build`

### 5.4 Environment Configuration

All environment variables are centralized in:
- **Server:** `server/src/config/env.js` (reads from `.env` via `dotenv-safe`)
- **Client:** accessed via `import.meta.env.VITE_*`

Required server variables include: `NODE_ENV`, `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, JWT expiration settings, TOTP settings.

---

## 6. Database Configuration

### 6.1 Sequelize Setup

- **ORM:** Sequelize v6.37.7
- **Dialect:** PostgreSQL (configurable via `DB_DIALECT`)
- **Connection:** URL-based (`DATABASE_URL`) or individual credentials
- **Naming:** `underscored: true` — automatic snake_case column names
- **Sync:** Auto-sync in non-production (with `alter: false`); manual migrations in production
- **Logging:** SQL queries logged at `silly` level via Winston

### 6.2 Model Loading

Models are dynamically loaded from the `models/` directory:
1. Scan subdirectories (excluding `abstract_` and `base` prefixes)
2. Load `.js` files from each subdirectory
3. Load `.js` files from the root `models/` directory
4. Call `associate()` on each model to set up relationships

---

## 7. Logging

### 7.1 Winston Configuration

- **Transports:** Console + daily rotating file
- **Levels:** error, warn, info, http, debug, silly
- **Format:** Timestamp + level + message + metadata
- **HTTP logging:** Custom middleware logs method, path, IP, status, and response time

---

## 8. CI/CD

### 8.1 GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lint.yml` | Push/PR | Run ESLint on client + server |
| `client_prod_build.yml` | Manual/tag | Build client for production |
| `server_dev_test.yml` | Push/PR | Run server tests |

---

## 9. Deployment

### 9.1 Production Setup

- **Nginx** reverse proxy configuration provided (`deploy/base.conf`)
- **systemd** service file for process management (`deploy/base.service`)
- **Build scripts** for packaging (`deploy/1build_deploy_files.sh`)
- **Static file serving** for client build

---

*See [APPLICATION_DOC.md](./APPLICATION_DOC.md) for business context and [USER_DOCS.md](./USER_DOCS.md) for feature usage guides.*
