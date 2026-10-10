---
id: administration
title: 3. Administration
sidebar_position: 3
keywords: [admin, administration, user management, approve user, deactivate, delete user, sessions, who is online, sign out, roles, permissions, role based access, company settings, device access, multi company, super admin, audit, audit timeline, activity log, subscriptions]
---

# 3. Administration {#administration}

Managing people, roles, and company settings. Most of this lives under **/admin**.

## Users {#users}

View and manage everyone in the company.

### Approve a user {#approve-user}

1. Find the unapproved user.
2. Optionally pick a role to assign.
3. Choose whether to force a password reset.
4. **Approve**.

### Change role {#change-role}

Pick a new role from the user's row and save.

### Device access {#device-access}

Toggle desktop web / mobile web / mobile app for the user and save.

### Deactivate a user {#deactivate-user}

Requires `User.deactivate`. Revokes approval and clears the refresh token — the account can no longer sign in. Use this to take away access.

### Delete a user {#delete-user}

Requires `User.delete`. Confirm, and the user and their profile are removed permanently.

### See who is signed in {#sessions}

The **Session** column shows where each account stood when the screen loaded. Nothing refreshes on its own — reload for a newer picture.

| Shown | Means |
|-------|-------|
| Online | The app is open. Hover the badge for each device, its address, and when it connected |
| Signed in | No open tab, but the account can return without signing in again |
| Offline | Nothing to return on |

### Sign a user out {#sign-out}

Requires `User.deactivate`.

1. Click the **Online** or **Signed in** badge — the badge is the button.
2. Confirm.

Every device is signed out and open tabs disconnect. The account stays approved and can sign in again — use this for a device someone no longer has, and **Deactivate** to remove access entirely. An **Offline** badge is not clickable.

## Roles & permissions {#roles}

Create roles and give each one a set of permissions.

- **Create a role** — name it (letters, numbers, spaces, hyphens, underscores) and optionally describe it. The role belongs to your company.
- **Add permissions** — select the role, pick one or more permissions, **Add**.
- **Remove a permission** — find it in the role's list, **Remove**.

- System (global) roles can only be changed by a super admin.
- Role names are unique within the company.
- Adding a permission the role already has is rejected as a conflict.

## Company settings {#company-settings}

Requires `Company.update`.

| Field | Description |
|-------|-------------|
| Company name | The organization's display name |
| Desktop web | Allow desktop browser access |
| Mobile web | Allow mobile browser access |
| Mobile app | Allow mobile app access |

## Multi-company setup {#multi-company}

Super admin only, under **/admin/multi-company-setup**. Assigns super admins across companies.

- **Assign** — pick a super admin and a company, **Assign**.
- **Remove** — find the assignment, **Remove**.

Only active super admins can be assigned, and not twice to the same company.

## Audit timeline {#audit}

Browse the company's activity log under **/admin → Audit timeline**. Filter by category (e.g. User, Company) or a specific record, and page through the results.

## Subscriptions {#subscriptions}

Manage subscription tiers and the permissions each one carries, under **/admin → Subscriptions**.

- **View** — lists every tier with its permissions.
- **Create** — name the tier and assign permissions.
- **Assign to a company** — pick a company, choose tiers, save.
