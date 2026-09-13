# NB Next - Starter Application Template

A comprehensive starter application template built with Node.js and React, designed to be the foundation for new applications. This template provides a complete development environment with authentication, database connectivity, and development tools pre-configured.

## 🚀 What is this?

This is a **starter app template** that you can use to quickly bootstrap new applications. It includes:

- **Full-stack architecture** with client (React) and server (Node.js/Express)
- **Authentication system** with JWT and role-based access control
- **Database layer** using Sequelize ORM
- **Development tools** including pre-commit hooks, linting, and commit validation
- **Production-ready** logging, error handling, and security middleware

## 📋 Quick Start

### 1. Use as Starter Template
```bash
# Clone this repository
git clone <this-repo-url>
cd <your-app-name>

# Set up everything (including pre-commit hooks and environment)
npm run i

# Start development
npm run dev
```

### 2. Repository Management Scripts

#### Create New App from Template
```bash
# This will help you set up a new repository from this starter
npm run create-app <new-app-git-url>

# Example:
npm run create-app https://github.com/username/my-new-app.git
```

**What this does:**
- Renames the current `origin` remote to `starter`
- Adds your new app's git URL as the new `origin`
- Pushes the code to your new repository
- Provides step-by-step guidance for next steps

#### Update from Starter Template
```bash
# Get the latest updates from the starter template
npm run update-starter-app
```

**What this does:**
- Adds the original starter repository as a `starter` remote
- Fetches the latest changes
- Merges updates from the starter template
- Provides conflict resolution guidance

**⚠️ Important:** Before using this script, update the starter repository URL in `scripts/update-starter-app.js` to point to your actual starter template repository.

## ✨ Features

- **Client and Server** - Full-stack development environment
- **Root package.json** - Run both client and server together
- **Authentication** - JWT-based auth with role management
- **Database** - Sequelize ORM with connection management
- **Structured Logging** - Winston logger with proper formatting
- **Pre-commit Hooks** - Enforce code quality standards
- **Commit Validation** - Commitlint for conventional commit format
- **Environment Management** - Centralized .env configuration
- **Code Quality Tools** - ESLint, Prettier, and Husky integration

## 🏗️ Architecture

### Backend (Server)
- **Models**: Database schemas and business logic
- **Controllers**: Request handling and business logic
- **Services**: Business logic layer
- **Routes**: API endpoint definitions
- **Middleware**: Authentication, error handling, and validation

### Frontend (Client)
- **Components**: Reusable UI components
- **Pages**: Route-level components
- **Context**: State management
- **Services**: API communication layer

## 🔧 Development Standards

### Code Quality
- **No Console Usage**: Uses structured logging instead
- **Pre-commit Hooks**: Automatic code quality checks with Husky
- **Commit Validation**: Commitlint enforces conventional commit format
- **Code Formatting**: Prettier for consistent code style
- **Linting**: ESLint with custom rules for code standards
- **Cross-platform**: Works on Windows, macOS, and Linux

### Security
- **JWT Authentication**: Secure token-based auth
- **Role-based Access**: Granular permission system
- **Input Validation**: Comprehensive request validation
- **Security Headers**: Helmet.js integration

## 🚀 Development Commands

```bash
# Full project setup
npm run i

# Development mode (both client and server)
npm run dev

# Individual services
npm run client      # Frontend only
npm run server      # Backend only

# Build for production
npm run build

# Code quality checks
npm run lint
npm run format
npm run setup-env:validate
npm run validate-commit

# Repository management
npm run create-app <new-app-url>  # Create new app from template
npm run update-starter-app         # Update from starter template
```

What a customer site installs is in [deploy/](deploy/README.md) (Linux) and
[deploy/docker/](deploy/docker/README.md) (Docker, any OS).

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route-level components
│   │   ├── context/       # State management
│   │   └── services/      # API services
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/            # Database models
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── routes/            # API routes
│   └── package.json
├── scripts/               # Setup and utility scripts
│   ├── create-app.js      # Script to create new apps from template
│   ├── update-starter-app.js # Script to update from starter template
│   ├── setup-hooks.js     # Git hooks setup
│   └── lint-checks.js     # Cross-platform linting utilities
└── package.json           # Root package.json
```

## 🔄 Future Enhancements

### 🚀 Core Improvements
- **TypeScript** - Enhanced type safety and developer experience
- **Testing Suite** - Comprehensive unit and integration tests
- **API Documentation** - Swagger/OpenAPI specifications
- **Monitoring** - Health checks and performance metrics
- **Storybook** - Component documentation and testing
- **Performance Monitoring** - Bundle analysis and optimization

### 🔄 CI/CD Pipeline
- **Staging Environment** - Add staging environment pipeline
- **Automated Versioning** - Semantic-release integration for login page
- **Changelog Generation** - Automated changelog creation
- **Automated Testing** - Jest and Cypress integration in CI/CD
- **Code Coverage** - Coverage reports and quality gates

### 🔒 Security Enhancements
- **Security Headers** - Helmet.js integration for Express
- **Rate Limiting** - Request throttling and abuse prevention
- **Input Validation** - Joi/Zod/Yup schema validation
- **Vulnerability Scanning** - npm audit and Snyk integration
- **Content Security Policy** - CSP headers and nonce generation
- **Security Testing** - OWASP ZAP integration and security audits

### 🚀 Deployment & Infrastructure
- **Web Server** - Nginx + systemctl configuration
- **Health Monitoring** - Health-check endpoint for nginx
- **Request Logging** - Morgan middleware integration
- **Error Handling** - Centralized error handler with stack tracing
- **Containerization** - Docker and Docker Compose setup
- **Load Balancing** - Reverse proxy and load balancer configuration
- **Backup & Recovery** - Automated backup strategies and disaster recovery

### 🧪 Testing & Quality Assurance
- **E2E Testing** - Cypress for end-to-end testing
- **Visual Regression** - Percy or Chromatic for UI testing
- **Accessibility Testing** - axe-core integration
- **Performance Testing** - Lighthouse CI and WebPageTest

## 📚 Documentation

- **Setup Guide**: Run `npm run i` to get started
- **Architecture**: Follows MVC pattern with clear separation of concerns
- **Code Standards**: Enforced through pre-commit hooks, ESLint, and Prettier
- **Commit Standards**: Commitlint enforces conventional commit format
- **Security**: Built-in authentication and authorization system

## 🤝 Contributing

This is a starter template - feel free to customize it for your needs! If you find bugs or have improvements, please contribute back to help others.

## 📄 License

ISC License - Use this template to build your own applications.
