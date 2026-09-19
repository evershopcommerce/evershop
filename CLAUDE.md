# EverShop Core — Project Instructions for Claude

This is the **EverShop core repository** — the codebase for the modular monolith eCommerce platform built on Express + React (SSR) + PostgreSQL + GraphQL. The package source lives at `packages/evershop/src/` and is published as `@evershop/evershop`.

The author and maintainer is The Nguyen (`support@evershop.io`). Assume deep familiarity with the codebase.

## Read the wiki first

A curated wiki for this codebase lives in `wiki/`. **Before answering architectural questions or making non-trivial changes, read the relevant wiki page(s)**, not just the docs in `../docs/` or the source code. The wiki is hand-curated to be the fastest source of truth for "how does this actually work" questions.

- `wiki/index.md` — catalog of all pages with one-line summaries. Read this first to find the right page.
- `wiki/log.md` — chronological record of ingests, queries, and audits.
- `wiki/<topic>.md` — the content pages.

If a page doesn't exist for the topic you need, that's a signal to **ingest** (see Operations below).

## Operations

### Query

When the user asks a question that the wiki could answer:

1. Open `wiki/index.md` and find candidate pages.
2. Read those pages.
3. Answer using the wiki content. Cite pages by filename (e.g., "see `wiki/widgets.md`") so the user can jump in.
4. If the wiki content is **outdated relative to the code** (rename, removal, signature change), update the wiki page in the same response and append a note to `wiki/log.md`.

### Ingest

When the user explains something non-obvious about the codebase, or when you investigate an unfamiliar subsystem and the answer is worth keeping:

