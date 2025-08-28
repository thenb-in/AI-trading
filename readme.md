An app in nodejs and reacts which is a starting point to other applications.

## Features
- client and server
- root package.json for running both together
- authentication
- DB connection using sequelize
- Structured logging (Winston)
- Pre-commit hooks to ensure logger is used instead of server
- Pre-commit hooks to ensure there are no commas in logger
- npm run i sets up everything, including pre-commit hooks
- dotenv + dotenv-safe (forces .env.example to keep track of required envs).




## Future plans
- CI to build and store artifacts/releases
- ESLint and prettier


### Code Quality & Standards
- TypeScript – adds strong typing and catches bugs early.
- ESLint + Prettier + Husky – great for consistent code.
- Lint-staged – so pre-commit only lints/stages changed files (faster).
- Commitlint + Conventional Commits – enforce commit message style, enables auto-changelog generation.


### CI/CD
- Automated builds + test runs on PRs + releases
- Add a staging environment pipeline.
- Automated versioning & changelogs with semantic-release on login page


### Security
- Helmet.js (basic security headers for Express).
- Rate limiting & request validation (e.g., Joi / Zod / Yup).
- Dependency vulnerability scanning (e.g., npm audit, snyk).



### Developer Experience
- Swagger / OpenAPI docs for your API.


### Deployment
- Nginx + systemctl
- health-check endpoint for nginx
- Request logging (morgan middleware).
- Centralized error handler with stack tracing.
