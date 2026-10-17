import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { getAjv } from '../../../../../base/services/getAjv.js';
import {
  createRecordingBuilder,
  definedEntries
} from '../../../../../base/tests/unit/helpers/recordingQueryBuilder.js';
import updateCmsPagePayloadSchema from '../../../../api/updateCmsPage/payloadSchema.json' with { type: 'json' };

/**
 * Core issue #1103, same class of bug in the CMS page: an update validates its
 * payload IN PLACE and then writes the same object, so the schema `default` of
 * `content: []` was written back for a payload that did not carry `content`,
 * and the page lost its content.
 */
const db = createRecordingBuilder();

jest.unstable_mockModule('@evershop/postgres-query-builder', () => db.module);
jest.unstable_mockModule('../../../../../../lib/postgres/connection.js', () => ({
  getConnection: async () => ({})
}));
jest.unstable_mockModule('../../../../../base/services/recordRedirect.js', () => ({
  recordRedirect: async () => undefined
}));
jest.unstable_mockModule('../../syncPageUrlRewrite.js', () => ({
  assertUrlKeyAvailable: async () => undefined,
  syncPageUrlRewrite: async () => undefined
}));

const { default: updatePage } = await import('../../updatePage.js');

const storedPage = {
  cms_page_id: 1,
  uuid: 'pg-1',
  url_key: 'about-us',
  status: 1
};

describe('updatePage with a partial payload (#1103)', () => {
  beforeEach(() => db.setRows({ cms_page: { ...storedPage } }));

  it('writes only the field that was sent', async () => {
    await updatePage('pg-1', { status: 1 }, {});

    const [pageWrite] = db.writesTo('cms_page');
    expect(pageWrite.given).toEqual({ status: 1 });
    for (const write of db.writes) {
      expect(Object.keys(definedEntries(write.given))).toEqual(['status']);
    }
    expect(db.transaction).toEqual(['start', 'commit']);
  });

  it('still writes a content that is sent, an empty one included', async () => {
    await updatePage('pg-1', { status: 1, content: [] }, {});

    const [descriptionWrite] = db.writesTo('cms_page_description');
    expect(descriptionWrite.given).toEqual({ status: 1, content: [] });
  });

  it('still rejects an invalid value, and writes nothing', async () => {
    await expect(updatePage('pg-1', { status: 5 }, {})).rejects.toThrow();
    expect(db.writes).toEqual([]);
    expect(db.transaction).toEqual(['start', 'rollback']);
  });
});

describe('REST update payload schema of a CMS page (#1103)', () => {
  // `[auth]payloadValidate` compiles a route's payload schema with getAjv() and
  // validates request.body in place, before the service sees it.
  it('adds nothing to a one-field body', () => {
    const body = { status: 1 };
    const payload = { ...body };
    expect(getAjv().compile(updateCmsPagePayloadSchema)(payload)).toBe(true);
    expect(payload).toEqual(body);
  });
});
