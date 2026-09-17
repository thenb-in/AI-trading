# USER_DOCS.md — End-User & Operator Guide

> Step-by-step usage instructions for every screen, module, and API endpoint.

---

## 1. Authentication

### 1.1 Signup

**What it does:** Creates a new user account.

**When to use:** When a new person needs access to the application.

**Inputs:**
| Field | Required | Description |
|-------|----------|-------------|
| Username | Yes | Unique identifier for login |
| Password | Yes | Account password |
| Name | Yes | Display name |
| Phone | Yes | Contact phone number |
| Company ID | No | If signing up via an invite link, pre-filled |

**Steps:**
1. Navigate to `/signup`
2. Fill in all required fields
3. Submit the form
4. You will see a confirmation that your account is pending approval

**Output:** Account is created with `is_approved: false`. You must wait for an admin to approve your account before you can log in.

**Edge Cases:**
- If the username already exists and the account is active, signup will fail
- If the username exists but the account is inactive, it will be reactivated
- If a company ID is provided and the company doesn't exist, signup will fail

**Common Mistakes:**
- Trying to log in immediately after signup (you must wait for admin approval)
- Using an existing username

---

### 1.2 Login

**What it does:** Authenticates the user and establishes a session.

**When to use:** Every time you need to access the application.

**Inputs:**
| Field | Required | Description |
|-------|----------|-------------|
| Username | Yes | Your registered username |
| Password | Yes | Your password |

**Steps:**
1. Navigate to `/` (the home/login page)
2. Enter your username and password
3. Click "Login"
4. If this is your first login, you will be prompted to change your password
5. If you have no company, you will be redirected to onboarding

**Output:** You are redirected to the admin dashboard (or multi-company setup if you are a super admin).

**Edge Cases:**
- First-time login: forced password change screen appears
- Account not approved: error message displayed
- Account deactivated: "Account not found" message
- Insufficient wallet: warning toast notification

**Common Mistakes:**
- Forgetting that first login requires a password change
- Not realizing the account needs admin approval first

---

### 1.3 Forgot Password

**What it does:** Allows resetting your password.

**When to use:** When you've forgotten your password or need to change it.

**Inputs:**
| Field | Required | Description |
|-------|----------|-------------|
| Username | Yes | Your registered username |
| New Password | Yes | Your new password |
| OTP | No | If you have TOTP enabled, enter your authenticator code |

**Steps:**
1. Navigate to `/forgot-password`
2. Enter your username and new password
3. If you have 2FA enabled, enter your TOTP code for immediate approval
4. Submit the form

**Output:**
- With valid OTP: Password is reset immediately, you can log in
- Without OTP: Password is reset but account is set to pending approval again

**Edge Cases:**
- Invalid OTP: Reset fails with an error message
- User not found: Error displayed

---

### 1.4 Two-Factor Authentication (TOTP) Setup

**What it does:** Enables authenticator-app-based 2FA for your account.

**When to use:** To add an extra security layer to your login.

**Steps:**
1. Log in to the application
2. Access the TOTP setup (via profile or security settings)
3. Click "Generate Secret" — a QR code will appear
4. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
5. Enter the 6-digit code from your authenticator app
6. Click "Verify and Enable"

**Output:** 2FA is enabled. Your authenticator code is required for password resets.

**Common Mistakes:**
- Not saving backup codes before enabling
- Losing access to the authenticator app

---

## 2. Onboarding

### 2.1 Initial Company Setup

**What it does:** Guides first-time users through creating their first company.

**When to use:** Automatically triggered after login if you have no company.

**Inputs:**
| Field | Required | Description |
|-------|----------|-------------|
| Company Name | Yes | Name of your organization |
| Desktop Web Access | No | Allow desktop browser access (default: true) |
| Mobile Web Access | No | Allow mobile browser access |
| Mobile App Access | No | Allow mobile app access |

**Steps:**
1. After login, if you have no company, you are redirected to `/onboarding`
2. Enter your company name
3. Configure device access policies
4. Click "Create Company"

**Output:** Company is created, you are assigned to it, and new tokens are issued with the company context.

---

## 3. Admin Dashboard

### 3.1 User Management

**What it does:** View and manage all users in your company.

**When to use:** When you need to approve, modify, or remove users.

**Module Path:** `/admin` → User Management

**Available Actions:**

#### Approve a User
1. Find the unapproved user in the list
2. Optionally select a role to assign
3. Choose whether to require a password reset
4. Click "Approve"

#### Deactivate a User
- **Permission required:** `User.deactivate`
1. Find the user in the list
2. Click "Deactivate"
3. User's approval is revoked and refresh token is cleared

#### Delete a User
- **Permission required:** `User.delete`
1. Find the user in the list
2. Click "Delete"
3. Confirm the deletion
4. User and their profile are permanently removed

