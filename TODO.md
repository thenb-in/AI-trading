# TODO.md — Actionable Issues & Improvements

> Issues, risks, and improvements identified by automated codebase analysis.  
> Priority: **P0** = Critical, **P1** = High, **P2** = Medium, **P3** = Low

---

## Security Issues

### P0 — Hardcoded Salt Rounds
- **File:** `server/src/services/startup/authService.js:49`
- **Issue:** `bcrypt.hash(password, 10)` uses hardcoded salt rounds. Should be configurable via environment variable.
- **Fix:** Add `BCRYPT_SALT_ROUNDS` to env config, default to 10.

### P1 — Commented-Out Permission Checks in Admin Controller
- **File:** `server/src/controllers/startup/admin.controller.js:7-9, 34-36, 58-60, 81-84`
- **Issue:** Multiple admin endpoints have their permission checks commented out (`// const hasPermission = ...`). These endpoints are effectively unprotected beyond the `protect` middleware.
- **Fix:** Re-enable permission checks or confirm the admin middleware on the route is sufficient.

### P1 — Commented-Out Permission Check in User Controller
- **File:** `server/src/controllers/startup/userController.js:9-11`
- **Issue:** `getAllUsers` has its permission check commented out.
- **Fix:** Re-enable or confirm route-level middleware covers this.

### P2 — Refresh Token Logged in Plain Text
- **File:** `server/src/services/startup/authService.js:109`
- **Issue:** `logger.info('Refresh token generated: ${refreshToken}')` logs the raw refresh token. In production, this is a security risk.
- **Fix:** Remove or redact token values from log output.

### P2 — Access Token Logged in Plain Text
- **File:** `server/src/services/startup/authService.js:108`
- **Issue:** Same as above — raw access token logged.
- **Fix:** Log only a truncated hash or omit entirely.

---

## Code Quality

### P1 — Duplicate Auth Middleware Implementation
- **Files:** `server/src/middleware/authMiddleware.js` and `server/src/middleware/activityLogMiddleware.js`
- **Issue:** `activityLogMiddleware.js` contains a near-complete copy of the auth middleware logic (token validation, refresh handling, etc.) instead of reusing `authMiddleware.js`. Any fix to one must be replicated in the other.
- **Fix:** Extract shared auth logic into a utility and have both middlewares call it.

### P2 — Error Objects Thrown as Plain Objects
- **Files:** Multiple services (e.g., `rolePermissionService.js:63`, `multiCompanyService.js:119`)
- **Issue:** `throw { status: 500, message: error.message }` throws plain objects instead of proper Error instances. This loses stack traces and can bypass error handling.
- **Fix:** Use custom error classes that extend `Error`.

### P2 — Inconsistent Naming in Exports
- **File:** `server/src/services/startup/multiCompanyService.js`
- **Issue:** `assignUserToCompanyFinal` and `removeUserFromCompanyFinal` have confusing "Final" suffix. The naming doesn't clearly communicate why these differ from `assignUserToCompany`.
- **Fix:** Rename to `assignUserToCompanyWithValidation` or similar.

### P3 — Console.log in Client Code
- **File:** `client/src/context/startup/AuthContext.jsx:41-45`
- **Issue:** `console.log("DataProvider: deviceAccess:", ...)` left in production code.
- **Fix:** Remove or use the debug mode service.

### P3 — Unused Imports
- **Files:** Multiple files import `Op` as `_Op` (prefixed with underscore, indicating unused)
- **Fix:** Remove unused imports.

---

## Missing Features

### P1 — No Input Validation on Several Endpoints
- **Endpoints affected:** `/admin/roles` (POST), `/admin/permissions` (POST), `/users/:userId/role` (PUT), `/users/:userId/deviceAccess` (PUT)
- **Issue:** These endpoints lack express-validator middleware. Request body is passed directly to services.
- **Fix:** Add validation middleware similar to `authValidator.js` pattern.

### P1 — No Pagination on User Listing
- **File:** `server/src/services/startup/userService.js:58-68`
- **Issue:** `getAllUsers` fetches all users with no limit/offset support. Will cause performance issues at scale.
- **Fix:** Add pagination parameters.

### P2 — No Rate Limiting
- **Issue:** No rate limiting on any endpoints, especially auth endpoints (`/login`, `/signup`, `/reset-password`).
- **Fix:** Add `express-rate-limit` middleware, especially on auth routes.

### P2 — No Password Complexity Requirements
- **File:** `server/src/services/startup/authService.js:49`
- **Issue:** Passwords are hashed but never validated for complexity (length, special characters, etc.).
- **Fix:** Add password validation rules in the validator layer.

### P3 — Placeholder User Routes
- **File:** `client/src/App.jsx:47-54`
- **Issue:** `/user-routes` renders a placeholder div "Implement app logic here."
- **Fix:** Implement or remove the route.

---

## Architecture Improvements

### P2 — App Routes Manual Prefix
- **File:** `server/index.js:69-71`
- **Issue:** Comment says app routes need manual `/api/v1` prefix. This is fragile and inconsistent with other routes.
- **Fix:** Wrap app routes with the same router prefix pattern used by other routes.

