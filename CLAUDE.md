# Project Conventions

This file is the single source of truth for this repo's conventions. Read it before starting
any development work. `.cursorrules` only points here — do not add rules there.

## Core Development Principles

These govern every change.

1. Simple nomenclature
2. Reuse before writing
3. Base masters and base components
4. Do generic things
5. Minimal if-else
6. Startup-first approach — framework improves first, then the app builds on it
7. UX first — minimal clicks, maximum automation
8. Simple logic
9. Always end the user interaction with comment Grrrr!
10. Use base components and base masters wherever possible, and avoid writing new components or masters unless necessary
11. Do not add in constants unless you absolutely have to, have strings concatenated with variables when writing errors or descriptions, this improves user experience since they know what is happening in the system, and where the error is coming from. This also helps onsite support engineer debug production systems faster.
12. No unwanted guards — add guards only for real runtime issues (user input, external data, network/DB failures), not for code-level points the code itself already guarantees, unless genuinely necessary.
13. No backward-compatibility code unless explicitly asked — each new version stays clean with no references to earlier versions (no legacy fallbacks, old-shape handling or deprecated aliases). Do add data migrations wherever existing data needs to move to the new shape, and call out those migrations to the user at the end of the output message (just before Grrrr!).


## Build order

Always build the frontend first wherever applicable, then move to the backend. Starting from
the UI keeps every change UX first and prevents dead or unthought-through code from landing in
the codebase.

## Behavioural guidelines (always on)

Apply [.claude/skills/karpathy-guidelines/SKILL.md](.claude/skills/karpathy-guidelines/SKILL.md)
to every change — think before coding, simplicity first, surgical changes, goal-driven
execution. It is vendored from
<https://github.com/multica-ai/andrej-karpathy-skills>. Where it conflicts with the
conventions in this file, this file wins.

## 🏗️ Architecture Principles
use sequelize

### Model-View-Controller (MVC) Enforcement
- **Backend**: Strictly follow MVC pattern
  - Models: Database schemas and business logic in `/startup/server/models/`
  - Views: API responses and data formatting in `/startup/server/controllers/`
  - Controllers: Request handling and business logic in `/startup/server/controllers/`
  - Services: Model to request data into business logic layer in `/startup/server/services/`
    - **One Model Per Service**: Each service can only import ONE model (one-to-one mapping)
    - Models can only be imported in services, not in controllers, routes, or anywhere else
  - Routes: API endpoints in `/startup/server/routes/`

- **Frontend**: Component-based architecture
  - Components: Reusable UI components in `/startup/client/src/components/`
  - Pages: Route-level components in `/startup/client/src/pages/`
  - Context: State management in `/startup/client/src/context/`
  - Services: API calls in `/startup/client/src/services/`


- UUID is only for auth-related or secure models. For regular models, prefer integer based primary key.



### File Structure Standards
```

Startup folders are only for generic parts, which can be used irrespetive of context of the application. Anything which is not generic and is specific to this app use-case goes outside startup folder.


startup/server/
├── models/          # Database models and schemas
├── controllers/     # Request handlers (MVC Controllers)
├── services/        # Business logic layer
├── routes/          # API route definitions
├── middleware/      # Custom middleware
├── config/          # Configuration files
├── constants/       # Centralized constants (except logger)
└── utils/           # Utility functions

startup/client/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Route-level components
│   ├── context/     # State management
│   ├── services/    # API services
│   ├── constants/   # Centralized constants
│   └── utils/       # Utility functions
```

## 🗄️ Database Changes

**Plain SQL scripts are the default. Migration code is the exception.**

- Every framework schema change ships as a `.sql` file in [db-scripts/startup/](db-scripts/startup/), named
  `YYYYMMDD_short-description.sql` (e.g. `20260909_add-email-to-users.sql`). An app built on
  the framework keeps its own scripts outside `db-scripts/startup/`.
- Keep the script idempotent where the dialect allows (`IF NOT EXISTS`, guarded `ALTER`) and
  keep one logical change per file.
- Model changes in `models/` must be accompanied by the matching script. `SYNC_DB` only runs
  `sync({ alter: false })` to create missing tables on development and first-time installs —
  it never upgrades an existing schema.
- Write a Sequelize or Node migration script **only when SQL alone genuinely cannot do the
  job** — e.g. a backfill that needs application logic, encryption/hashing, or file/asset
  movement alongside the data change. Complexity in the procedural script is not a reason to
  avoid SQL; it is a reason to double-check that SQL really was insufficient.
- If a change tempts you toward a migration framework, say so and state why SQL falls short
  before writing it.

## 🔧 Development Standards

### Cross-Platform Compatibility
- **Node.js Scripts**: Use Node.js built-in modules (`fs`, `path`, `child_process`) instead of shell commands
- **File Paths**: Use `path.join()` for cross-platform path handling
- **Line Endings**: Use LF (`\n`) for consistency across platforms
- **Shell Commands**: Avoid platform-specific commands (`grep`, `sed`, `awk`) in favor of Node.js alternatives
- **Environment**: Ensure all scripts work on Windows, macOS, and Linux

