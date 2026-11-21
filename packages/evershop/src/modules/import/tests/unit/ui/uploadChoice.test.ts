import { describe, expect, it } from '@jest/globals';
import type { JobStatus } from '../../../services/job/types.js';
import type { ImportEntity } from '../../../services/types.js';
import {
  PLACEHOLDER_ID,
  describeUpload,
  isBusy,
  noticesFor,
  viewUrlFor
} from '../../../ui/uploadChoice.js';
import type { UploadInput } from '../../../ui/uploadChoice.js';
import { aJob } from '../helpers/jobViews.js';

const input = (over: Partial<UploadInput> = {}): UploadInput => ({
  entity: 'product',
  openJobs: [],
  me: 1,
  file: { size: 1000 },
  maxFileBytes: 100 * 1_048_576,
  uploading: false,
  ...over
});

describe('which jobs are at work (§ 8.4: busy)', () => {
  it.each([
    ['running', null, true],
    ['queued', '2026-10-19T09:00:40.000Z', true],
    ['queued', null, false],
    ['validating', null, false],
    ['validated', null, false],
    ['uploaded', null, false],
    ['stopped', '2026-10-19T09:00:40.000Z', false],
    ['interrupted', '2026-10-19T09:00:40.000Z', false]
  ] as Array<[JobStatus, string | null, boolean]>)(
    '%s (started: %s) is busy: %s',
    (status, startedAt, busy) => {
      expect(isBusy(aJob({ status, startedAt }))).toBe(busy);
    }
  );
});

describe('the notices about the chosen type (§ 8.2)', () => {
  it('has none when no job of the type is open', () => {
    expect(noticesFor('product', [], 1)).toEqual([]);
    const others = [aJob({ entity: 'category', status: 'running' })];
    expect(noticesFor('product', others, 1)).toEqual([]);
  });

  it('says an import of the type is at work, with how far it got', () => {
    const job = aJob({
      status: 'running',
      stage: 'writing',
      startedAt: '2026-10-19T09:00:40.000Z',
      counts: { total: 100, created: 30, updated: 6 }
    });
    expect(noticesFor('product', [job], 1)).toEqual([
      { kind: 'busy', job, percent: 36 }
    ]);
  });

  it('says a resumed import that waits for a worker is at work, with the rows it has done', () => {
    const job = aJob({
      status: 'queued',
      startedAt: '2026-10-19T09:00:40.000Z',
      counts: { total: 100, created: 40 }
    });
    expect(noticesFor('product', [job], 1)).toEqual([
      { kind: 'busy', job, percent: 40 }
    ]);
  });

  it.each(['completed', 'failed', 'canceled'] as const)(
    'says nothing of a %s job: it is over, and blocks nothing',
    (status) => {
      expect(noticesFor('product', [aJob({ status })], 1)).toEqual([]);
    }
  );

  it.each(['uploaded', 'validating', 'validated', 'queued'] as const)(
    'says an unfinished %s job is replaced, and whose it is',
    (status) => {
      const mine = aJob({ status, createdBy: { id: 1, name: 'Jane' } });
      const theirs = aJob({
        uuid: 'x',
        status,
        createdBy: { id: 2, name: 'Omar' }
      });
      expect(noticesFor('product', [mine], 1)).toEqual([
        { kind: 'replace', job: mine, mine: true }
      ]);
      expect(noticesFor('product', [theirs], 1)).toEqual([
        { kind: 'replace', job: theirs, mine: false }
      ]);
    }
  );

  it('does not know whose a job is when the admin who uploaded it was deleted', () => {
    const job = aJob({ status: 'validated', createdBy: null });
    expect(noticesFor('product', [job], 1)).toEqual([
      { kind: 'replace', job, mine: false }
    ]);
  });

  it.each(['stopped', 'interrupted'] as const)(
    'says a %s import that wrote rows is closed, with the rows it wrote',
    (status) => {
      const job = aJob({
        status,
        startedAt: '2026-10-19T09:00:40.000Z',
        counts: { created: 9000, updated: 2900, failed: 10, skipped: 90 }
      });
      expect(noticesFor('product', [job], 1)).toEqual([
        { kind: 'close', job, rows: 12000 }
      ]);
    }
  );

  it.each(['stopped', 'interrupted'] as const)(
    'treats a %s import that wrote nothing like an unfinished job: it is deleted',
    (status) => {
      const job = aJob({ status, startedAt: null });
      expect(noticesFor('product', [job], 1)).toEqual([
        { kind: 'replace', job, mine: true }
      ]);
    }
  );

  it('asks about a stopped import that wrote nothing when it is another admin’s, like any unfinished job', () => {
    const job = aJob({
      status: 'stopped',
      startedAt: null,
      createdBy: { id: 2, name: 'Omar' }
    });
    expect(noticesFor('product', [job], 1)).toEqual([
      { kind: 'replace', job, mine: false }
    ]);
    expect(describeUpload(input({ openJobs: [job] })).confirm).toHaveLength(1);
  });

  it('can have more than one: an unfinished job and a stopped one', () => {
    const stopped = aJob({
      uuid: 's',
      status: 'stopped',
      startedAt: '2026-10-19T09:00:40.000Z'
    });
    const checked = aJob({ uuid: 'c', status: 'validated' });
    expect(
      noticesFor('product', [stopped, checked], 1).map((n) => n.kind)
    ).toEqual(['close', 'replace']);
  });
});

