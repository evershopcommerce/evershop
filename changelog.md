# v2.2.1 (2026-08-11)

The largest EverShop release since 2.0. It consolidates the previously drafted-but-unpublished 2.1.3 work (React 19) with four months of development on top of v2.1.2: a visual page builder, a blog module, entity custom fields (metafields), a multi-language storefront with a translated admin, a rebuilt shipping and fulfillment stack, built-in cloud file storage, product recommendations, and a substantial security and performance pass.

31 database migrations across 10 modules run automatically on first start. Please read **Breaking Changes** and **Upgrade Notes** before upgrading. This release also contains fixes for several security vulnerabilities — upgrading promptly is recommended.

## Highlights

* **Visual Page Builder** — drag-and-drop storefront editing with drafts, publish, and scheduled rollouts.
* **Blog** — a full blog module: posts, categories, tags, comments, storefront pages and widgets.
* **Metafields** — typed custom fields on products, categories, collections, customers, orders, and the shop itself, with theme provisioning.
* **Multi-language** — runtime-translated storefront with locale-prefixed URLs, plus an independently-translated admin (17 locales bundled).
* **Shipping providers & multi-shipment** — pluggable shipping providers, first-class shipments with per-shipment status, carrier/label integration, package management.
* **Cloud file storage** — S3, Azure Blob, and Google Cloud Storage built in, configured from the admin.
* **Product recommendations** — related products, frequently-bought-together, upsell and cart cross-sell shelves.
* **React 19**, per-IP rate limiting, sitemap.xml + robots.txt, landing pages, automatic URL redirects, and large-catalog performance fixes.

## Breaking Changes

