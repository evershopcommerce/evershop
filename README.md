# Storefront

A modern, TypeScript-first eCommerce platform built with Express, React, GraphQL
and Postgres. Modular and fully customizable — built for developers who want to
own their commerce stack.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer

## Quick start with Docker

```bash
docker compose up -d
```

The store will be available at `http://localhost:3000` and the admin panel at
`http://localhost:3000/admin`.

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Compile the workspace packages
npm run compile:db
npm run compile

# 3. Create the database schema and an admin user
npm run setup

# 4. Optionally load demo catalog data
node ./packages/storefront/dist/bin/seed/index.js --all

# 5. Start the dev server (hot reload)
npm run dev
```

`npm run setup` prompts for your Postgres connection details and writes them to
a `.env` file in the project root. You can skip the prompts by setting
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ADMIN_EMAIL` and
`ADMIN_PASSWORD` beforehand.

For a production build:

```bash
npm run build
npm run start
```

## Project layout

| Path                              | Description                                              |
| --------------------------------- | -------------------------------------------------------- |
| `packages/storefront`             | The core platform: CLI, modules, components and services |
| `packages/postgres-query-builder` | A small PostgreSQL query builder used across the core    |
| `packages/create-storefront-app`  | Scaffolding CLI for new projects                         |
| `translations`                    | Community translation files                              |
| `seed`                            | Demo images used by the seeder                           |

Core functionality lives in `packages/storefront/src/modules`, and shared UI
lives in `packages/storefront/src/components`. Both the storefront and the admin
panel are extended through *areas* — named slots that modules and extensions
render into.

## Design system

The storefront ships with an editorial, warm-neutral design language:

- **Palette** — ink `#111827` as the primary, amber `#c2410c` as the single
  accent, on a warm paper background `#fbfaf8`.
- **Type** — Fraunces for display headings, Inter for UI text, on a fluid
  `clamp()` scale.
- **Surfaces** — soft 2-layer shadows, `1.25rem` radii and pill-shaped controls.

Tokens are defined in two places and kept in sync:

- `packages/storefront/src/modules/cms/services/tailwind.frontStore.config.js`
  (Tailwind theme)
- `packages/storefront/src/modules/base/pages/frontStore/all/global.scss`
  (CSS custom properties, typography and layout primitives)

## Scripts

| Script               | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start the development server with HMR       |
| `npm run build`      | Produce a production build                  |
| `npm run start`      | Serve a production build                    |
| `npm run compile`    | Compile `packages/storefront` with swc      |
| `npm run compile:db` | Compile the query builder package           |
| `npm run lint`       | Run ESLint across the workspace             |
| `npm test`           | Run the Jest unit tests                     |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[GNU General Public License v3.0](./LICENSE)