1. Discuss the takeaways with the user inline (don't go silent for minutes writing files).
2. Decide whether the knowledge belongs on an existing page or warrants a new one. Prefer updating existing pages — a page with five short sections beats five tiny pages.
3. Write/update the page using the conventions below.
4. Update `wiki/index.md` if a new page was added or a description changed.
5. Append a one-line entry to `wiki/log.md` with prefix `## [YYYY-MM-DD] ingest | <topic>`.

### Lint

When asked to audit the wiki, or when you notice drift while answering questions:

- Verify file paths and line references still resolve (they decay as files move).
- Check that named functions/flags/files referenced in the wiki still exist (`grep`, `Read`).
- Reconcile contradictions between pages.
- Flag pages that haven't been touched in a long time *and* describe an area that has clearly evolved (use `git log --oneline -- <path>` to spot churn).
- Append a `## [YYYY-MM-DD] lint | <scope>` entry to `wiki/log.md` summarizing what was checked and what changed.

## Page conventions

Every page follows this shape:

```md
# <Title>

**TL;DR.** One paragraph. The thing the user came here to learn, said directly.

## <Section>

Body. Code snippets go in fenced blocks with the language tag. File references use `relative/path:line` format so the user can click into them.

## See also
- [Other page](other-page.md) — one-line hook
```

Specifics:

- **File paths.** Always relative to the package root (`packages/evershop/src/...`) unless the file lives outside that tree. Add `:line` suffix when pointing at a specific implementation.
- **Code samples.** Prefer real, compilable snippets pulled from the codebase over invented examples. If you must invent, mark it clearly.
- **No marketing.** No "powerful", "robust", "comprehensive". Just what it is and how it works.
- **Be willing to contradict the public docs.** If `../docs/` is wrong, the wiki should say so and explain the actual current behavior.
- **Date format.** ISO `YYYY-MM-DD` everywhere.

## EverShop quick reference

For deep understanding, read the wiki pages. This section is the cheat sheet.

### Stack
- **Runtime:** Node.js ≥ 20, Express, React 18 with SSR + hydration
- **Database:** PostgreSQL 13+ (no other DBs supported; SQL is plain Postgres)
- **GraphQL:** schema assembled at startup from per-module `.graphql` files
- **Bundler:** webpack 5 with SWC for transforms (no Babel)
- **Forms:** react-hook-form (wrapped by `components/common/form/Form.tsx`)
- **Styling:** Tailwind v4 + PostCSS + custom plugins

### Application type
Multi-page application (MPA) — each route gets its own bundle and a full HTML response. Hydrated on the client. Not a SPA — there is no client-side router.

### File / folder conventions
- **Migrations:** `Version-X.Y.Z.ts` (hyphen, not underscore) in `<module>/migration/`
- **Routes:** folder name = route ID, alphabetic only (a-z, A-Z), `route.json` declares the route
- **Middleware:** lowercase first letter, bracket-syntax ordering `[after]name[before].ts`
- **Master components:** uppercase first letter, `.tsx`, optional `export const layout = { areaId, sortOrder }`
- **Shared between routes:** folder named `routeA+routeB/` (e.g. `productEdit+productNew/`)
- **Site-wide middleware:** `pages/admin/all/`, `pages/frontStore/all/`, `pages/global/`, `api/global/`
- **Subscribers:** `subscribers/<event_name>/<handler>.ts`
- **Modules:** core in `packages/evershop/src/modules/`, user extensions in `extensions/` (project root)
- **Module ID:** must be unique across the system

### Bootstrap is a hard wall
The hook system and registry are **locked** after every module's `bootstrap.ts` runs. Calling `addProcessor`, `hookBefore`, `hookAfter`, `registerWidget`, `registerJob`, `registerEmailService`, `registerPaymentMethod`, etc. from inside a middleware or request handler **throws**. Always register from `bootstrap.ts`.

### Public import paths
See `wiki/reference.md` for the full table. The most common ones:

```ts
import { select, insert, update, del, insertOnUpdate } from '@evershop/evershop/lib/postgres/query';
import { pool, getConnection } from '@evershop/evershop/lib/postgres';
import { addProcessor, getValue } from '@evershop/evershop/lib/util/registry';
import { hookBefore, hookAfter, hookable } from '@evershop/evershop/lib/util/hookable';
import { emit } from '@evershop/evershop/lib/event';
import { createSubscriber } from '@evershop/evershop/lib/event/subscriber';
import { buildUrl, buildAbsoluteUrl } from '@evershop/evershop/lib/router';
import { registerWidget } from '@evershop/evershop/lib/widget';
import { setContextValue, getContextValue } from '@evershop/evershop/graphql/services';
```

### Common pitfalls
- `import { Request, Response } from 'express'` — wrong. Use `EvershopRequest`/`EvershopResponse` from `@evershop/evershop/types/request` and `types/response`.
- `module.exports` — wrong. ESM. Use `export default`.
- MySQL syntax — wrong. PostgreSQL. Use `IDENTITY` or `SERIAL`, double-quoted identifiers, `JSONB`, `gen_random_uuid()`.
- `migrations/` (plural) folder — wrong. Singular `migration/`.
- `Version_1.0.0.ts` (underscore) — wrong. Hyphen: `Version-1.0.0.ts`.
- `pages/frontend/` — wrong. `pages/frontStore/`.
- Arrow functions in hookable / processor callbacks when context is needed — `this` is bound via `.call()`, arrow functions can't access it.
- Adding a hook or processor from a middleware — locked after bootstrap, throws.

### Common mistakes

The pitfalls above are syntactic — caught by lint or first compile. The ones below are runtime or integration traps. They compile cleanly and fail later. Each has bitten the codebase; the wiki pages explain *why* and show the fix.

- **API handler that sends a response with a 2-arg `(request, response)` signature → `ERR_HTTP_HEADERS_SENT`.** The framework inspects `function.length`; a 2-arg handler is treated as passive, so it auto-calls `next()` after your function resolves and `apiResponse` tries to send headers again. If you call `response.json()` / `response.send()` / `response.redirect()`, declare the third `next` parameter even if you never call it — the 3-arg signature disables auto-next. See [wiki/middleware-system.md → Active vs passive middleware](wiki/middleware-system.md#active-vs-passive-middleware-2-arg-vs-3-arg).
- **Chaining `.where()` or `.orderBy()` directly off `.on()` in a query-builder JOIN → `where is not a function` at runtime.** `.on()` returns a `Node`; `.where()` and `.orderBy()` live on `Query`/`SelectQuery`, not `Node`. Hold the query handle in a variable and call `.where()` / `.orderBy()` on it separately. The `.where().and().execute()` chain works fine (Node has `.and()` and `.execute()`) — the trap is only joins. See [wiki/database.md → What chains on what](wiki/database.md#what-chains-on-what-the-gotcha).
- **Passing `(column, alias)` to the top-level `select(...)` → silent column rename → `column "X" does not exist` at runtime.** The top-level `select(...)` is *variadic over columns* — `select('foo.uuid', 'method_uuid')` treats both strings as columns, not as `(column, alias)`. Only the chained `.select(col, alias)` form supports aliasing. Use `select().from(table).select(col, alias)` instead. See [wiki/database.md → `select(...)` is variadic](wiki/database.md#select-is-variadic--it-does-not-take-column-alias).
- **Passing `{ isSQL: true, value: '...' }` to `.given()` for raw SQL in UPDATE/INSERT → `invalid input syntax for type ...` at runtime.** `UpdateQuery.given` / `InsertQuery.given` call `toString(value)` on every entry, which JSON-stringifies object values. The `{isSQL, value}` raw-escape convention is **only** honored inside `.where()` / `Leaf` / `RawLeaf`, not for SET / VALUES. When you need raw SQL on the write side (`COALESCE(col, NOW())`, `col + 1`, `gen_random_uuid()`), drop to `connection.query()` with bind parameters for just the user values. Canonical pattern: `oms/services/updateShipmentStatus.ts:79-100`.
- **`.execute(connection)` / `.load(connection)` on a fresh `getConnection()` PoolClient before `startTransaction(connection)` → `Release called on client which has already been released to the pool` at runtime.** The query-builder's internal `release()` only short-circuits when `connection.INTRANSACTION === true`, a flag exclusively set by `startTransaction`. Pre-tx reads on a freshly-acquired PoolClient auto-release it back to the pool, and the next `startTransaction(connection)` operates on a detached client. Rule: either call `startTransaction` IMMEDIATELY after `getConnection`, or run pre-tx reads on the shared `pool` (which `release()` ignores) and acquire the dedicated PoolClient only at the top of the tx. The canonical "delayed tx" pattern (necessary when an external network call has to run between read and write — e.g. `carrier.createLabel()`) is in `oms/services/createShipment.ts:330-410`.
- **Hook called after a conditional early return in a React component → `Rendered more hooks than during the previous render`.** All hooks must run in the same order on every render. If one render takes an early return before a `useEffect` and the next render reaches it, React errors. Move every hook above any conditional return.
- **`.admin.graphql` type referenced from a non-admin `.graphql` file → "Unknown type X" at storefront schema build.** `buildStoreFrontSchema` filters out `.admin.graphql`; types defined there aren't visible to the storefront schema. Either move the type to a non-admin file or mark the referencing file `.admin.graphql` too. The two schemas build separately — admin sees both, storefront sees only non-admin.
- **Dropping a DB column without grepping across modules.** EverShop modules share tables. A resolver in `modules/base/` may read a column owned by `modules/checkout/`. When dropping a column, `grep -rn "table\\.column" packages/evershop/src` across the whole tree, not just the owning module.
- **New `.js` files in new code paths.** The codebase has mixed `.js` and `.ts` because the migration to TypeScript is incremental, but **new authorship is `.ts`** (or `.tsx` for React). Editing an existing `.js` keeps it `.js` for small changes; full rewrites are a good moment to switch. See [wiki/module-structure.md → TypeScript by default](wiki/module-structure.md#typescript-by-default).
- **`hookable()` keys hooks by the wrapped function's `.name`, so a `…Impl` declaration silently kills its public hooks.** `hookable(fooImpl)` registers under `'fooImpl'`, but a `hookBeforeFoo` helper that calls `hookBefore('foo', …)` registers under `'foo'` — they never meet, the hook never fires, and nothing errors (the wrapped function still runs, the transaction still commits). Wrap a **named function expression** whose intrinsic name *is* the hook key, even if the binding differs: `const fooImpl = async function foo() {…}` (the `checkout.ts:10` idiom — `const _checkout = async function checkout(`). A plain `function fooImpl() {}` declaration sets `.name = 'fooImpl'` and breaks it. See [wiki/hooks.md → Common pitfalls](wiki/hooks.md#common-pitfalls); guard test `modules/oms/tests/unit/hookNameAlignment.test.js`.
- **A widget `settingComponent` that reads a list setting as `watch('settings.x') ?? initial` works in the page-builder drawer but throws `items.map is not a function` on the legacy `/admin/widgets/edit` page.** The two surfaces seed settings differently: the drawer's page-level form holds real arrays/objects, but the legacy `<Form>` seeds list fields as a JSON **string** via a hidden `defaultValue={JSON.stringify(...)}` input — and `??` only guards null, so the string reaches `RepeatableAccordion` and would also fail the widget's AJV array schema on save (settings are never parsed in the save path). Read list settings with `useArraySetting('settings.x', initial)` and mutate via `asArray(getValues('settings.x'), initial)` (both from `@components/common/page-builder`), or hold the array with `useFieldArray` like `SlideshowSetting`. See [wiki/page-builder.md → Widget settings run on two surfaces](wiki/page-builder.md#widget-settings-run-on-two-surfaces-list-field-trap).

## Doing work in this repo

- The published package is built from `src/` to `dist/` via SWC (`npm run compile`). Runtime loads `.js` from `dist/`. When editing, edit `.ts` in `src/`.
- Tests run with Jest: `npm test` from the repo root.
- Lint with `npm run lint`.
- Dev server: `npm run dev` (uses `webpack-dev-middleware` + HMR).
- Build for production: `npm run build` then `npm run start`.
- Never bypass `husky` hooks (`--no-verify`) or skip type/lint failures without an explicit go-ahead.
