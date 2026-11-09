# EverShop release check

The test run before every release. It installs the **packed release candidate** the way a user does, in scratch stores outside the repo, and runs the specs in `specs/` against them:

- **fresh**: `npm install` of the candidate into an empty project (the `create-evershop-app` steps), `evershop install`, production `build` + `start`, then every spec.
- **upgrade:<version>**: the previous release from npm, store data made with it, then the candidate installed over it, rebuilt and restarted, then every spec plus the upgrade checks.

The list of test cases and what each one covers is in [`wiki/release-check.md`](../../../wiki/release-check.md).

## Run it

```bash
cd core/tests/e2e && npm install && npx playwright install chromium   # once
node release/run.mjs                        # pack HEAD; fresh + upgrade from 2.3.0 and 2.2.2
node release/run.mjs --candidate 2.3.0      # positive control: a published version
node release/run.mjs --scenarios fresh --node 20.9.0   # one scenario, another Node (nvm)
```

The report is written to `<run folder>/report.md`, with the Playwright HTML report and the store logs next to it. Scratch databases are named `evershop_rehearsal_*` and are dropped at the end (`--keep` keeps them and the projects).

### Payment accounts

The payment specs read test accounts from `tests/e2e/.env.release` (gitignored, never committed). A spec without its accounts is skipped and the report says so.

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_SECRET_KEY=sk_test_…
PAYPAL_CLIENT_ID=…           # a PayPal sandbox REST app
PAYPAL_CLIENT_SECRET=…
PAYPAL_BUYER_EMAIL=…         # that sandbox's personal (buyer) account
PAYPAL_BUYER_PASSWORD=…
```

- **Stripe** (`06-stripe`) also needs the Stripe CLI (`brew install stripe/stripe-cli/stripe`). For the Stripe pass, `run.mjs` starts `stripe listen` (step `R-STR-00`), which forwards the test account's events to the scratch store, and gives the spec its signing secret as `STRIPE_WEBHOOK_SECRET`. The API key goes to the CLI through the environment, never the command line. Anyone else using the same test account at the same time also gets their events forwarded; the store ignores events for orders it does not have.
- **PayPal** (`07-paypal`) signs in to the sandbox as the buyer in the browser. PayPal cannot reach a local store, so the PayPal webhook is not tested; the return page finalizes the payment without it.
- The store never gets these keys in its environment: the specs save them in the store's payment settings, as a merchant does.

## Write a spec

```bash
node release/run.mjs --scenarios fresh --setup-only --port 3910 --run-dir /tmp/my-run   # a store that stays up
node release/run.mjs --specs-only /tmp/my-run --grep R-CAT                                 # run specs against it
node release/run.mjs --specs-only /tmp/my-run --spec 06-stripe                             # only these spec files
node release/run.mjs --stop /tmp/my-run                                                     # stop it, drop its database
```

Rules:

- Import `test` and `expect` from `../support/test`. It fails a test on any browser console error, uncaught page error or 5xx answer from the store. Messages logged by another site's page or frame (PayPal, Stripe) are not counted. Allow a message only when the test causes it on purpose (a wrong password), or for a bug listed in `support/knownBugs.ts` that another test still catches.
- Every test title starts with its case ID (`R-CAT-03 …`), the same ID as in the wiki page.
- Specs must pass on an **empty fresh store and on an upgraded one**: create the data a test needs, with names from `unique()`, never rely on another spec file's data.
- Prefer the UI for the flow under test; use the REST API for set-up data.
- The store has in-memory rate limits per IP (`modules/base/services/rateLimit.ts`, hardcoded): **8 login / registration / password POSTs per 15 minutes** and **120 API calls per minute**. The harness runs each spec file in its own pass and restarts the store before each pass, so each file has those limits to itself (the admin session is saved once per store and reused). Keep one spec file under them: count logins in a comment at its top, and keep its API calls well under 120 a minute. Signing up through the storefront form costs 2 logins (registration, then a sign-in). Never retry a click that sends a login POST; wait for hydration instead (`hydrated()` in `support/customer.ts`).
- Emails: `waitForMail(to, /subject/)` from `support/mail.ts` (the `release-check-mail` extension in each scratch store writes them to disk).