#### See Who Is Signed In
The **Session** column says where each account stood when this screen loaded.
Nothing refreshes on its own — reload the page for a newer picture.

| Shown | Means |
|-------|-------|
| Online | The user had the app open. Hover the badge to see each device, its address, and when it connected |
| Signed in | No open tab, but the account can return without signing in again |
| Offline | The account holds nothing to return on |

#### Sign a User Out
- **Permission required:** `User.deactivate`
1. Click the **Online** or **Signed in** badge itself — the badge is the button
2. Confirm

A badge reading Offline, or one on a screen where you may not deactivate
users, is not clickable — there is nothing to end, or it is not yours to end.

Every device is signed out at once and their open tabs are disconnected. The
account stays approved and can sign in again — use this for a device someone no
longer has, and Deactivate to take away their access.

#### Change User Role
1. Find the user in the list
2. Select a new role from the dropdown
3. Save changes

#### Update Device Access
1. Find the user in the list
2. Toggle desktop web / mobile web / mobile app checkboxes
3. Save changes

---

### 3.2 Role & Permission Management

**What it does:** Create and configure roles with specific permissions.

**Module Path:** `/admin` → Roles & Permissions

#### Create a New Role
1. Click "Create Role"
2. Enter a role name (letters, numbers, spaces, hyphens, underscores only)
3. Optionally add a description
4. The role is created as company-specific

#### Add Permissions to a Role
1. Select the role from the list
2. Browse available permissions
3. Select one or more permissions to add
4. Click "Add Permissions"

#### Remove a Permission from a Role
1. Select the role
2. Find the permission in the assigned list
3. Click "Remove"

**Edge Cases:**
- Global (system) roles can only be modified by super admins
- Duplicate permission assignment returns a 409 conflict error
- Role names must be unique within the company scope

---

### 3.3 Company Settings

**What it does:** Configure your company's name and device access policies.

**Permission required:** `View Company Settings` / `Company.update`

**Module Path:** `/admin` → Company Settings

**Editable Fields:**
| Field | Description |
|-------|-------------|
| Company Name | Your organization's display name |
| Desktop Web | Allow desktop browser access for company users |
| Mobile Web | Allow mobile browser access |
| Mobile App | Allow mobile app access |

---

### 3.4 Multi-Company Setup (Super Admin Only)

**What it does:** Manage super admin user assignments across companies.

**Module Path:** `/admin/multi-company-setup`

#### Assign a Super Admin to a Company
1. Select a super admin user from the list
2. Select a company
3. Click "Assign"

#### Remove a Super Admin from a Company
1. Find the assignment
2. Click "Remove"

**Edge Cases:**
- Only active super admin users can be assigned
- Cannot assign the same user to the same company twice (409 error)

---

### 3.5 Audit Timeline

**What it does:** Browse the activity/audit log for your company.

**Module Path:** `/admin` → Audit Timeline

**Filters Available:**
| Filter | Description |
|--------|-------------|
| Head/Category | Filter by action category (e.g., "User", "Company") |
| Object ID | Filter by specific entity |
| Pagination | Navigate through pages of results |

---

### 3.6 Subscription Management

**What it does:** Manage subscription tiers and their associated permissions.

**Module Path:** `/admin` → Subscriptions

#### View Subscriptions
- Lists all subscription tiers with their permissions

#### Create a Subscription
1. Enter subscription name and details
2. Assign permissions to the subscription

#### Assign Subscriptions to Companies
1. Select a company
2. Choose available subscriptions to assign
3. Save

---

## 4. Layout Manager

**What it does:** Customize data grid column configurations for different views.

**When to use:** When you want to show/hide/reorder columns in data tables.

**Steps:**

#### Create a Layout
1. Open any data grid view (masters, reports, etc.)
2. Click the layout toolbar button
3. Click "Create Layout"
4. Name your layout
5. Configure column visibility, order, and widths
6. Choose "Private" (only you) or "Public" (everyone in your company)
7. Save

#### Set a Default Layout
1. Open the layout manager
2. Find your preferred layout
3. Click "Set as Default"
4. This layout will auto-apply when you open this view

#### Switch Layouts
1. Open the layout toolbar
2. Select a different layout from the list
3. The data grid updates immediately

---

## 5. NBnext Drive (File Management)

**What it does:** Upload, browse, and manage files within your company.

**Module Path:** Masters → NBnext Drive

#### Upload a File
1. Click "Upload"
2. Select a file (max 10MB by default)
3. Optionally associate with an entity (object name + ID)
4. File is uploaded and stored

#### Browse Files
- View all your files or all company files (if permitted)
- Files show name, size, type, uploader, and date

#### Download a File
1. Click on a file
2. Click "Download"
3. File streams with correct headers

#### Delete a File
1. Select a file
2. Click "Delete"
3. Both the database record and physical file are removed