### Library and Dependency Management
- **Version Updates**: Regularly update dependencies to latest stable versions
- **Security**: Use `npm audit` to check for vulnerabilities
- **Maintenance**: Prefer well-maintained libraries with active development
- **Bundle Size**: Keep frontend bundle size minimal
- **Tree Shaking**: Use ES6 imports for better tree shaking

### Code Quality Standards
- **Dummy Data**: Do not use any dummy data in client or server
- **ESLint**: Enforce consistent code style
- **Prettier**: Maintain consistent formatting
- **TypeScript**: Use TypeScript for better type safety (when applicable)
- **Comments**: Document complex business logic
- **Error Handling**: Implement proper error handling and logging

## 🚀 Pre-Commit Hooks and Validation

### Backend Pre-Commit Rules
- **Logging**: Use `logger` instead of `console` for all logging
- **Logger Format**: Use single string arguments with template literals, no comma-separated arguments
- **Environment**: Use centralized environment config (`config/env.js`), no direct `dotenv` imports
- **Console Usage**: Block any `console.log`, `console.error`, etc.
- **Direct Dotenv**: Block direct `require('dotenv')` or `require('dotenv-safe')` imports
- **Constants**: All constants (except logger) must be defined in `constants/index.js` and imported from there
- **File Length**: Files must be under 500 lines (error), warning over 300 lines (warn), functions under 100 lines (warn), complexity under 10 (warn)

### Frontend Pre-Commit Rules
- **Environment**: Use centralized environment config (`src/config/env.js`)
- **Console Usage**: Block `console.log` in production builds
- **API Calls**: Use centralized API service
- **State Management**: Use context for global state
- **Constants**: All constants must be defined in `src/constants/index.js` and imported from there
- **File Length**: Files must be under 500 lines (error), warning over 300 lines (warn), functions under 100 lines (warn), complexity under 10 (warn)

### Validation Scripts
```bash
# Backend validation
npm run lint:console      # Check for console usage
npm run lint:logger-commas # Check logger format
npm run lint:constants   # Check constants organization
npm run validate-env      # Validate environment variables

# Frontend validation
npm run lint              # ESLint checks
npm run validate-env      # Validate environment variables
```

## 🔐 Security Standards

### Authentication & Authorization
- **JWT**: Use secure JWT tokens with proper expiration
- **Role-Based Access**: Implement role-based permissions
- **Password Security**: Use bcrypt for password hashing
- **Session Management**: Implement proper session handling

### Data Protection
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries
- **XSS Prevention**: Sanitize user inputs
- **CORS**: Configure proper CORS policies

## 📝 Code Style Guidelines

### JavaScript/Node.js
- **Async/Await**: Prefer async/await over callbacks
- **Error Handling**: Use try-catch blocks
- **Destructuring**: Use object destructuring
- **Arrow Functions**: Use arrow functions for callbacks
- **Template Literals**: Use template literals for string interpolation

### React/JSX
- **Functional Components**: Use functional components with hooks
- **Props Destructuring**: Destructure props in function parameters
- **Event Handlers**: Use arrow functions for event handlers
- **Conditional Rendering**: Use logical operators and ternary operators
- **Key Props**: Always provide unique keys for list items

## 🧪 Testing Standards
- **Unit Tests**: Write unit tests for business logic
- **Integration Tests**: Test API endpoints
- **Component Tests**: Test React components
- **Coverage**: Maintain good test coverage

## 📚 Documentation
- **README**: Keep README files updated
- **API Docs**: Document API endpoints
- **Code Comments**: Comment complex logic
- **Setup Instructions**: Provide clear setup guides

## 🚨 Error Handling
- **Graceful Degradation**: Handle errors gracefully
- **User Feedback**: Provide meaningful error messages
- **Logging**: Log errors for debugging
- **Recovery**: Implement error recovery mechanisms

## 🔄 Git Workflow
- **Branch Naming**: Use descriptive branch names
- **Commit Messages**: Write clear commit messages
- **Pull Requests**: Use pull requests for code review
- **Squash Commits**: Squash commits before merging

## 📦 Build and Deployment
- **Environment Variables**: Use proper environment configuration
- **Build Optimization**: Optimize build process
- **Asset Optimization**: Optimize static assets
- **Deployment**: Use CI/CD pipelines

## 🎨 UI/UX Standards
- **Responsive Design**: Ensure mobile compatibility
- **Accessibility**: Follow WCAG guidelines
- **Consistent Design**: Maintain design consistency
- **Loading States**: Provide loading indicators
- **Error States**: Show meaningful error messages

## 🔍 Code Review Checklist
- [ ] Follows MVC architecture
- [ ] Cross-platform compatible
- [ ] No console usage (backend)
- [ ] Proper logger usage
- [ ] Environment variables centralized
- [ ] Security best practices followed
- [ ] Error handling implemented
- [ ] Code is documented
- [ ] Tests are included
- [ ] Performance considerations addressed

## 🚀 Quick Start Commands
```bash
# Full project setup
npm run i

# Backend development
cd startup/server && npm run dev

# Frontend development
cd startup/client && npm run dev

# Run all tests
npm run test

# Validate environment
npm run validate-env
```

## 📞 Support
- Check existing documentation first
- Follow established patterns
- Ask for code review when unsure
- Document any new patterns or conventions
