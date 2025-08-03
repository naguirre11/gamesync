module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'prettier'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',
    
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'warn',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/no-unused-state': 'warn',
    'react/prefer-stateless-function': 'warn',
    
    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/anchor-has-content': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    
    // General code quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    // Import/export rules
    'no-duplicate-imports': 'error',
    
    // Performance and best practices
    'no-loop-func': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-assign': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Style consistency
    'array-callback-return': 'error',
    'consistent-return': 'warn',
    'default-case': 'warn',
    'dot-notation': 'warn',
    'no-else-return': 'warn',
    'no-empty-function': 'warn',
    'no-extra-bind': 'warn',
    'no-floating-decimal': 'error',
    'no-multi-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'no-trailing-spaces': 'error',
    'object-shorthand': 'warn',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    'space-before-blocks': 'error',
    'spaced-comment': ['error', 'always']
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off' // Allow console in tests
      }
    },
    {
      files: ['verify_*.js', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off' // Allow console in scripts
      }
    }
  ]
};