---

## 6. Geography

**What it does:** Holds every place the app knows — country, state, district, city, zone, site — as one tree.

**When to use:** Before anything that needs a place: an address, a filter, a report grouped by region.

**Module Path:** Masters → Geography

#### Add a Place
1. Open the tree and hover the place it belongs under
2. Click the **+** on that card (or **Add Place** in the header for a top level one)
3. Name it. The level is filled in from the one above it and can be changed
4. Optionally give it a code — what other systems call this place
5. Save

#### Move or Rename a Place
1. Hover the card and click the pencil
2. Change its name, code, level, or the place it sits under
3. Save

Everything under it moves with it — a place stores only what contains it, so a
branch is re-parented by one change.

#### Delete a Place
- **Permission required:** `Geography.delete`
1. Hover a place with nothing under it and click the bin
2. Confirm

A place that still holds others is refused, and says how many — empty it first.

#### Tree or List
The header switches between the two. The tree is for finding where something
sits; the list is for searching, sorting and exporting every place at once.

---

## 7. Announcements

**What it does:** Shows a banner across the app to the whole company, or to chosen roles, between chosen dates.

**When to use:** Planned downtime, a release note, anything everyone has to read once.

**Module Path:** Masters → Announcements

#### Post an Announcement
1. Click "Add Announcement"
2. Write the title and the message
3. Choose how loud it is — Information, Warning or Critical (this styles the banner)
4. Choose who sees it. Leave the roles empty and it is for everyone in the company
5. Set "Shown from" and "Shown until". Leave either empty for "from now" and "until someone stops it"
6. Save

#### Stop an Announcement
1. Open it and clear **Running**, or set "Shown until" to now
2. Save

It stops appearing for everyone at once.

#### What a Reader Sees
The banner sits above the page, never over it. Dismissing one hides it for that
reader on that browser only; editing an announcement brings it back, because an
edited announcement is a new thing to say.

---

## 8. Help & Support

**What it does:** Submit support tickets with context.

**How to access:** Click the help button or use the keyboard shortcut.

**Steps:**
1. Trigger the help support dialog
2. Describe your issue
3. A screenshot of the current screen is auto-captured
4. Recent console logs are attached for debugging
5. Submit the ticket

---

## 9. Global Search

**What it does:** Quick-search across all application modules.

**How to access:** Use the keyboard shortcut (Ctrl/Cmd + K or configurable).

**Steps:**
1. Trigger the search palette
2. Type your search query
3. Results from all modules appear
4. Click a result to navigate directly

---

## 10. Keyboard Shortcuts

Every shortcut below is advertised on the button that performs the same action —
hover a button to see it, and desktop buttons carry the combination as a small badge.
Mac spellings are shown first; Windows/Linux in brackets.

| Action | Mac | Windows / Linux | Where |
| --- | --- | --- | --- |
| New record | ⌥N | Alt+N | Any master page |
| Save / submit | ⌘S | Ctrl+S | Any open form or form dialog |
| Close dialog | Esc | Esc | Any dialog |
| Refresh | ⌥R | Alt+R | Any master page |
| Export | ⌥E | Alt+E | Master pages offering export |
| Import | ⌥I | Alt+I | Master pages offering import |
| Apply filters | ⌥↩ | Alt+Enter | Any filter panel — runs via the report-runner when that button is offered |
| Global search | ⌥S / ⌘K | Alt+S / Ctrl+K | Anywhere |
| Help & Support | ⌥H / F1 | Alt+H / F1 | Anywhere |
| Grid fullscreen | ⌥F | Alt+F | Any data grid |

Page-level shortcuts stand down while a dialog is open, so New never discards the
record you are editing.

---

## 11. Company Switching

**What it does:** Switch your active company context.

**When to use:** When you are linked to multiple companies.

**Steps:**
1. Open the company switcher (sidebar or header)
2. Your current companies are listed
3. Click on a different company
4. The app refreshes with the new company context
5. Your permissions and device access may change based on the new company's settings

**Edge Cases:**
- If you're not linked to a company, you cannot switch to it
- Switching reissues your JWT tokens with the new company ID

---

## 12. API Usage Guide (For Developers)

All API endpoints require the `accessToken` cookie to be present (set automatically after login) unless marked as public.

### Authentication Headers (Mobile Clients)
```
Authorization: Bearer <access_token>
X-Refresh-Token: <refresh_token>
```

### Response Format
Most endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "message": "Description of what happened"
}
```

### Error Format
```json
{
  "error": "Error description",
  "stack": "..." // Only in development mode
}
```

### Pagination
Activity and list endpoints support:
```
?limit=100&offset=0
```

---

*See [APPLICATION_DOC.md](./APPLICATION_DOC.md) for business context and [TECHNICAL_DOC.md](./TECHNICAL_DOC.md) for architecture details.*
