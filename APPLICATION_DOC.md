# APPLICATION_DOC.md — Business & Functional Documentation

> This document describes **what** NB Next does from a business and product perspective.

---

## 1. Product Overview

NB Next is a full-stack starter template designed to eliminate repetitive setup work when building new web applications. It ships with a complete authentication system, multi-tenant company management, role-based access control, file storage, audit logging, and an admin dashboard — all wired together and ready for customization.

The template follows a **"startup" framework** pattern: generic, reusable features live inside `startup/` directories, while application-specific code lives outside them. This separation allows the template to be reused across many different projects.

---

## 2. Core Business Modules

### 2.1 Authentication & Account Management

**Purpose:** Secure user registration, login, and session management.

| Capability | Details |
|-----------|---------|
| User signup | Username/password registration with optional company link |
| Login | JWT-based with access + refresh token rotation |
| Two-Factor Auth | TOTP via authenticator apps (Google Authenticator, Authy) |
| Password reset | Self-service with OTP verification or admin-approval flow |
| Account approval | New signups require admin approval before access is granted |
| First-login flow | Forces password change on first login |
| Session management | Secure httpOnly cookies, automatic token refresh, concurrent request deduplication |
| Logout | Server-side token revocation + cookie clearing |

### 2.2 Company Management (Multi-Tenancy)

**Purpose:** Support multiple organizations within a single deployment.

| Capability | Details |
|-----------|---------|
| Company creation | Users can create companies during onboarding or from admin |
| Company switching | Users linked to multiple companies can switch active company |
| Join company | Users can join an existing company by ID |
| Initial company setup | First-time users without a company are guided through creation |
| Company settings | Name, device access policies (desktop/mobile/app) |
| Company profile | Extended company information (address, contact, etc.) |

### 2.3 Role-Based Access Control (RBAC)

**Purpose:** Fine-grained authorization controlling who can do what.

| Capability | Details |
|-----------|---------|
| Roles | Global (system-wide) and company-specific roles |
| Permissions | Named permission keys with types (master, module) |
| Role-permission mapping | Many-to-many: roles can have multiple permissions |
| Permission checks | Middleware-level enforcement on routes + controller-level checks |
| Super admin (sadmin) | System-level admin with cross-company access |

### 2.4 User Management

**Purpose:** Admin tools for managing the user base.

| Capability | Details |
|-----------|---------|
| View users | List all users in the current company with role/status info |
| Approve/reject | Admin approval workflow for new signups |
| Deactivate | Soft-deactivate users (revokes tokens, blocks login) |
| Delete | Permanent user removal (cascades to profile) |
| Role assignment | Change a user's role |
| Device access | Control per-user device access (desktop, mobile web, mobile app) |
| User profiles | Extended profile data with company association |

### 2.5 File Management (NBnext Drive)

**Purpose:** Company-scoped file storage and retrieval.

| Capability | Details |
|-----------|---------|
| Upload files | Multer-based upload with configurable size limits (default 10MB) |
| Browse files | List files by company, user, or associated object |
| Download/stream | Serve files with proper MIME types and Content-Disposition |
| Delete files | Remove file records and physical files from disk |
| Object association | Files can be linked to any entity via objectName/objectId |
| Access control | Company-scoped; optional "show all" for admins |

### 2.6 Activity & Audit Logging

**Purpose:** Track all significant user actions for compliance and debugging.

| Capability | Details |
|-----------|---------|
| Automatic logging | Middleware captures create/update/delete operations |
| Manual logging | Service-level API for custom activity entries |
| Before/after tracking | Captures state before and after changes |
| External sync | Pushes activities to an external wallet/tracking server |
| Query by head/object | Filter activities by category or associated entity |
| Confirmation status | Tracks whether activity was successfully synced externally |

### 2.7 Layout System

**Purpose:** Let users customize data grid column configurations.

