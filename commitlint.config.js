module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type rules
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New features
        'fix',      // Bug fixes
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, missing semicolons, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Build system or external dependencies
        'ci',       // CI/CD changes
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
        'security', // Security fixes
        'deps'      // Dependency updates
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    
    // Scope rules
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [2, 'always'],
    
    // Subject rules
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    
    // Header rules
    'header-max-length': [2, 'always', 72],
    'header-min-length': [2, 'always', 10],
    
    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'body-min-length': [2, 'always', 0],
    
    // Footer rules
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    'footer-min-length': [2, 'always', 0],
    
    // Breaking change rules
    'breaking-change': [2, 'always'],
    'breaking-change-max-length': [2, 'always', 100],
    
    // References rules
    'references-empty': [2, 'always'],
    'references-max-length': [2, 'always', 100]
  },
  
  // Custom parser options
  parserPreset: {
    parserOpts: {
      issuePrefixes: ['#', 'gh-', 'closes #', 'fixes #', 'resolves #'],
      referenceActions: ['closes', 'fixes', 'resolves', 'reverts', 'relates to']
    }
  },
  
  // Custom plugins (if needed in the future)
  plugins: [],
  
  // Ignore patterns
  ignores: [
    // Ignore merge commits
    (commit) => commit.includes('Merge'),
    // Ignore revert commits
    (commit) => commit.includes('Revert'),
    // Ignore WIP commits
    // (commit) => commit.includes('WIP'),
    // Ignore temporary commits
    // (commit) => commit.includes('temp') || commit.includes('tmp')
  ],
  
  // Default values for interactive prompts
  prompt: {
    settings: {
      'enableMultipleScopes': true,
      'scopeEnumSeparator': ',',
      'enableMultipleBreakingChanges': true,
      'enableMultipleIssues': true
    },
    messages: {
      skip: '⏭️  skip',
      max: 'max %d chars',
      min: 'min %d chars',
      emptyWarning: '⚠️  cannot be empty',
      upperLimitWarning: '⚠️  above limit',
      lowerLimitWarning: '⚠️  below limit'
    },
    questions: {
      type: {
        description: 'Select the type of change that you\'re committing:',
        enum: {
          feat: {
            description: '✨ A new feature',
            title: 'Features',
            emoji: '✨'
          },
          fix: {
            description: '🐛 A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛'
          },
          docs: {
            description: '📚 Documentation only changes',
            title: 'Documentation',
            emoji: '📚'
          },
          style: {
            description: '💄 Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '💄'
          },
          refactor: {
            description: '♻️  A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '♻️'
          },
          perf: {
            description: '⚡ A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '⚡'
          },
          test: {
            description: '🚨 Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨'
          },
          build: {
            description: '📦 Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '📦'
          },
          ci: {
            description: '👷 Changes to our CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '👷'
          },
          chore: {
            description: '🔧 Other changes that don\'t modify src or test files',
            title: 'Chores',
            emoji: '🔧'
          },
          revert: {
            description: '⏪ Reverts a previous commit',
            title: 'Reverts',
            emoji: '⏪'
          },
          security: {
            description: '🔒 Security fixes',
            title: 'Security',
            emoji: '🔒'
          },
          deps: {
            description: '📦 Dependency updates',
            title: 'Dependencies',
            emoji: '📦'
          }
        }
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
        enum: {
          auth: {
            description: 'Authentication and authorization',
            title: 'Auth'
          },
          api: {
            description: 'API endpoints and services',
            title: 'API'
          },
          ui: {
            description: 'User interface components',
            title: 'UI'
          },
          db: {
            description: 'Database and models',
            title: 'Database'
          },
          test: {
            description: 'Testing and test utilities',
            title: 'Testing'
          },
          build: {
            description: 'Build system and configuration',
            title: 'Build'
          },
          ci: {
            description: 'CI/CD configuration',
            title: 'CI/CD'
          },
          docs: {
            description: 'Documentation',
            title: 'Documentation'
          },
          deps: {
            description: 'Dependencies and packages',
            title: 'Dependencies'
          }
        }
      },
      subject: {
        description: 'Write a short, imperative tense description of the change'
      },
      body: {
        description: 'Provide a longer description of the change'
      },
      isBreaking: {
        description: 'Are there any breaking changes?'
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself'
      },
      breaking: {
        description: 'Describe the breaking changes'
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?'
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself'
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123".)'
      }
    }
  }
};
