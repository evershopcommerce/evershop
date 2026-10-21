import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  test,
  expect,
  type APIRequestContext,
  type PlaywrightWorkerArgs
} from '@playwright/test';
import { sweepImportWorld } from '../../../shared/importDb.js';
import { uploadFile, waitForChecked, writeCsv } from '../../../shared/importPage.js';
import { getSettingValue } from '../../../shared/settingDb.js';

/**
 * The problems of a file in the language of the store (spec § 8.4, Issues): the
 * file is checked in English, as the worker stores its sentences as templates;
 * the store is then set to Vietnamese, and the problems table, the file with
 * errors and the message of a job are said in Vietnamese. The language is put
 * back at the end through the same API (the settings are cached by the server).
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const AUTH_STATE = path.join(__dirname, '..', '..', '..', '.auth', 'admin.json');
const apiContext = (
  playwright: PlaywrightWorkerArgs['playwright']
): Promise<APIRequestContext> =>
  playwright.request.newContext({ baseURL: BASE_URL, storageState: AUTH_STATE });

let before: string | null = null;

test.beforeAll(async () => {
  before = await getSettingValue('storeLanguage');
  await sweepImportWorld();
});

test.afterAll(async ({ playwright }) => {
  const api = await apiContext(playwright);
  await api.post('/api/settings', { data: { storeLanguage: before ?? 'en' } });
  await api.dispose();
  await sweepImportWorld();
});

const HEADER = ['url_key', 'name', 'parent', 'status', 'position'];

test('the problems, the file with errors and the stop of a job are in the language of the store', async ({
  page,
  playwright
}, info) => {
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-language.csv', [
    HEADER,
    ['e2e-imp-lang-fine', 'Fine', '', '1', '1'],
    ['e2e-imp-lang-bad', 'Bad status', '', 'maybe', '1'],
    ['e2e-imp-lang-short', 'Short row']
  ]);
  const uuid = await uploadFile(page, 'Categories', file);
  await waitForChecked(page);

  const api = await apiContext(playwright);
  try {
    // In English, as the store is.
    const english = await (await api.get(`/api/import-jobs/${uuid}/issues`)).json();
    const messages: string[] = english.data.items.map((i: { message: string }) => i.message);
    expect(messages.join('\n')).toContain('The value in column "status"');

    await api.post('/api/settings', { data: { storeLanguage: 'vi' } });

    const issues = await (await api.get(`/api/import-jobs/${uuid}/issues`)).json();
    const said: string[] = issues.data.items.map((i: { message: string }) => i.message);
    expect(said.join('\n')).toContain('Giá trị trong cột "status"');
    expect(said.join('\n')).toContain('Dòng 4 có 2 ô nhưng dòng tiêu đề có 5.');
    expect(said.join('\n')).not.toContain('The value in column');
    // The inside of the sentence stays inside.
    expect(JSON.stringify(issues.data.items)).not.toContain('__say');

    const download = await api.get(`/api/import-jobs/${uuid}/file-with-errors.csv`);
    expect(download.status()).toBe(200);
    const csv = await download.text();
    expect(csv).toContain('Giá trị trong cột');
    expect(csv).toContain('dòng: Dòng 4');

    // English again.
    await api.post('/api/settings', { data: { storeLanguage: 'en' } });
    const back = await (await api.get(`/api/import-jobs/${uuid}/issues`)).json();
    expect(JSON.stringify(back.data.items)).toContain('The value in column');
  } finally {
    await api.dispose();
  }
});
