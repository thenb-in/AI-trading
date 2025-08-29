# Conventional Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This ensures consistent, readable commit history and enables automated tools for generating changelogs and versioning.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Commit Types

### Primary Types (Required)

- **`fix:`** - A bug fix that patches a bug in your codebase
- **`feat:`** - A new feature that adds functionality to your codebase
- **`chore:`** - Changes to build process, tooling, or other non-source code changes

### Additional Types (Optional)

- **`docs:`** - Documentation only changes
- **`style:`** - Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **`refactor:`** - A code change that neither fixes a bug nor adds a feature
- **`test:`** - Adding missing tests or correcting existing tests
- **`build:`** - Changes that affect the build system or external dependencies
- **`ci:`** - Changes to CI configuration files and scripts
- **`perf:`** - A code change that improves performance
- **`revert:`** - Reverts a previous commit

## Examples

### Basic Commits

```bash
# Bug fixes
git commit -m "fix: resolve authentication token validation issue"
git commit -m "fix: prevent SQL injection in user input"

# New features
git commit -m "feat: add user role management system"
git commit -m "feat: implement real-time chat notifications"

# Maintenance tasks
git commit -m "chore: update dependencies to latest versions"
git commit -m "chore: add pre-commit hooks for code quality"
```

### Commits with Scope

```bash
# Scoped commits provide more context
git commit -m "feat(auth): add JWT token refresh functionality"
git commit -m "fix(api): resolve CORS issues in user endpoints"
git commit -m "chore(deps): update express to v5.1.0"
```

### Commits with Body

```bash
git commit -m "feat: implement user permission system

- Add role-based access control
- Create permission management interface
- Update user model with role associations
- Add middleware for permission checking"
```

### Breaking Changes

```bash
git commit -m "feat!: change user authentication API

BREAKING CHANGE: The /auth/login endpoint now requires 
email instead of username. Update your client code accordingly."
```

## Rules

1. **Type is required** - Must be one of the allowed types
2. **Description is required** - Must be present and descriptive
3. **Description starts with lowercase** - No capital letters at the beginning
4. **No trailing period** - Description should not end with a dot
5. **Length limits** - First line ≤ 72 characters, body lines ≤ 100 characters
6. **Imperative mood** - Use present tense ("add" not "added")

## Validation

The project includes automated validation of commit messages through Git hooks. When you commit, the system will:

1. Check that your commit message follows the conventional format
2. Validate the type is one of the allowed types
3. Ensure proper formatting and length limits
4. Block commits that don't meet the standards

## Benefits

- **Automated Changelog Generation** - Tools can automatically generate changelogs
- **Semantic Versioning** - Automatic version bumping based on commit types
- **Better Code Review** - Clear understanding of what each commit does
- **Easier Debugging** - Quick identification of when features or fixes were added
- **Professional Standards** - Industry-standard commit message format

## Tools

This project uses:
- **Husky** - Git hooks management (root level)
- **Custom validation script** - Enforces conventional commit format (root level)
- **Pre-commit hooks** - Runs linting and validation before commits
- **Root-level coordination** - Git hooks setup managed from project root

## Setup

To set up the commit message validation:

```bash
# Install dependencies
npm install

# Set up git hooks (from root directory)
npm run setup

# Or manually set up hooks
npm run setup-hooks
```

## Troubleshooting

If your commit is rejected:

1. **Check the error message** - It will tell you exactly what's wrong
2. **Follow the format** - Use one of the allowed types with proper formatting
3. **Keep it concise** - First line should be under 72 characters
4. **Use lowercase** - Description should start with lowercase letter

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format)
- [Commitizen](https://github.com/commitizen/cz-cli) - Interactive commit message creation
