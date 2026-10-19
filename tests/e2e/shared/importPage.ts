import { expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * What the import specs do in the browser, in one place: write a CSV, choose a
 * type and a file, upload, and wait for the page of the job to say where it is.
 */
export type EntityChoice = 'Products' | 'Categories' | 'Customers' | 'Customer addresses';

const quote = (cell: string) =>
  /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

/** Writes a CSV (CRLF, as the templates are) and returns its path. */
export function writeCsv(dir: string, name: string, rows: string[][]): string {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n');
  return file;
}

/**
 * A button of the confirmation dialog. Core's dialog has `aria-hidden` on its
 * wrapper, so it is not in the accessibility tree and `getByRole` cannot find it.
 */
export const dialogButton = (page: Page, name: string) =>
  page.locator('.modal').getByText(name, { exact: true });

export const VIEW_URL = /\/admin\/import\/view\/([0-9a-f-]{36})/;

export async function openNewImport(page: Page, entity: EntityChoice): Promise<void> {
  await page.goto('/admin/import/new');
  await page.getByRole('radio', { name: entity }).check();
}

/** The questions of § 8.2 (D-32): another admin's job, or a stopped one, is in the way. */
export const REPLACE_QUESTION = /Replace the earlier upload\?|Close the earlier import\?/;

/**
 * Chooses the type and the file, uploads it, and returns the id of the new job.
 *
 * The specs use the database of the dev server: a job of the type that they did
 * not make may be someone's work. When the page asks whether to replace it, the
 * spec stops and says so, unless it was written to answer that question.
 */
export async function uploadFile(
  page: Page,
  entity: EntityChoice,
  file: string,
  options: {
    mode?: 'Create and update' | 'Only create' | 'Only update';
    /** The spec expects the question and answers yes. */
    confirmQuestion?: boolean;
  } = {}
): Promise<string> {
  await openNewImport(page, entity);
  if (options.mode) {
    await page.getByLabel('If a record already exists').selectOption({ label: options.mode });
  }
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: 'Upload and validate' }).click();
  const question = page.getByText(REPLACE_QUESTION);
  await Promise.race([
    page.waitForURL(VIEW_URL, { timeout: 60_000 }),
    question.waitFor({ timeout: 60_000 })
  ]);
  if (await question.isVisible().catch(() => false)) {
    if (!options.confirmQuestion) {
      throw new Error(
        'The page asks whether to replace an earlier import of this type that the spec did not make. ' +
          'It may be someone\'s work: close or delete it by hand, then run the spec again.'
      );
    }
    await dialogButton(page, 'Upload').click();
    await page.waitForURL(VIEW_URL, { timeout: 60_000 });
  }
  return VIEW_URL.exec(page.url())![1];
}

/** Waits until the check has ended, whatever it found. */
export async function waitForChecked(page: Page): Promise<void> {
  await expect(page.getByText(/rows are valid|The check found/)).toBeVisible({ timeout: 90_000 });
}

export async function startAndWaitForDone(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start import' }).click();
  await expect(page.getByText(/^Done\./)).toBeVisible({ timeout: 120_000 });
}

export async function viewText(page: Page): Promise<string> {
  return (await page.locator('main').innerText().catch(() => page.locator('body').innerText())).replace(/\s+/g, ' ');
}
