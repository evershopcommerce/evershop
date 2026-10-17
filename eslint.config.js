// eslint.config.js
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';

// Rules for packages/evershop/src/modules/import/services/** (see the block
// that uses it). One block per folder depth: a file may import a file in its
// own folder or in a folder above it inside services/, but never anything
// above services/ (a sibling module, the core), and ESLint's patterns cannot
// say "more than N levels up" for every depth at once.
function importServicesRules() {
  const root = "packages/evershop/src/modules/import/services";
  const reach = "A stage of the import engine must not reach the outside world: take it as a port of ImportDeps (modules/import/adapters has the real ones).";
  const paths = [
    ...[
      "fs", "fs/promises", "http", "https", "http2", "net", "tls", "dns",
      "dns/promises", "child_process", "worker_threads", "cluster", "os",
      "pg", "undici", "node-fetch", "axios"
    ].flatMap((name) => [name, `node:${name}`]).map((name) => ({ name, message: reach })),
    ...["crypto", "node:crypto"].map((name) => ({ name, message: "Random values and ids come from a port of ImportDeps, so that a test can fix them." }))
  ];
  const rules = {
    "no-restricted-globals": ["error",
      { name: "fetch", message: "Use the ImageFetcher port." },
      { name: "process", message: "Take configuration and the environment from the Config port." },
      { name: "setTimeout", message: "Use the Clock port." },
      { name: "setInterval", message: "Use the Clock port." },
      { name: "setImmediate", message: "Use the Clock port." },
      { name: "performance", message: "Use the Clock port." },
      { name: "crypto", message: "Use the Ids port." }
    ],
    "no-restricted-properties": ["error",
      { object: "Date", property: "now", message: "Use the Clock port." },
      { object: "Math", property: "random", message: "Use the Ids port." },
      { object: "process", property: "env", message: "Take configuration from the Config port." }
    ],
    "no-restricted-syntax": ["error",
      { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "new Date() reads the clock. Use the Clock port." }
    ]
  };
  const blocks = [];
  // Folders up to six levels below services/.
  for (let depth = 0; depth <= 6; depth += 1) {
    blocks.push({
      files: [`${root}/${"*/".repeat(depth)}*.ts`],
      rules: {
        ...rules,
        "no-restricted-imports": ["error", {
          paths,
          patterns: [
            { group: [`${"../".repeat(depth + 1)}**`, "@evershop/*"], message: "A stage of the import engine must not import the core or another module (database, services, configuration): take it as a port of ImportDeps." },
            { group: ["**/adapters/**", "**/worker/**", "**/testing/**", "**/api/**"], message: "The stages sit below the adapters, the worker and the test doubles; they must not import them." }
          ]
        }]
      }
    });
  }
  return blocks;
}

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
      "jsx-a11y/role-supports-aria-props": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
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
  },
  // The stages of the CSV import engine (reader, rules, plan, report, runner)
  // are pure: what they need from the outside world comes in through the ports
  // of one `ImportDeps` object, so that a test can replace all of it. This keeps
  // the database, the file system, the network, the clock, random numbers and
  // the environment out of them. The real implementations are in
  // modules/import/adapters/, which these rules do not cover.
  ...importServicesRules()
]