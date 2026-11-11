import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  openScratchDb,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';

/**
 * `POST /api/settings` on a scratch database with every core migration: the
 * keys of one request are saved all together, or not at all. A settings page
 * must never end up half saved after an error (a new API key with the old
 * mode, a new key with an old secret).
 * Skips itself when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_setting_save_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb('saveSetting (scratch DB)', () => {
  const db = scratch?.db as ScratchDb['db'];
  let saveSetting: (req: any, res: any, next: any) => Promise<void>;

  beforeAll(async () => {
    ({ default: saveSetting } = await import(
      '../../api/saveSetting/saveSetting.js'
    ));
    // A save of the key `broken` fails, as a constraint or a trigger could
    await db.query(`CREATE FUNCTION fail_broken_setting() RETURNS trigger AS $$
      BEGIN
        IF NEW.name = 'broken' THEN
          RAISE EXCEPTION 'setting table refuses broken';
        END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`);
    await db.query(`CREATE TRIGGER "FAIL_BROKEN_SETTING"
      BEFORE INSERT OR UPDATE ON setting
      FOR EACH ROW EXECUTE PROCEDURE fail_broken_setting()`);
  });

  afterAll(async () => {
    await scratch?.close();
  });

  async function save(body: Record<string, unknown>) {
    const response: any = {
      statusCode: undefined,
      body: undefined,
      status(code: number) {
        response.statusCode = code;
        return response;
      },
      json(payload: unknown) {
        response.body = payload;
        return response;
      }
    };
    await saveSetting({ body }, response, () => {});
    return response;
  }
  const saved = async (names: string[]) =>
    (
      await db.query(
        'SELECT name, value, is_json FROM setting WHERE name = ANY($1) ORDER BY name',
        [names]
      )
    ).rows;

  it('saves every key of the request: text, JSON and empty values', async () => {
    const response = await save({
      mode: 'live',
      list: ['a', 'b'],
      phone: null
    });
    expect(response.statusCode).toBe(200);
    expect(await saved(['mode', 'list', 'phone'])).toEqual([
      { name: 'list', value: '["a","b"]', is_json: true },
      { name: 'mode', value: 'live', is_json: false },
      { name: 'phone', value: '', is_json: false }
    ]);
  });

  it('updates a key that exists', async () => {
    await save({ theme: 'light' });
    expect((await save({ theme: 'dark' })).statusCode).toBe(200);
    expect(await saved(['theme'])).toEqual([
      { name: 'theme', value: 'dark', is_json: false }
    ]);
  });

  it('a key that fails to save: the answer is 500 and no key of the request is saved', async () => {
    await save({ apiKey: 'old-key' });
    const response = await save({
      apiKey: 'new-key',
      broken: 'x',
      secret: 'new-secret',
      other: 'y'
    });
    expect(response.statusCode).toBe(500);
    expect(response.body.error.message).toBe('setting table refuses broken');
    // The key before the failing one is not saved, nor the ones after it
    expect(await saved(['apiKey', 'broken', 'secret', 'other'])).toEqual([
      { name: 'apiKey', value: 'old-key', is_json: false }
    ]);
  });

  it('gives its connection back after a failure: the next save works', async () => {
    for (let i = 0; i < 6; i += 1) {
      // more failures than the pool has connections
      expect((await save({ broken: 'x' })).statusCode).toBe(500);
    }
    expect((await save({ afterFailures: 'ok' })).statusCode).toBe(200);
    expect(await saved(['afterFailures'])).toHaveLength(1);
  });
});
