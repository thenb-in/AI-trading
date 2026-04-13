# ROADMAP.md — Project Evolution Path

> A phased plan for hardening, extending, and scaling NB Next.

---

## Phase 1: Security Hardening (Immediate)

**Goal:** Close security gaps identified in the codebase analysis.

| Task | Priority | Effort |
|------|----------|--------|
| Re-enable commented-out permission checks in admin & user controllers | P1 | Low |
| Remove raw token values from log output | P2 | Low |
| Make bcrypt salt rounds configurable via environment | P0 | Low |
| Add rate limiting on auth endpoints (login, signup, reset-password) | P2 | Medium |
| Add password complexity validation | P2 | Low |
| Add input validation middleware to all unprotected admin endpoints | P1 | Medium |

**Success criteria:** Zero commented-out security checks, no secrets in logs, auth endpoints rate-limited.

---

## Phase 2: Code Quality & Architecture (1-2 Sprints)

**Goal:** Reduce technical debt and improve maintainability.

| Task | Priority | Effort |
|------|----------|--------|
| Deduplicate auth middleware logic (authMiddleware vs activityLogMiddleware) | P1 | Medium |
| Replace thrown plain objects with custom Error classes | P2 | Medium |
| Fix N+1 queries in multiCompanyService and rolePermissionService | P2 | Medium |
| Add pagination to user listing endpoints | P1 | Low |
| Clean up unused imports and console.log statements | P3 | Low |
| Standardize API response format across all controllers | P2 | Medium |
| Move shared query includes to a constants/config module | P2 | Low |
| Fix app routes prefix inconsistency | P2 | Low |

**Success criteria:** No N+1 queries in critical paths, consistent error handling, all list endpoints paginated.

---

## Phase 3: Testing & CI (2-3 Sprints)

**Goal:** Build confidence in the codebase with automated testing.

| Task | Priority | Effort |
|------|----------|--------|
| Write unit tests for all service layer functions | P1 | High |
| Write integration tests for auth flow (signup → approve → login → refresh) | P1 | High |
| Write integration tests for RBAC (permission checks, role assignment) | P1 | Medium |
| Write E2E tests for critical user journeys (login, onboarding, company switch) | P2 | High |
| Add test coverage reporting to CI pipeline | P2 | Medium |
| Add automated security scanning (npm audit, Snyk) to CI | P2 | Low |
| Set up staging environment for pre-deploy validation | P3 | High |

**Success criteria:** >70% service layer coverage, all auth flows tested, CI blocks on coverage regression.

---

## Phase 4: Feature Completeness (3-5 Sprints)

**Goal:** Fill gaps in the template to cover more common application needs.

| Feature | Description | Effort |
|---------|-------------|--------|
| Email notifications | Password reset emails, account approval notifications, welcome emails | High |
| Webhook system | Configurable webhooks for activity events | Medium |
| API key authentication | Service-to-service auth for integrations | Medium |
| Audit log export | CSV/PDF export of activity logs | Low |
| User invitation system | Invite users via email link instead of manual signup + approval | Medium |
| Profile picture upload | Avatar support in user profiles | Low |
| Dark mode | Theme toggle with persistent preference | Medium |
| Localization (i18n) | Multi-language support infrastructure | High |

---

## Phase 5: Scale & Performance (5+ Sprints)

**Goal:** Prepare the template for production use at scale.

| Task | Description | Effort |
|------|-------------|--------|
| Database connection pooling tuning | Optimize pool size for concurrent connections | Medium |
| Redis session store | Move refresh token storage to Redis for faster validation | High |
| CDN for static assets | Serve client build from CDN in production | Medium |
| Database read replicas | Separate read/write connections for query-heavy operations | High |
| API response caching | Cache frequently-read, rarely-changed data (roles, permissions) | Medium |
| Horizontal scaling guide | Document load balancer + multiple server instance setup | Medium |
| Database migration framework | Move from Sequelize sync to proper migration-only workflow | High |

---

## Phase 6: Developer Experience (Ongoing)

**Goal:** Make the template easier to use and customize.

| Task | Description | Effort |
|------|-------------|--------|
| Interactive app scaffolding | Enhanced `create-app` script with more options | Medium |
| Module generator CLI | `npm run generate:module <name>` to scaffold routes/controllers/services/models | High |
| Storybook for components | Visual component library for UI elements | High |
| API documentation (Swagger/OpenAPI) | Auto-generated from route definitions | Medium |
| Developer onboarding guide | Video walkthrough of architecture and conventions | Medium |
| Hot module replacement improvements | Faster dev server restart on backend changes | Low |

---

## Version Milestones

| Version | Target | Key Deliverables |
|---------|--------|-----------------|
| **1.1** | Phase 1 complete | Security hardening, all permission checks active |
| **1.2** | Phase 2 complete | Architecture cleanup, performance fixes |
| **1.5** | Phase 3 complete | Comprehensive test suite, CI/CD mature |
| **2.0** | Phase 4 complete | Email, webhooks, invitations, i18n |
| **3.0** | Phase 5 complete | Production-scale infrastructure |

---

*See [TODO.md](./TODO.md) for the detailed issue list driving this roadmap.*
