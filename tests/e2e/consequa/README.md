# Consequa results reporter

A pinned copy of the results reporter from Consequa's `@consequa/playwright-kit`
(Consequa commit `e73841d`, `packages/playwright-kit/src`). The kit isn't published yet and
Consequa's repository is private, so the workflow can't install or check it out.

It writes a Result Bundle (`bundle.json` plus the screenshots and videos it names) to
`$CONSEQUA_RESULTS_DIR`, beside Playwright's own reporter:

    CONSEQUA_RESULTS_DIR=consequa-results npx playwright test --reporter=list,./consequa/results-reporter.ts

`.github/workflows/e2e_consequa.yml` uploads that folder as the run artifact `consequa-results`,
with `bundle.json` at the root of the zip, which `consequa ingest actions` downloads.

Don't edit these files here. Re-copy them from Consequa when the kit changes and update the commit above.
