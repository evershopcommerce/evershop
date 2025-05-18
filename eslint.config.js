// eslint.config.js
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';

export default [
  {
      ignores: [
      "/node_modules/",
      "**/*test.js",
      "**/tests/**",
      "**/create-evershop-app/**",
      "**/.evershop/**",
      "/.vscode/**",
      "/.git/**",
      "/.idea/**",
      "**/extensions/**",
      "**/public/**",
      "**/themes/**",
      "**/media/**",
      "**/dist/**",
      "**/packages/*/dist/**",
      "**/packages/evershop/dist/**",
      "**/packages/postgres-query-builder/dist/**",
      "**/packages/product_review/**",
      "**/packages/resend/**"
    ]},
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.d.ts"],
    plugins: {
      "@typescript-eslint": eslintPluginTypescript
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },
  {
    plugins: {
      "import": pluginImport
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions : {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      semi: "off",
      "prefer-const": "error",
      "import/no-dynamic-require": 0,
      "no-else-return": "off",
      "import/prefer-default-export": 0,
      "jsx-a11y/anchor-is-valid": 0,
      "import/no-extraneous-dependencies": "off",
      "import/no-unresolved": "off",
      "camelcase": "off",
      "no-multi-assign": "off",
      "no-template-curly-in-string": "off",
      "react/no-array-index-key": "off",
      "react/no-unstable-nested-components": "off",
      "no-continue": "off",
      "no-await-in-loop": "off",
      "no-use-before-define" : "off",
      "global-require": "off",
      "import/extensions": "off",
      "no-shadow": "off",
      "no-lonely-if": "warn",
      "no-console": "error",
      "no-useless-return": "off",
      "react/display-name": "off",
      "jsx-a11y/label-has-associated-control": "off",
      
      // Add import sorting rules
      "import/order": ["warn", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "never",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }]
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
]