### P2 — getUserWithRoleInclude Shared Across Modules
- **File:** `server/src/services/startup/rolePermissionService.js:231-243`
- **Issue:** The TODO comment says "this should be removed. make it like a structure?" — the include config is used by both `authService` and `rolePermissionService`, creating coupling.
- **Fix:** Move to a shared query config or constants file.

### P3 — Test Coverage Gaps
- **Directory:** `tests/`
- **Issue:** E2E and integration test directories exist with scaffolding but minimal actual test cases.
- **Fix:** Prioritize tests for auth flows, permission checks, and company operations.

---

## Performance

### P2 — N+1 Query in multiCompanyService.getUserCompanies
- **File:** `server/src/services/startup/multiCompanyService.js:9-32`
- **Issue:** Fetches links then loops through each to call `companyService.getCompanySettings()` individually.
- **Fix:** Use a single query with includes or `findAll` with `id IN (...)`.

### P2 — N+1 Query in multiCompanyService.getCompanyUsers
- **File:** `server/src/services/startup/multiCompanyService.js:83-110`
- **Issue:** Same pattern — fetches assignments then loops to get each user individually.
- **Fix:** Batch query with IN clause.

### P2 — N+1 Query in rolePermissionService.fetchAllUsers
- **File:** `server/src/services/startup/rolePermissionService.js:50-65`
- **Issue:** Loops through all companies and fetches users for each.
- **Fix:** Single query across companies or use pagination.

### P1 — Hooks Called From Places Hooks May Not Go
- **File:** `startup/client/src/hooks/hasPermission.js`, and every other hook in `startup/client/src/hooks/`

- **Background — why React cares:** React does not track hooks by name. On each render it hands
  out hook state *by call order*: the first `useState`/`useContext`/`useEffect` gets slot 1, the
  second gets slot 2, and so on. Next render it counts again and matches slot to slot. This only
  works if a component calls the same hooks, in the same order, on every render. Skip one and
  everything after it shifts up a slot, so a component is handed state belonging to something
  else; React detects the changed count and throws **"Rendered fewer hooks than expected"**. Hence
  the rule: hooks run at the top of a component, unconditionally — never inside an `if`, a loop,
  a callback or behind a `&&`.

- **Issue:** `hasPermission(names, userData)` breaks that rule conditionally. When the caller
  omits `userData` it reads the signed-in user from context — a hook call — and when the caller
  passes one it does not. The same function is a hook or not depending on its arguments, which
  means whether a call site is legal depends on how it calls:

  ```js
  const canView = hasPermission('read_x');                       // fine: runs every render
  const canEdit = allowEdit && hasPermission('update_x');        // BROKEN: 2 hooks this render,
                                                                 // 1 the next -> React throws
  rows.filter((r) => hasPermission(permissionOf(r)));            // BROKEN: count varies with rows
  ```

  Seventeen call sites therefore pass `userData` deliberately — they sit inside a `.filter()`
  (`useWorkflowRowActions`), in a plain module that is not a component at all (`canSeeModule`,
  `getAppModules`, `getMasterModules`), or behind a short-circuit (`permissionKeys.delete &&
  hasPermission(...)` in `BaseMaster`, `allowCreate && isCreatable && hasPermission(...)` in
  `MasterSelector`). Nothing enforces that: `react-hooks/rules-of-hooks` identifies components and
  hooks *by name* — `UpperCase` is a component, `useThing` is a hook, anything else is an ordinary
  function where hooks are simply not allowed. `hasPermission` is neither, so the rule fires on the
  definition and is silenced with an eslint-disable, leaving every call site unchecked.

- **Fix:** Split the two shapes so the rule can do its job: a plain `checkPermission(names,
  userData)` for loops, plain modules and short-circuits, and a `useCheckPermission()` for
  components that want the signed-in user. The lint rule then checks each call site by name, with
  no suppression anywhere. This was built and verified (client lint clean with the disable removed,
  build green, 9 call sites on the hook and 17 on the plain function) and then reverted on request
  — see the conversation of 2026-09-17.

  Then audit the rest of `startup/client/src/hooks/` for the same shape: any exported function that
  calls `useContext`/`useState`/`useEffect` on some paths but not others, or that is reachable from
  a loop, callback or condition. Renaming such a function to `use*` without splitting it does not
  fix anything — it just moves the error from the definition to every call site that was relying on
  the non-hook path (measured: 12 of them).

---

## Documentation

### P2 — Missing API Documentation for App Routes
- **File:** `server/src/routes/app_routes.js`
- **Issue:** Custom app routes are not documented anywhere.
- **Fix:** Document in TECHNICAL_DOC.md as they are added.

### P3 — Outdated TODO Comments in Code
- Multiple `// todo:` comments in code that should be tracked here instead.
- **Fix:** Address or remove inline TODOs; track in this document.

---

## Summary

| Priority | Count |
|----------|-------|
| P0 (Critical) | 1 |
| P1 (High) | 6 |
| P2 (Medium) | 11 |
| P3 (Low) | 5 |
| **Total** | **23** |

---

*See [ROADMAP.md](./ROADMAP.md) for the suggested timeline to address these items.*
