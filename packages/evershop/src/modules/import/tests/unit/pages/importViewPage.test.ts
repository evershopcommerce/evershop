import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * The middleware of the page of one import (§ 8.1): it checks that the job
 * exists and gives the page its id. A thing that is not an id is a 404 without
 * a query (the database would answer with an error, which is a 500).
 */
jest.setTimeout(120_000);

process.env.SUPPRESS_NO_CONFIG_WARNING = '1';
process.env.SUPPRESS_STRICTNESS_CHECK = '1';
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

const db = await openScratchDb({ core: true });
if (db) {
  pointCoreAt(db);
  process.env.PGOPTIONS = `-c search_path=${db.schema},public`;
}
const describeDb = db ? describe : describe.skip;
const corePool = db
  ? (await import('../../../../../lib/postgres/connection.js')).pool
  : null;
const page = db
  ? (await import('../../../pages/admin/importView/index.js')).default
  : null;
const { getContextValue } = await import(
  '../../../../graphql/services/contextHelper.js'
);
const { getPageMetaInfo } = await import(
  '../../../../cms/services/pageMetaInfo.js'
);

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

function call(id: string) {
  const request: any = { params: { id }, app: { locals: {} }, locals: {} };
  const response: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    }
  };
  const errors: unknown[] = [];
  let nexts = 0;
  const next = (error?: unknown) => {
    nexts += 1;
    if (error) errors.push(error);
  };
  return page!(request, response, next).then(() => ({
    request,
    response,
    errors,
    nexts
  }));
}

describeDb('the page of one import (middleware)', () => {
  it('is a 404 for something that is not an id, without asking the database', async () => {
    const spy = jest.spyOn(corePool!, 'connect');
    for (const id of [
      'new',
      '1',
      "x' OR '1'='1",
      '',
      '6f1d9a52-0000-4000-8000-00000000000'
    ]) {
      const { response, errors, nexts } = await call(id);
      expect(response.statusCode).toBe(404);
      expect(errors).toEqual([]);
      expect(nexts).toBe(1);
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('is a 404 for an id of a job that does not exist', async () => {
    // The spy is also the proof that the test above would see a query.
    const spy = jest.spyOn(corePool!, 'connect');
    const { response, errors } = await call(
      '6f1d9a52-0000-4000-8000-000000000001'
    );
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    expect(response.statusCode).toBe(404);
    expect(errors).toEqual([]);
  });

  it('gives the page the id and the name of the file for a job that exists', async () => {
    const [row] = (
      await db!.pool.query(
        `INSERT INTO import_job (entity, status, file_name) VALUES ('product', 'validated', 'my products.csv') RETURNING uuid`
      )
    ).rows;
    try {
      const { request, response, errors, nexts } = await call(
        row.uuid.toUpperCase()
      );
      expect(response.statusCode).toBe(200);
      expect(errors).toEqual([]);
      expect(nexts).toBe(1);
      expect(getContextValue(request, 'importJobUuid')).toBe(row.uuid);
      expect(getPageMetaInfo(request).title).toBe('Import my products.csv');
    } finally {
      await db!.pool.query(`TRUNCATE import_job RESTART IDENTITY CASCADE`);
    }
  });

  it('passes a failure of the database on as an error, not as a page', async () => {
    const spy = jest
      .spyOn(corePool!, 'connect')
      .mockRejectedValueOnce(new Error('connection lost') as never);
    const { errors, nexts } = await call(
      '6f1d9a52-0000-4000-8000-000000000001'
    );
    spy.mockRestore();
    expect(nexts).toBe(1);
    expect(errors).toHaveLength(1);
  });
});
