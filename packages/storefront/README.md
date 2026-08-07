# @storefront/core

The core of the Storefront platform: the CLI, the module system, the GraphQL
layer, and the React components that power both the storefront and the admin
panel.

## Introduction

Storefront is a modern, TypeScript-first eCommerce platform built with Express,
React, GraphQL and Postgres. It offers essential commerce features in a modular,
fully customizable architecture.

## Installation

This package is part of the Storefront monorepo and is normally consumed through
the root workspace. See the [repository README](../../README.md) for setup
instructions.

```bash
npm install @storefront/core
```

## What's inside

| Path             | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `src/bin`        | CLI entry points: `install`, `build`, `dev`, `start`, `seed`, `user` |
| `src/modules`    | Core modules — catalog, checkout, oms, customer, cms, auth, tax…    |
| `src/components` | Shared React components for the storefront and admin                |
| `src/lib`        | Framework internals: routing, middleware, webpack, postgres, i18n   |
| `src/types`      | Public TypeScript types                                             |

## CLI

```bash
storefront install            # create the schema and an admin user
storefront build              # production build
storefront dev                # development server
storefront start              # serve a production build
storefront seed --all         # load demo catalog data
storefront user:create        # create an admin user
storefront user:changePassword
```

## License

[GNU General Public License v3.0](../../LICENSE)
