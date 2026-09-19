import { describe, it, expect } from '@jest/globals';
import {
  PRODUCT_LISTING_PATH,
  warnOnProductListingPathConflict
} from '../../services/warnOnProductListingPathConflict.js';

/**
 * Going forward `assertUrlKeyAvailable` blocks the slug, because it reads the
 * live route table. A store that ALREADY had a page at /products gets no such
 * protection — the route matcher runs before the url_rewrite fallback, so that
 * page just stops resolving on upgrade. This warning is the only signal.
 */

function fakePool(rows: unknown[] | Error) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  return {
    calls,
    query: async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      if (rows instanceof Error) {
        throw rows;
      }
      return { rows, rowCount: rows.length };
    }
  };
}

function collectLogs() {
  const messages: string[] = [];
  return { messages, log: (m: string) => messages.push(m) };
}

describe('warnOnProductListingPathConflict', () => {
  it('stays quiet when nothing owns the path', async () => {
    const pool = fakePool([]);
    const { messages, log } = collectLogs();
    await expect(warnOnProductListingPathConflict(pool, log)).resolves.toBe(
      false
    );
    expect(messages).toHaveLength(0);
  });

  it('looks the path up by request_path', async () => {
    const pool = fakePool([]);
    await warnOnProductListingPathConflict(pool, collectLogs().log);
    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].text).toContain('FROM url_rewrite');
    expect(pool.calls[0].values).toEqual([PRODUCT_LISTING_PATH]);
  });

  it('names the shadowed entity so the merchant can find it', async () => {
    const pool = fakePool([
      { entity_type: 'cms_page', entity_uuid: '9f3c0000-0000-0000-0000-000000000001' }
    ]);
    const { messages, log } = collectLogs();
    await expect(warnOnProductListingPathConflict(pool, log)).resolves.toBe(
      true
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('cms_page');
    expect(messages[0]).toContain('9f3c0000-0000-0000-0000-000000000001');
    expect(messages[0]).toContain(PRODUCT_LISTING_PATH);
    // The merchant needs to know what to DO, not just that something is wrong.
    expect(messages[0]).toContain('url_key');
  });

  it('degrades to placeholders rather than printing "undefined"', async () => {
    const pool = fakePool([{ entity_type: null, entity_uuid: null }]);
    const { messages, log } = collectLogs();
    await warnOnProductListingPathConflict(pool, log);
    expect(messages[0]).not.toContain('null');
    expect(messages[0]).not.toContain('undefined');
  });

  it('swallows a missing table instead of aborting startup', async () => {
    // Bootstrap (phase 4) runs BEFORE migrate (phase 7), so on a first boot
    // url_rewrite does not exist yet — and on a first boot there is nothing to
    // collide with. A warning must never be why a store fails to start.
    const pool = fakePool(
      Object.assign(new Error('relation "url_rewrite" does not exist'), {
        code: '42P01'
      })
    );
    const { messages, log } = collectLogs();
    await expect(warnOnProductListingPathConflict(pool, log)).resolves.toBe(
      false
    );
    expect(messages).toHaveLength(0);
  });
});