| Capability | Details |
|-----------|---------|
| Private layouts | User-specific column configurations |
| Public layouts | Shared layouts visible to all company members |
| Default layout | Set one layout as default per document per user |
| CRUD operations | Create, update, delete, and clone layouts |

### 2.8 Admin Dashboard

**Purpose:** Central administration interface.

| Module | Purpose |
|--------|---------|
| User Management | View, approve, deactivate, delete users; assign roles |
| Role & Permission Editor | Create roles, manage permission assignments |
| Company Settings | Edit company name, device access policies |
| Subscription Management | Manage subscription tiers and permission bundles |
| Multi-Company Setup | Assign sadmin users to companies |
| Audit Timeline | Browse activity logs with filters |
| Help & Support | View and manage support tickets |

### 2.9 Help & Support System

**Purpose:** In-app support ticket submission.

| Capability | Details |
|-----------|---------|
| Ticket submission | Users can submit issues with description and screenshot |
| Screenshot capture | Automatic current-screen capture attached to tickets |
| Console log buffer | Captures recent console output for debugging context |
| Keyboard shortcut | Quick-access shortcut to open support dialog |

### 2.10 Onboarding

**Purpose:** Guide new users through initial setup.

| Step | Action |
|------|--------|
| 1 | Create or join a company |
| 2 | Configure company settings |
| 3 | Access the main application |

---

## 3. User Roles & Personas

| Role | Description | Access Level |
|------|-------------|-------------|
| **Super Admin (sadmin)** | System operator, manages multiple companies | Full access including multi-company setup |
| **Admin** | Company-level administrator | User management, roles, settings within their company |
| **Standard User** | Regular application user | Access based on assigned role's permissions |
| **Unapproved User** | Recently signed up, awaiting approval | Login blocked until admin approves |

---

## 4. Key Business Flows

### 4.1 New User Onboarding
1. User signs up with username/password
2. Account created with `is_approved: false`
3. Admin reviews and approves the user (optionally assigning a role)
4. On first login, user is forced to change password
5. If user has no company, they are redirected to onboarding to create/join one
6. User reaches the main application

### 4.2 Company Switch
1. User requests company switch from the UI
2. System validates user is linked to the target company
3. New JWT tokens are issued with the new company context
4. User's active company profile is updated
5. Device access settings are synced from the new company's policies

### 4.3 File Upload & Retrieval
1. User uploads a file through NBnext Drive
2. File is stored on disk with a timestamped unique name
3. Metadata (name, size, MIME type, owner, company) is saved to database
4. Files are retrievable by ID, company, or associated object
5. Download streams the file with correct headers

### 4.4 Permission Check Flow
1. Request hits a protected route
2. Auth middleware validates JWT (or refreshes if expired)
3. Route-specific permission middleware checks user's role permissions
4. Controller may perform additional permission checks for sensitive operations
5. Request proceeds or is rejected with 403

---

## 5. Integration Points

| System | Purpose | Protocol |
|--------|---------|----------|
| PostgreSQL | Primary data store | Sequelize ORM |
| External Wallet Server | Activity sync, wallet balance checks | HTTP API |
| TOTP Authenticator Apps | Two-factor authentication | TOTP standard (RFC 6238) |
| Socket.io | Real-time communication (scaffolded) | WebSocket |

---

## 6. Non-Functional Requirements

| Requirement | Implementation |
|------------|---------------|
| **Security** | Helmet.js headers, CORS whitelist, httpOnly cookies, bcrypt password hashing |
| **Logging** | Winston with daily file rotation + console output |
| **Error handling** | Centralized error middleware, structured error responses |
| **Code quality** | ESLint with custom rules, Prettier, commit validation |
| **Scalability** | Stateless JWT auth (horizontal scaling ready), connection pooling |
| **Multi-tenancy** | Company-scoped data access, company-owned model mixin |

---

*See [TECHNICAL_DOC.md](./TECHNICAL_DOC.md) for architecture details and [USER_DOCS.md](./USER_DOCS.md) for feature usage guides.*