* **Upgraded to React 19** (from React 17) (#863). The framework runs on React 19, and because EverShop resolves React through a single hoisted copy (webpack alias), every extension and theme now runs on React 19 as well. Update React-17-era code:
    - `defaultProps` on function components is removed — use ES default parameters (`function C({ x = 1 })`).
    - String refs, `findDOMNode`, legacy `ReactDOM.render`/`ReactDOM.hydrate`, and legacy context are removed — use callback/`useRef` refs, `createRoot`/`hydrateRoot`, and `createContext`.
    - Do not call the translation helper `_()` at module scope (top-level `const` arrays/objects): it freezes the translation at import time and causes an SSR/client hydration mismatch under React 19. Call `_()` inside the component (render time).
    - Read client-only state (e.g. `window.location`) in a `useEffect`, not in a `useState` initializer, so the first client render matches the server.
    - See `specifications/react-19-upgrade.md` for the full audit and migration detail.
* **`react-toastify` removed — toasts now use `sonner`.** Extensions importing `react-toastify` must switch: `import { toast } from 'sonner'` (the `toast.*` call surface is close to drop-in) and replace `<ToastContainer/>` with sonner's `<Toaster/>`.
* **Shipping is now provider-based** (#929). The old flat zone → method → rate model was replaced by *shipping providers*. Existing zones, methods, and rates are migrated automatically into the built-in **Core provider** (`core_shipping_method`, `core_shipping_method_rate`, `shipping_zone_provider` tables); the legacy tables/columns are dropped at the end of the migration chain. Custom code that queried the legacy shipping tables, or extensions that added shipping methods directly, must move to the provider registry (which also supports live-quoted rates with per-provider timeouts).
* **Fulfillment is now multi-shipment.** `order ↔ shipment` went from 1:1 to one-to-many: each shipment carries its own item assignments and its own status, and `order.shipment_status` is an item-based rollup over physical items. The pre-shipped state was dropped — legacy `pending`/`processing` shipment rows are collapsed to `shipped` and order rollups are backfilled by migration. Consumers of the shipment REST/GraphQL shapes must adapt.
* **Widget storage refactor.** The `widget` table was renamed to `widget_instance`, and placement moved to a `widget_placement` table with one row per (widget instance, route, area). Widget instances are now scoped to the theme they were created under. Any direct SQL or custom tooling against the old `widget` table breaks; the admin UI, REST, and GraphQL surfaces are updated.
* **Branding and several config keys moved from `config.json` to admin settings.** The logo, favicon, social banner, and Google Analytics 4 ID are now managed under Store Setting → Branding; currency, display timezone, weight and dimension units under Store Setting; catalog, pricing, and tax options under their own settings pages; guest checkout under checkout settings. Legacy config values are still honored as fallbacks — **except `themeConfig.logo`, which was removed entirely: re-upload your logo in the admin after upgrading.**
* **`category.include_in_nav` dropped.** Storefront navigation is built with the menu widgets now (including the new footer menu widget), not by flagging categories. Rebuild your navigation with the menu widget if you relied on this column; GraphQL no longer exposes `includeInNav`.
* **`url_rewrite.language` dropped.** URLs are locale-agnostic: locale is expressed as a URL prefix (`/de/<slug>`), and the slug is shared across locales.
* **`node-cron` upgraded 3 → 4.** Verify custom `registerJob` schedule expressions against node-cron v4 semantics.
* **`--skip-minify` removed** (and the `build-fast` npm script). Builds are always minified; overall build time was optimized instead (see Performance).
* **Removed the unused CKEditor packages** (`@ckeditor/ckeditor5-build-classic`, `@ckeditor/ckeditor5-react`).

## New Features

### Visual Page Builder (new `pageBuilder` core module)

A drag-and-drop visual editor for the storefront at `/admin/page-builder`:

* Edit any storefront route (plus CMS pages and landing pages) by composing widgets into the theme's areas, with layout-aware drag/drop and moves.
* **Draft → publish workflow**: changes accumulate in a per-admin, per-theme draft changeset with per-widget auto-save; publish immediately or **schedule a rollout** — rollout plans remain editable and cancelable until they run.
* Inline editing on the canvas: text and images can be edited in place; the image picker supports cloud storage.
* Layers panel, a "Globals" view for site-wide areas, a session/page picker (Homepage first), per-widget styling controls, and link fields that resolve products/categories/CMS pages/blog posts through a unified link resolver.
* Widget admin redesign to match: theme-scoped widget instances and a per-(route, area) placements model.
* Hardened in a dedicated security pass and covered by an e2e test suite.

### Blog (new `blog` core module) (#285)

* Posts, categories, and tags with per-post SEO descriptions; comments and reactions.
* Storefront blog pages plus blog widgets for the page builder; Blog Home is available in the link picker with proper thumbnails.

### Entity custom fields — metafields

* Typed metafield definitions (text, long text, rich text via the block editor, number, boolean, date, select, JSON/group, and list variants) attachable to **products, categories, collections, customers, orders, and the shop**.
* Values stored per entity (JSONB `meta_data`), validated with AJV on write; admin editing cards on the relevant edit pages; audience-gated GraphQL exposure (customer-visible vs admin-only).
* **Theme integration**: a theme can declare metafield definitions in `theme.json` — they are provisioned at theme activation and on boot (with attribution and conflict reporting) — and render values with the new storefront `<Metafield>` component.
* The footer copyright line is now a shop metafield, editable from the page builder.

### Multi-language storefront & translated admin (#311)

* **Runtime translation** — no rebuild needed. Per-locale CSV dictionaries live in the project's `translations/` folder; English is the source language.
* Enabled storefront languages and the default language are admin settings. Non-default locales get URL prefixes (`/de/...`) with canonical handling; REST APIs take an `X-Locale` header.
* The **admin panel has its own language**, independent of the storefront.
* Translations are bundled for 17 locales (de, el, es, fa, fr, hu, it, mn, nb, ne, nl, pt, ru, sr, ta, vi, zh).

### Landing pages, root-level CMS URLs & automatic URL redirects

* **Landing pages**: standalone marketing pages whose body is built entirely in the page builder, served at root-level friendly URLs, with an admin grid, duplication, status/scheduling, and SEO fields. Landing pages win URL collisions deterministically.
* **CMS pages moved to root-level URLs** (`/<url_key>`); old `/page/<url_key>` URLs permanently redirect (301). Existing pages are backfilled by migration.
* **Automatic URL redirects**: renaming a product/category/CMS/landing-page slug now captures a redirect from the old path (302 via a new `url_redirect` table), with redirect-chain collapse and periodic cleanup — old links and bookmarks keep working.

### Sitemap & robots.txt (#506)

* Auto-generated `/sitemap.xml` (a sitemap index plus per-content-type children) covering products, categories, CMS pages, and landing pages, with a **collector registry** so extensions can add their own URL sources.
* Multi-language stores get one entry per enabled locale with self-referential `hreflang` + `x-default` alternates.
* Regenerated by a cron every 30 minutes with cheap change-detection (skips writing when nothing changed); served statically.
* Dynamic `robots.txt` with an absolute `Sitemap:` line — overridable via a setting or by shipping a physical `public/robots.txt`.

### Shipping providers, multi-shipment & carrier integration (#929)

* **Provider abstraction**: shipping rates come from registered providers; the built-in Core provider reproduces the classic zone/method/rate setup (flat, percentage, price/weight-based rates, API-calculated rates). Extension providers can quote live rates with configurable timeouts.
* **Multi-shipment**: ship an order in several packages — each shipment has its own items, status, tracking, and (optionally) purchased label (`label_url`/format persisted). Order-level shipment status rolls up from items; digital items are excluded.
* **Carrier registry**: register carriers that create labels, generate tracking URLs, and push status updates back into EverShop; per-method default carrier and service code pre-select in the ship dialog; carrier tracking URLs from aggregators (Shippo/EasyPost/ShipStation-style) are persisted.
* **Package management**: admin-managed parcel sizes, product → package assignment, and dimension/weight snapshots that flow `cart_item` → `order_item` → carrier requests.

### Cloud file storage: S3, Azure Blob & Google Cloud Storage

* The three providers are now built into core (previously separate extensions), selected and configured at runtime from a new **System Setting** page — no restart needed; credentials can also come from env/config, and secrets are masked in the admin.
* Fixes doc-verified defects of the old extensions along the way: regional S3 endpoints (plus custom endpoint / path-style for R2 and MinIO), correct Content-Type on upload, listing beyond 1,000 keys, Azure public-access handling, and URL encoding.
* The storage host is automatically allowed for the `/images` optimizer; deletes are idempotent across providers.

### Product recommendations

* **Related Products**: rule-based (same category / same collection / same attribute values, with price band, priority ordering, and manual picks), configurable globally, per category, and per product.
* **Frequently Bought Together**: powered by co-purchase statistics (association confidence + lift with configurable thresholds), rebuilt nightly and on demand from order history. Also reaches the **cart page**: a widget aggregates co-purchase candidates across all cart items (per-pair gating, strongest-affinity ranking, in-cart items and their variants excluded), exposed as `Cart.crossSellProducts`.
* **Upsell shelf**: derived automatically from the related-products rules restricted to pricier products, exposed as `Product.upsellProducts` — nothing extra to configure.
* Three new page-builder widgets render the shelves on product pages with full status/stock/visibility gating and variant-group awareness; admin cards on product and category editing (modes, manual picks, computed-candidate previews); new REST endpoints for manual links and stats recompute; new GraphQL fields `Product.relatedProducts` / `Product.crossSellProducts`.

### Checkout

* **Zero-total orders** (100% discounts, free products) check out through an automatic "No payment required" method instead of erroring (#996).
* **Guest checkout toggle** — an admin setting; when off, checkout requires login (with redirect back). Defaults to allowed; the legacy `checkout.allowGuestCheckout` config is honored as fallback.
* **Mobile checkout**: the order summary now comes first as a sticky, collapsible bar; shipping/payment/billing option cards are clickable across their whole surface.
* Fixed: shipping note not showing on checkout (#955); billing country missing/restricted for virtual products (#934).

### Storefront theme refresh & UX

* The default frontStore theme was re-skinned, with aligned category-page filters and product counts, a constrained footer, and grid-safe no-image placeholders.
* **Accessibility pass**: product-card Add-to-Cart is reachable by keyboard and touch (not hover-only), field error messages are wired to inputs via `aria-describedby`.
* Unavailable variant options are disabled in the storefront selector (#964); storefront images are sized from the configured aspect ratio (less layout shift); slideshow slides size to their images with real mobile dimensions.
* Live **SEO snippet preview** on product and category editors.
* **Product duplication** (#276): duplicate from the product grid into a prefilled creation form (suffixed sku/url_key/name, collections copied, `product_duplicated` event).
* New **footer menu widget**; refined collection/blog/mosaic widget layout settings.

### Platform & operations

* **Per-IP rate limiting** built in (#1001): pages ~300 req/min, APIs 120 req/min, and login/registration/password-reset 8 attempts per 15 minutes; static assets exempt. Honors `TRUST_PROXY_HOPS` for correct client IPs behind proxies (default: 1 hop).
* **`EVERSHOP_HOME_URL`** environment override for the public base URL, validated at boot (#960).
* **Theme content tooling**: new `theme:status`, `theme:uninstall`, and `theme:export-content` commands; themes can ship installable content (`theme.json`) and serve their own `public/` assets (#830, #845 — thanks @starry-osean).

## Security

Upgrading is recommended — this release fixes:

* Unauthenticated SSRF, unauthenticated IDOR on customer endpoints, and stored XSS (CWE-918, CWE-639, CWE-79) (#928).
* Unauthenticated account takeover via missing authorization on the customer update endpoint (#952).
* A page-builder security hardening pass (URL/content validation in the editor pipeline).
* Brute-force / credential-stuffing exposure on auth endpoints (covered by the new rate limiter).
* All high-severity dependency alerts cleared (#937).

## Performance

* **Large-catalog fixes**, found by load-testing a 500k-product catalog (#1004): indexed `url_rewrite.request_path` (every storefront request resolves URLs against it), fixed a keyword-search query shape that bypassed the GIN index, and removed an O(n²) id-list query-building pattern that also hit the 65,535-parameter wire limit.
* **Build time** significantly reduced (#967–#969); minification is always on.
* SSR render errors now return a 500 instead of hanging the request; GraphQL field errors return partial data instead of failing the page.
* Session-store and boot-path cleanups; the setting cache is warmed at boot for synchronous hot paths (pricing formatter, email helpers).

## Bug Fixes

* Built-in `<Form>` buttons no longer double-submit (every built-in form used to POST twice).
* Google Analytics now loads in production builds.
* Fresh installs no longer log a red `relation "setting" does not exist` error on first boot against an empty database.
* Migration runner sorts versions by semver correctly (`1.0.10` no longer runs before `1.0.2`) (#961).
* Widget types may share component files (settingComponent/previewComponent) — fixed an AreaLoader identifier bug that broke the admin bundle when two types pointed at one file.
* `cms:page` widget links resolve through `url_rewrite` (they rendered dead links before).
* Cloud-storage image URLs keep their scheme intact in the page-builder image picker.
* Empty settings are no longer saved as the string `"null"`.
* Shipping zone dialog sizing fixed; province selection uses a searchable select.
* Setup no longer crashes with `ValidationError: Progress Plugin has been initialized using an options object` (#932); GitHub Actions build no longer fails on the SWC native module.
* Dev server boot is hardened against compile failures and file-watcher races.
* Variant option filter guards undefined values; metafield single-field setters fixed (#1006).
* Page-builder fixes: publish keeps you on the current route, the session picker no longer pops mid-session, layers show the right widgets on landing pages, draft-aware widget lookups, drops into empty areas.

## Developer Experience

* New public import paths: `@evershop/evershop/lib/urn`, `@evershop/evershop/lib/metafield`, `@evershop/evershop/lib/widget/linkResolver`, and `@evershop/evershop/base/services/sitemap` (register your own sitemap collectors).
* Two new core modules (`blog`, `pageBuilder`) demonstrate current module conventions end-to-end; the page builder ships with an e2e suite.
* Runtime translation APIs and the locale context are available to extensions; admin strings are translatable.

## Dependencies

* Added: `@aws-sdk/client-s3`, `@azure/storage-blob`, `@google-cloud/storage`, `express-rate-limit`, `sonner`, `undici`, `fast-json-stable-stringify`, `@evershop/editorjs-product-list`.
* Upgraded: `react`/`react-dom` 17 → 19, `node-cron` 3 → 4, `webpackbar` 5 → 7, `axios` 1.18, `multer` 2.2.
* Removed: `react-toastify`, `@ckeditor/ckeditor5-build-classic`, `@ckeditor/ckeditor5-react`.

## Upgrade Notes

1. **Back up your database.** This release runs 31 migrations, several of which transform data (shipping zones → Core provider, shipment status collapse, widget table rename) and drop legacy columns/tables.
2. Update `@evershop/evershop`, reinstall dependencies, run `npm run build`. Migrations apply automatically on first start.
3. **Re-upload your logo** in admin → Store Setting → Branding (`themeConfig.logo` is gone). Favicon, social banner, and GA4 also live there now.
4. If your navigation relied on `include_in_nav`, rebuild it with the menu widgets.
5. Review your shipping setup under the new provider-based settings UI — data is migrated automatically, but verify rates.
6. For custom themes/extensions: apply the React 19 notes above, switch `react-toastify` imports to `sonner`, and update anything that touched the `widget` table or legacy shipping tables directly.
7. Custom cron jobs: verify schedules against node-cron v4.

## Credits

Thanks to everyone who contributed to this release: @treoden, @starry-osean (theme public assets, #845), Sang.Tra.

# v2.1.2 (2026-04-03)

## Breaking Changes
* Update payment status for PayPal orders
  - `authorized` -> `paypal_authorized`
  - `captured` -> `paypal_captured`

* Update payment status for Stripe orders
  - `authorized` -> `stripe_authorized`
  - `captured` -> `stripe_captured`
  - `refunded` -> `stripe_refunded`
  - `partial_refunded` -> `stripe_partial_refunded`
  - `failed` -> `stripe_failed`

## What's Changed
* [BUG] v2.1.1 completely breaks bold/italic/links in the CMS Editor #882 by @treoden in https://github.com/evershopcommerce/evershop/pull/885
* Feat: Add area debug feature by @treoden in https://github.com/evershopcommerce/evershop/pull/887
* fix: convert backslash paths to forward slashes for Tailwind v4 on Windows by @Sigmabrogz in https://github.com/evershopcommerce/evershop/pull/891
* Fix event management by @treoden in https://github.com/evershopcommerce/evershop/pull/896
* Add a query wrapper for better postgres query typing by @treoden in https://github.com/evershopcommerce/evershop/pull/895
* Feat: Improve typescript for better development experience by @treoden in https://github.com/evershopcommerce/evershop/pull/897
* Feat: Add sonner component by @treoden in https://github.com/evershopcommerce/evershop/pull/899
* Chore: Less strict order status update by @treoden in https://github.com/evershopcommerce/evershop/pull/900
* Chore: Update order status code for stripe by @treoden in https://github.com/evershopcommerce/evershop/pull/901
* Chore(deps): Bump handlebars from 4.7.8 to 4.7.9 by @dependabot[bot] in https://github.com/evershopcommerce/evershop/pull/902
* Chore(deps): Bump sass from 1.97 to 1.98 by @treoden in https://github.com/evershopcommerce/evershop/pull/903
* Fix: Fix listing style editor by @treoden in https://github.com/evershopcommerce/evershop/pull/904
* Fix: Fix toolbox overlapping issue by @treoden in https://github.com/evershopcommerce/evershop/pull/905
* Fix: Some warning messages from React by @treoden in https://github.com/evershopcommerce/evershop/pull/906
* Fix: fix checkoutForm area ID by @treoden in https://github.com/evershopcommerce/evershop/pull/907
* Fix: Scroll to shipping method list when it is unselected by @treoden in https://github.com/evershopcommerce/evershop/pull/909
* Fix: Improve typing by @treoden in https://github.com/evershopcommerce/evershop/pull/911
* Fix: Fix the area sort order in the registration form by @treoden in https://github.com/evershopcommerce/evershop/pull/912
* Fix: Use new data in the token payload by @treoden in https://github.com/evershopcommerce/evershop/pull/913
* Fix: Upgrade stripe packages and refactor the order status for stripe… by @treoden in https://github.com/evershopcommerce/evershop/pull/914
* Fix: Refactor the paypay payment status by @treoden in https://github.com/evershopcommerce/evershop/pull/915
* Chore(deps): Bump zero-decimal-currencies from 1.2 to 1.6 by @treoden in https://github.com/evershopcommerce/evershop/pull/917
* Fix: Can not unassign a product from a category by @treoden in https://github.com/evershopcommerce/evershop/pull/919
* Fix: Province list does not update when changing country by @treoden in https://github.com/evershopcommerce/evershop/pull/920
* Fix: Fix the missing exports by @treoden in https://github.com/evershopcommerce/evershop/pull/921
* Fix: Fix checkout error message handling by @treoden in https://github.com/evershopcommerce/evershop/pull/924


# v2.1.1 (2026-01-12)

## New Features

* Support digital products
* Support Shadcn UI components
* Use single webpack instance (one for backend and one for frontend) in dev mode to improve the development experience

## Breaking Changes
* Remove some components in favor of using shadcn/ui components
  - `components/common/Button.jsx`
  - `components/common/modal/Modal.jsx`
  - `components/common/modal/useModal.jsx`
  - `components/admin/Badge.jsx`
  - `components/admin/Card.jsx`
  - `components/admin/Circle.jsx`
  - `components/admin/Dot.jsx`
* Update Tailwind CSS from v3 to v4, 
* Email service refactored to use a single email service instance. Please upgrade your sendgrid and resend extensions to the latest version.

## Dependency Updates
* Upgrade tailwindcss to v4
* Upgrade axios to v1.13.2
* Replace react heroicons with lucide-react

## Bug fixes

* Fix: Fix wrong summary value display in the checkout success page in https://github.com/evershopcommerce/evershop/commit/c3f0a1185eeddfa006a35ebe46722c9257717830
* Fix: Improve the login and register function to except additional data in https://github.com/evershopcommerce/evershop/commit/62242e07400bc3525798c9bffb644db3b0cbcc13
* Fix: [BUG] Cannot add attribute options, crypto.randomUUID is not a function in https://github.com/evershopcommerce/evershop/commit/9757d982e5eca1aa453ac71c2dc35b44e9dabf85
* Fix: Fix can not remove all attribute options in https://github.com/evershopcommerce/evershop/commit/b7ecaaaed37347f4316c6265df4138333da27780
* Fix build command failure exist code in https://github.com/evershopcommerce/evershop/commit/79defa294f8cbf81b400d69132edbfcb698bedc2
* Fix: prevent xss attack in https://github.com/evershopcommerce/evershop/commit/8ad2440a04ab2db15e16b9e3bdf392b5346eaea6
* Fix: Fix security issue when building url rewrites in https://github.com/evershopcommerce/evershop/commit/5c5bdf2c1ad5d16ae68e9e48b494563953b6d1cd
* Fix: Fix security vulnerability in reset password api in https://github.com/evershopcommerce/evershop/commit/4e364639a2d65cd0216a4ee69ee6144d02183efc
* Fix: Backspace key does not delete text in pre-existing "Raw HTML" blocks https://github.com/evershopcommerce/evershop/pull/858
* Fix visual spacing glitch between badges. by @canmi21 in https://github.com/evershopcommerce/evershop/pull/796
* Added Tamil Language Translation by @dev-sriramp in https://github.com/evershopcommerce/evershop/pull/821
* Adding Mongolian translations by @btseee in https://github.com/evershopcommerce/evershop/pull/802
* #673 Read me document docker compose fix by @gssajith in https://github.com/evershopcommerce/evershop/pull/674
* Added skip minification command in package.json by @Belvin-04 in https://github.com/evershopcommerce/evershop/pull/650
* [BUG] Qty field shows 0 when editing a variant from admin #833 by @treoden in https://github.com/evershopcommerce/evershop/pull/838
* [BUG] Failure when adding or changing tax rate in admin: “must be str… by @treoden in https://github.com/evershopcommerce/evershop/pull/840
* Fix weight can‘t is 0.1kg #848 by @treoden in https://github.com/evershopcommerce/evershop/pull/850
* Adding the same treatment for description (formatted) field that we u… by @smartperson in https://github.com/evershopcommerce/evershop/pull/867

## New Contributors
* @canmi21 made their first contribution in https://github.com/evershopcommerce/evershop/pull/796
* @dev-sriramp made their first contribution in https://github.com/evershopcommerce/evershop/pull/821
* @btseee made their first contribution in https://github.com/evershopcommerce/evershop/pull/802
* @Belvin-04 made their first contribution in https://github.com/evershopcommerce/evershop/pull/650
* @smartperson made their first contribution in https://github.com/evershopcommerce/evershop/pull/867
* ...


# v2.1.0 (2025-11-12)
## What's Changed
* Theming by @treoden in https://github.com/evershopcommerce/evershop/pull/767
* Fix: Fix admin styling by @treoden in https://github.com/evershopcommerce/evershop/pull/768
* Fix: Fix coupon edit form by @treoden in https://github.com/evershopcommerce/evershop/pull/769
* Feat: Converting js to ts by @treoden in https://github.com/evershopcommerce/evershop/pull/774
* Feat: Theming utility command lines by @treoden in https://github.com/evershopcommerce/evershop/pull/790
* Feat: Add Persian language by @raminr77 in https://github.com/evershopcommerce/evershop/pull/794
* Feat: Support for JWT authentication by @treoden in https://github.com/evershopcommerce/evershop/pull/812
* [BUG] Translation bug #741 by @treoden in https://github.com/evershopcommerce/evershop/pull/829

## New Contributors
* @raminr77 made their first contribution in https://github.com/evershopcommerce/evershop/pull/794


# v2.0.1 (2025-07-11)
## What's Changed
* Fix unable to restart on update configuration
* Fix unable to restart on update cronjob
* Fix unable to restart on update subscriber
* Fix postgres connection export
* Upgrade extensions to 2.0


# v2.0.0 (2025-07-04)
## Breaking changes
This release includes a major breaking change due to the TypeScript migration.
Please refer to the updated documentation for guidance on adapting your setup.

## What's Changed
* Fixing Docker build failure by @gssajith in https://github.com/evershopcommerce/evershop/pull/691
* Added support for Serbian translation by @savaticnemanja in https://github.com/evershopcommerce/evershop/pull/695
* Fix: Move google login configuration options to .env file by @treoden in https://github.com/evershopcommerce/evershop/pull/705
* Chore: Fix the google login document by @treoden in https://github.com/evershopcommerce/evershop/pull/709
* Feat: Add a service for email sending by @treoden in https://github.com/evershopcommerce/evershop/pull/710
* Chore: Upgrade sendgrid extension by @treoden in https://github.com/evershopcommerce/evershop/pull/723
* Typescript migration by @treoden in https://github.com/evershopcommerce/evershop/pull/737
* Fix: Delete node 18 from test action workflow by @treoden in https://github.com/evershopcommerce/evershop/pull/744
* Chore(deps): Bump multer from 2.0.0 to 2.0.1 by @dependabot in https://github.com/evershopcommerce/evershop/pull/743
* Fix: unable to save product attributes by @treoden in https://github.com/evershopcommerce/evershop/pull/745
* Feat: Remove delegate from the middleware's arguments. Use getDelegat… by @treoden in https://github.com/evershopcommerce/evershop/pull/746

## New Contributors
* @gssajith made their first contribution in https://github.com/evershopcommerce/evershop/pull/691
* @savaticnemanja made their first contribution in https://github.com/evershopcommerce/evershop/pull/695


# v1.2.2 (2025-01-03)

## Breaking Changes
From this version, we require Node.js 18.17.0 or higher to run the EverShop application.

## What's Changed
* feat: Improving the order status management
* feat: Allow canceling order from admin panel
* feat: Scheduled job implementation by @treoden
* feat: Option to Change Admin Page Footer from Admin Panel #634 by @treoden
* feat: Support changing admin logo from the configuration file by @treoden
* feat: Use hookable for login and logout functions by @treoden
* feat: Improve cart functions and more test by @treoden
* feat: Address book management by @treoden
* feat: Migrate to Stripe Payment Element #344 by @treoden
* feat: Support authorize only and capture mode for Stripe #675 by @treoden
* feat: Support refund and cancel for Stripe payment integration by @treoden
* feat: Support authorize only and capture mode for Paypal by @treoden
* fix: Wrong percentage discount per item calculation by @treoden
* fix: React warning chanigng input controlled or uncontrolled by @treoden
* fix: Invalid prop Icon supplied to NavigationItem by @treoden
* fix: Fix security vulnerabilities by @treoden
* chore: Upgrade cross-spawn package by @treoden
* fix: Parent category can't be unassigned #666 by @treoden
* fix: Attributes - Count issue #639 by @treoden
* fix: The product registration does not list all child categories #630 by @treoden
* fix: Search input not work in mobile #585 by @treoden
* fix: Can not create price based or weight based shipping method #671 by @treoden
* chore: Remove lodash by @treoden
* chore: Fix proptypes warning by @treoden
* deps: express@4.21.2 by @treoden
* deps: Pins nanoid to ^3.3.8 by @treoden

**Full Changelog**: https://github.com/evershopcommerce/evershop/compare/v1.2.1...v1.2.2

# v1.2.1 (2024-09-19)

## What's Changed

* Fix create new cart issue by @treoden in https://github.com/evershopcommerce/evershop/pull/622
* Show all attribute group when editing a product by @treoden in https://github.com/evershopcommerce/evershop/pull/622
* Update azure storage and s3 extensions for configuration schema verifcation by @treoden in https://github.com/evershopcommerce/evershop/pull/622
* Fix unit test by @treoden in https://github.com/evershopcommerce/evershop/pull/622
* Fix missing widgets on ajax request by @treoden in https://github.com/evershopcommerce/evershop/pull/622
* [BUG] New Editor Overlap #617 by @treoden in https://github.com/evershopcommerce/evershop/pull/622
* Fix inconsistent page headings by @GabrielGavrilov in https://github.com/evershopcommerce/evershop/pull/616
* Hungarian translation by @hudejo in https://github.com/evershopcommerce/evershop/pull/583
* Fix wrong query in azure app service by @treoden in https://github.com/evershopcommerce/evershop/pull/626
* Remove debug message by @treoden in https://github.com/evershopcommerce/evershop/pull/627
* Fix prop type validation warning by @treoden in https://github.com/evershopcommerce/evershop/pull/627
* Fix prop type validation warning by @treoden in https://github.com/evershopcommerce/evershop/pull/627
* Version 1.2.1 by @treoden in https://github.com/evershopcommerce/evershop/pull/635

## New Contributors
* @GabrielGavrilov made their first contribution in https://github.com/evershopcommerce/evershop/pull/616
* @hudejo made their first contribution in https://github.com/evershopcommerce/evershop/pull/583

**Full Changelog**: https://github.com/evershopcommerce/evershop/compare/v1.2.0...v1.2.1

# v1.2.0 (2024-09-03)

## Breaking Changes

### `FeaturedProducts.jsx` component has been removed
  The FeaturedProducts.jsx component has been removed from the store frontend. From now on, you can use the Widgets feature to create and display featured products on your store.

### `FeaturedCategories.jsx` component has been removed
  The FeaturedCategories.jsx component has been removed from the store frontend. From now on, you can use the Widgets feature to create and display featured categories on your store.

### `MainBanner.jsx` component has been removed
  The MainBanner.jsx component has been removed from the store frontend. From now on, you can use the Widgets feature to create and display banners on your store.

### `Menu.jsx` component has been removed
  The Menu.jsx component has been removed from the store frontend. From now on, you can use the Widgets feature to create and display menus on your store.

### TailwindCSS Configuration
  We have reset the tailwindcss configuration to use the default options. This change ensures that the default tailwindcss configuration is used for the store frontend. This change may affect the styling of your store if you have customized the tailwindcss configuration. We are working to update the `evetheme` to make it compatible with the new tailwindcss configuration.

### `Ckeditor` has been replaced with `EditorJS`
  We have replaced `Ckeditor` with `EditorJS` in the Widgets feature to provide a more user-friendly and intuitive experience for creating and editing content. Your content will be converted to a raw html block and this will not affect the content you have created with `Ckeditor`.

### Configuration Schema
  We have implemented a configuration schema for validation. This change ensures that the configuration settings are validated before starting the application. If you have customized the configuration settings, you may need to update them to match the new schema.

### `pricing.tax.display_catalog_price_including_tax` has been removed
### `pricing.tax.display_checkout_price_including_tax` has been removed
  From now on, you can just use the `pricing.tax.price_including_tax` setting if your store needs tax-inclusive pricing.

## New Features
### Introducing Our New Widgets Feature

  The Widgets feature allows you to create a unique, personalized experience for your customers by giving you the ability to create widgets directly from the backend to the frontend. Whether you want to highlight promotions, display featured products, or craft a stunning visual layout, you have complete control over how your content is presented.

  Here’s what you can do with Widgets:

  - Customize Appearance: Adjust settings and styles to fit your brand’s identity.
  - Dynamic Content: Add and arrange various types of content to keep your website fresh and engaging.

### EditorJS Integration

  We have integrated EditorJS into the Widgets feature to provide a more user-friendly and intuitive experience for creating and editing content. EditorJS is a block-styled editor that allows you to create rich content with ease. With EditorJS, you can add text, images, videos, and more to your widgets, making it easy to create visually appealing and engaging content for your customers.

### Tax inclusive pricing

  You can now display prices with tax included on your store. This feature is especially useful for stores that sell to customers in regions where tax-inclusive pricing is required by law.

### Shipping notes

  Customers can now add notes to their orders during checkout. This feature is useful for customers who want to provide additional information about their order, such as delivery instructions or special requests.

### Updating item quantity in the cart

  Customers can now update the quantity of items in their cart directly from the cart page. This feature makes it easier for customers to adjust their order before checkout.

### Support static content display only for category
  
  You can now display static content only for specific categories on your store. This feature is useful for stores that want to provide additional information about a category, such as a description or special offers.

### Using default tailwindcss configuration

  We have reset the tailwindcss configuration to use the default options. This change ensures that the default tailwindcss configuration is used for the store frontend.


## What's Changed
* More translation fields for extension product reviews by @ErdemGKSL in https://github.com/evershopcommerce/evershop/pull/537
* Resend extension v1.1.0 by @treoden in https://github.com/evershopcommerce/evershop/pull/543
* Google extension v1.1.0 by @treoden in https://github.com/evershopcommerce/evershop/pull/543
* Product review extension v1.1.0 by @treoden in https://github.com/evershopcommerce/evershop/pull/543
* Adding age gate extension source code for tutorial by @treoden in https://github.com/evershopcommerce/evershop/pull/545
* Display website running message by @treoden in https://github.com/evershopcommerce/evershop/pull/560
* Azure extension v1.1.0 by @treoden in https://github.com/evershopcommerce/evershop/pull/560
* Reset tailwind configuration. Use the default options #322 by @treoden in https://github.com/evershopcommerce/evershop/pull/566
* Variant options before add to cart button by @treoden in https://github.com/evershopcommerce/evershop/pull/566
* Revert overflow-y on modal by @treoden in https://github.com/evershopcommerce/evershop/pull/566
* Implement configuration schema for validation by @treoden in https://github.com/evershopcommerce/evershop/pull/586
* S3 extension ver 1.1.0 by @treoden in https://github.com/evershopcommerce/evershop/pull/586
* Support included tax pricing and adding more tests by @treoden in https://github.com/evershopcommerce/evershop/pull/586
* Widget feature #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/598
* Migrate Ckeditor to EditorJS #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/598
* The text widget #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/598
* Allow updating quantity of item in cart #600 by @treoden in https://github.com/evershopcommerce/evershop/pull/601
* Fix showing wrong qty after updating qty to 0 by @treoden in https://github.com/evershopcommerce/evershop/pull/602
* Fix issue creating a new widget from admin #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/602
* Fix z-index issue creating a new widget from admin #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/602
* Fix widget default settings not applied #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/602
* Use svg for admin logo by @treoden in https://github.com/evershopcommerce/evershop/pull/603
* Add more area to the store setting page by @treoden in https://github.com/evershopcommerce/evershop/pull/603
* Allow changing the validity period of sid #593 by @treoden in https://github.com/evershopcommerce/evershop/pull/603
* Add widget configuration validation schema #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/603
* Remove unused button when creating a widget #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/603
* Remove breadcrumb on checkout page by @treoden in https://github.com/evershopcommerce/evershop/pull/606
* Remove breadcrumb on checkout success page by @treoden in https://github.com/evershopcommerce/evershop/pull/606
* Support shipping note during checkout #604 by @treoden in https://github.com/evershopcommerce/evershop/pull/606
* Support static content display only for category by @treoden in https://github.com/evershopcommerce/evershop/pull/606
* Improve the editor styling by @treoden in https://github.com/evershopcommerce/evershop/pull/606
* A simple menu widget #581 by @treoden in https://github.com/evershopcommerce/evershop/pull/606
* Fix editor rows drag and drop issue by @treoden in https://github.com/evershopcommerce/evershop/pull/607
* Fix editor rows drag and drop issue by @treoden in https://github.com/evershopcommerce/evershop/pull/607
* Improve the logo styling by @treoden in https://github.com/evershopcommerce/evershop/pull/607
* Fix transparent background of the minicart toast by @treoden in https://github.com/evershopcommerce/evershop/pull/608
* Fix status issue when loading cms page by @treoden in https://github.com/evershopcommerce/evershop/pull/609
* Fix can not submit note error by @treoden in https://github.com/evershopcommerce/evershop/pull/610
* Fix image size configuration by @treoden in https://github.com/evershopcommerce/evershop/pull/610
* Remove Featured products, Featured categories and main banner components. From now we use widgets by @treoden in https://github.com/evershopcommerce/evershop/pull/611
* Fix product count in the collection products widget by @treoden in https://github.com/evershopcommerce/evershop/pull/611
* Fix error can not delete widget from the grid page by @treoden in https://github.com/evershopcommerce/evershop/pull/611
* Keep widget status field enabled by default by @treoden in https://github.com/evershopcommerce/evershop/pull/611
* Fix can not drag and drop the editor rows by @treoden in https://github.com/evershopcommerce/evershop/pull/611
* Create some default widgets upon installation by @treoden in https://github.com/evershopcommerce/evershop/pull/612

## Bug fixes
* Fix dockerfile copy by @treoden in https://github.com/evershopcommerce/evershop/pull/538
* Fix category tree #536 by @treoden in https://github.com/evershopcommerce/evershop/pull/538
* Fix pagination and limit issues by @treoden in https://github.com/evershopcommerce/evershop/pull/538
* Fix missing default pagination filter by @treoden in https://github.com/evershopcommerce/evershop/pull/543
* Fix no scroll issue category tree #536 by @treoden in https://github.com/evershopcommerce/evershop/pull/560
* Fix Shipping Method Popup not scrollable #540 by @treoden in https://github.com/evershopcommerce/evershop/pull/560
* Fix loading extensions multiple time when no extension is actived by @treoden in https://github.com/evershopcommerce/evershop/pull/565
* Fix invalid props type collection ID and category ID by @treoden in https://github.com/evershopcommerce/evershop/pull/566
* Fix wrong title and search issue in category selector modal by @treoden in https://github.com/evershopcommerce/evershop/pull/566
* Fix wrong attribute ordering by @treoden in https://github.com/evershopcommerce/evershop/pull/566
* Issue #547: Category scrolling in mobile view by @adexh in https://github.com/evershopcommerce/evershop/pull/578
* Fix [BUG] query.and is not a function #573 by @treoden in https://github.com/evershopcommerce/evershop/pull/586
* Fix error when accessing the folder path by @treoden in https://github.com/evershopcommerce/evershop/pull/586
* Fixing coupon condition in unit testing data by @treoden in https://github.com/evershopcommerce/evershop/pull/586
* Fix column not found #595 by @treoden in https://github.com/evershopcommerce/evershop/pull/601
* Fix toast message background by @treoden in https://github.com/evershopcommerce/evershop/pull/603
* Fix client id placeholder in paypal configuration form by @treoden in https://github.com/evershopcommerce/evershop/pull/610
* Fix shipping fee tax amount calculation by @treoden in https://github.com/evershopcommerce/evershop/pull/610

## New Contributors
* @ErdemGKSL made their first contribution in https://github.com/evershopcommerce/evershop/pull/537
* @Aryansingh0103 made their first contribution in https://github.com/evershopcommerce/evershop/pull/555
* @adexh made their first contribution in https://github.com/evershopcommerce/evershop/pull/578

**Full Changelog**: https://github.com/evershopcommerce/evershop/compare/v1.1.0...v1.2.0

# v1.1.0 (2024-05-09)
## What's Changed
* Added norwegian bokmål to translation by @fyksen in https://github.com/evershopcommerce/evershop/pull/443
* [DOCS] Fix azure_file_storage README.md step 4 by @malixswoop in https://github.com/evershopcommerce/evershop/pull/457
* Translation: Add Spanish Translation by @emmanuelh-dev in https://github.com/evershopcommerce/evershop/pull/464
* Translation: Add Brazillian Portuguese Translation by @luizfscorreia in https://github.com/evershopcommerce/evershop/pull/461
* Add translation support for 'Price' filter item title by @thiagorodriguesdutra in https://github.com/evershopcommerce/evershop/pull/467
* Create FUNDING.yml by @treoden in https://github.com/evershopcommerce/evershop/pull/477
* Add Translation RU by @Vovanni in https://github.com/evershopcommerce/evershop/pull/478
* Adding Resend extension for EverShop by @treoden in https://github.com/evershopcommerce/evershop/pull/480
* Add Translation FR by @Seb7o in https://github.com/evershopcommerce/evershop/pull/476
* Move SendGrid API Key to .env by @treoden in https://github.com/evershopcommerce/evershop/pull/487
* Implement winston logger by @treoden in https://github.com/evershopcommerce/evershop/pull/491
* Allow deleting shipping zone by @treoden in https://github.com/evershopcommerce/evershop/pull/491
* Greek Translation pack by @GiorgosIlia in https://github.com/evershopcommerce/evershop/pull/498
* Improve the collection filtering by @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Adding more font size to admin tailwind config by @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Support price and weight based shipping cost @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Enable webpack source map @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Show error message when adding wrong shipping method @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Block deleting variant group attribute by @treoden in https://github.com/evershopcommerce/evershop/pull/512
* Add loading button on login forms by @treoden in https://github.com/evershopcommerce/evershop/pull/512
* Add Create cart API by @treoden in https://github.com/evershopcommerce/evershop/pull/512
* Add Adding title to catalog search page by @treoden in https://github.com/evershopcommerce/evershop/pull/512
* Add all variant to same collection automatically by @treoden in https://github.com/evershopcommerce/evershop/pull/516
* Improve variant selection on product detail page by @treoden in https://github.com/evershopcommerce/evershop/pull/516
* Add status and type filter to product grid by @treoden in https://github.com/evershopcommerce/evershop/pull/518
* Add payment status and shipment status filter to order grid by @treoden in https://github.com/evershopcommerce/evershop/pull/518
* Nepali language added by @uttamraz in https://github.com/evershopcommerce/evershop/pull/520
* Add status filter to customer grid by @treoden in https://github.com/evershopcommerce/evershop/pull/522
* Add status and free ship filter to coupon grid by @treoden in https://github.com/evershopcommerce/evershop/pull/522
* Allow to rename or delete shipping methods #503 by @treoden in https://github.com/evershopcommerce/evershop/pull/522
* Using placeholder icon when thumbnail is missing by @treoden in https://github.com/evershopcommerce/evershop/pull/523
* Show message when Stripe API returns error by @treoden in https://github.com/evershopcommerce/evershop/pull/523
* Display chekout order summary on mobile view by @treoden in https://github.com/evershopcommerce/evershop/pull/523

## Bug fixes
* Fix blank page error when completing order by @treoden in https://github.com/evershopcommerce/evershop/pull/524
* Fix sql query from the subscriber by @treoden in https://github.com/evershopcommerce/evershop/pull/525
* Fix returning value after delete record by @treoden in https://github.com/evershopcommerce/evershop/pull/525
* Fix category filters missing operation by @treoden in https://github.com/evershopcommerce/evershop/pull/517
* Fix displaying product thumbnail when image is missing by @treoden in https://github.com/evershopcommerce/evershop/pull/516
* Fix can not update variant attribute from admin panel by @treoden in https://github.com/evershopcommerce/evershop/pull/512
* Fix missing attribute option when creating new variant by @treoden in https://github.com/evershopcommerce/evershop/pull/516
* Fix variant list showing wrong attributes by @treoden in https://github.com/evershopcommerce/evershop/pull/522
* Fix logging icon alignment by @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Fix adding new component does not trigger re-build @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Fix too many logger instance issue @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Fix can not update variant options @treoden in https://github.com/evershopcommerce/evershop/pull/510
* Fix weight unit issue by @treoden in https://github.com/evershopcommerce/evershop/pull/491
* Fix Shipping setting returns error #479 by @treoden in https://github.com/evershopcommerce/evershop/pull/491
* Fix #445: Range Slider Invisible by @amal-qb in https://github.com/evershopcommerce/evershop/pull/470
* Fix #325: Add to cart Popups Closing by @amal-qb in https://github.com/evershopcommerce/evershop/pull/472
* Fix filtering combobox localizations by @mircea32000 in https://github.com/evershopcommerce/evershop/pull/475
* Fix product review issues by @treoden in https://github.com/evershopcommerce/evershop/pull/451

## New Contributors
* @fyksen made their first contribution in https://github.com/evershopcommerce/evershop/pull/443
* @malixswoop made their first contribution in https://github.com/evershopcommerce/evershop/pull/457
* @emmanuelh-dev made their first contribution in https://github.com/evershopcommerce/evershop/pull/464
* @luizfscorreia made their first contribution in https://github.com/evershopcommerce/evershop/pull/461
* @thiagorodriguesdutra made their first contribution in https://github.com/evershopcommerce/evershop/pull/467
* @amal-qb made their first contribution in https://github.com/evershopcommerce/evershop/pull/470
* @mircea32000 made their first contribution in https://github.com/evershopcommerce/evershop/pull/475
* @Vovanni made their first contribution in https://github.com/evershopcommerce/evershop/pull/478
* @Seb7o made their first contribution in https://github.com/evershopcommerce/evershop/pull/476
* @GiorgosIlia made their first contribution in https://github.com/evershopcommerce/evershop/pull/498
* @uttamraz made their first contribution in https://github.com/evershopcommerce/evershop/pull/520

Thank you all for your contributions!
