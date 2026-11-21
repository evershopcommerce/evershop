import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { openScratchDb } from '../helpers/scratchDb.js';

/**
 * The suites that write through core's real services share the tables of the
 * second scratch database, so they take turns (see the helper): one suite holds
 * the database from its `openScratchDb({ core: true })` to its `close()`, and
 * another waits. A suite on the first database is not held up.
 */
jest.setTimeout(60_000);

// The test takes turns with its own copies, under a name of its own: the real
// suites of this database hold the lock for as long as they run (a minute and
// more), and what is tested here is the mechanism, not their pace.
const LOCK = 'import_core_scratch_test_lock_test';
const first = await openScratchDb({ core: true, lock: LOCK });
const describeDb = first ? describe : describe.skip;
let firstOpen = true;

afterAll(async () => {
  if (firstOpen) await first?.close();
});

const pause = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describeDb(
  'openScratchDb: the suites of the second database take turns',
  () => {
    it('does not hold up a suite of the first database', async () => {
      const other = await openScratchDb();
      expect(other).not.toBeNull();
      await other!.close();
    });

    it('makes a second suite wait until the first has closed, then lets it in', async () => {
      let opened = false;
      const second = openScratchDb({ core: true, lock: LOCK }).then((db) => {
        opened = true;
        return db;
      });
      await pause(800);
      expect(opened).toBe(false);
      firstOpen = false;
      await first!.close();
      const db = await second;
      expect(opened).toBe(true);
      expect(db).not.toBeNull();
      // The schema of the first was not touched by the second while it waited,
      // and the second has its own.
      const alive = await db!.pool.query('SELECT to_regclass($1) AS jobs', [
        'import_job'
      ]);
      expect(alive.rows[0].jobs).toBe('import_job');
      await db!.close();
    });
  }
);