describe('the choice (§ 8.2, D-18, D-32)', () => {
  it.each([
    ['product', true, true],
    ['category', true, true],
    ['customer', true, false],
    ['customerAddress', false, false]
  ] as Array<[ImportEntity, boolean, boolean]>)(
    '%s: mode shown %s, image check shown %s',
    (entity, showMode, showCheckImages) => {
      const choice = describeUpload(input({ entity }));
      expect(choice.showMode).toBe(showMode);
      expect(choice.showCheckImages).toBe(showCheckImages);
    }
  );

  it('can upload a file when nothing is in the way', () => {
    expect(describeUpload(input()).canUpload).toBe(true);
  });

  it('cannot upload without a file', () => {
    expect(describeUpload(input({ file: null })).canUpload).toBe(false);
  });

  it('cannot upload while an import of the type is at work, but can for another type', () => {
    const busy = aJob({
      entity: 'category',
      status: 'running',
      stage: 'writing'
    });
    expect(
      describeUpload(input({ entity: 'category', openJobs: [busy] })).canUpload
    ).toBe(false);
    expect(
      describeUpload(input({ entity: 'product', openJobs: [busy] })).canUpload
    ).toBe(true);
  });

  it('cannot upload while another upload is on its way', () => {
    expect(describeUpload(input({ uploading: true })).canUpload).toBe(false);
  });

  describe('the file', () => {
    it('is empty', () => {
      const choice = describeUpload(input({ file: { size: 0 } }));
      expect(choice.fileProblem).toBe('empty');
      expect(choice.canUpload).toBe(false);
    });

    it('is larger than the store accepts, by one byte', () => {
      const max = 5 * 1_048_576;
      expect(
        describeUpload(input({ maxFileBytes: max, file: { size: max } }))
          .fileProblem
      ).toBeNull();
      const over = describeUpload(
        input({ maxFileBytes: max, file: { size: max + 1 } })
      );
      expect(over.fileProblem).toBe('tooLarge');
      expect(over.canUpload).toBe(false);
    });

    it('is not too large when the limit is not known (the server decides)', () => {
      const choice = describeUpload(
        input({ maxFileBytes: null, file: { size: 10 ** 12 } })
      );
      expect(choice.fileProblem).toBeNull();
      expect(choice.canUpload).toBe(true);
    });

    it('has no problem before one is chosen', () => {
      expect(describeUpload(input({ file: null })).fileProblem).toBeNull();
    });
  });

  describe('what needs a yes first (D-32)', () => {
    it('is nothing for my own unfinished job: the notice is enough', () => {
      const mine = aJob({
        status: 'validated',
        createdBy: { id: 1, name: 'Jane' }
      });
      const choice = describeUpload(input({ openJobs: [mine] }));
      expect(choice.notices).toHaveLength(1);
      expect(choice.confirm).toEqual([]);
      expect(choice.canUpload).toBe(true);
    });

    it('is another admin’s unfinished job', () => {
      const theirs = aJob({
        status: 'validated',
        createdBy: { id: 2, name: 'Omar' }
      });
      expect(describeUpload(input({ openJobs: [theirs] })).confirm).toEqual([
        { kind: 'replace', job: theirs, mine: false }
      ]);
    });

    it('is a stopped import that wrote rows, whoever uploaded it', () => {
      const stopped = aJob({
        status: 'stopped',
        startedAt: '2026-10-19T09:00:40.000Z',
        createdBy: { id: 1, name: 'Jane' }
      });
      expect(
        describeUpload(input({ openJobs: [stopped] })).confirm.map(
          (n) => n.kind
        )
      ).toEqual(['close']);
    });

    it('is not an import that is at work: that one cannot be replaced at all', () => {
      const busy = aJob({
        status: 'running',
        stage: 'writing',
        createdBy: { id: 2, name: 'Omar' }
      });
      expect(describeUpload(input({ openJobs: [busy] })).confirm).toEqual([]);
    });
  });
});

describe('the address of the page of a job', () => {
  it('puts the id in the place of the placeholder', () => {
    expect(
      viewUrlFor(
        `/admin/import/${PLACEHOLDER_ID}`,
        '6f1d9a52-0000-4000-8000-000000000001'
      )
    ).toBe('/admin/import/6f1d9a52-0000-4000-8000-000000000001');
  });

  it('refuses an address that has no place for it, instead of sending the admin to the wrong page', () => {
    expect(() => viewUrlFor('/admin/import', 'x')).toThrow(
      /no place for the id/
    );
  });
});
