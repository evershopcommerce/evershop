import { describe, expect, it } from '@jest/globals';
import {
  entityLabel,
  entityNoun,
  modeLabel,
  refusalMessage,
  statusLabel,
  statusTone,
  uploadFailureMessage
} from '../../../components/labels.js';
import type { JobStatus } from '../../../services/job/types.js';
import { IMPORT_ENTITIES } from '../../../services/types.js';
import type { ImportEntity, ImportMode } from '../../../services/types.js';

const STATUSES: JobStatus[] = [
  'uploading',
  'uploaded',
  'validating',
  'validated',
  'queued',
  'running',
  'completed',
  'failed',
  'stopped',
  'canceled',
  'interrupted'
];
const ENTITIES = Object.keys(IMPORT_ENTITIES) as ImportEntity[];

describe('the words of the import pages', () => {
  it.each(STATUSES)(
    'has a label for the status %s, and it is not the raw status',
    (status) => {
      const label = statusLabel(status);
      expect(label).not.toBe(status);
      expect(label).toMatch(/^[A-Z]/);
    }
  );

  it('gives each status its own label', () => {
    expect(new Set(STATUSES.map(statusLabel)).size).toBe(STATUSES.length);
  });

  it.each(ENTITIES)('has a name for %s, alone and in a sentence', (entity) => {
    expect(entityLabel(entity)).not.toBe(entity);
    expect(entityNoun(entity)).not.toBe(entity);
    expect(entityNoun(entity)).toBe(entityNoun(entity).toLowerCase());
  });

  it.each([
    ['upsert', 'Create and update'],
    ['create', 'Only create'],
    ['update', 'Only update']
  ] as Array<[ImportMode, string]>)('names the mode %s', (mode, label) => {
    expect(modeLabel('product', mode)).toBe(label);
  });

  it('names no mode for customer addresses', () => {
    expect(modeLabel('customerAddress', 'create')).toBe('--');
  });

  it('colours the end of an import by how it ended', () => {
    expect(statusTone('completed')).toBe('success');
    expect(statusTone('failed')).toBe('destructive');
    expect(statusTone('stopped')).toBe('warning');
    expect(statusTone('interrupted')).toBe('warning');
    expect(statusTone('canceled')).toBe('secondary');
    expect(statusTone('running')).toBe('default');
  });

  describe('what the API refused', () => {
    const refuse = (code: string | null, status = 409) =>
      refusalMessage({ status, code, message: 'English from the server' });

    it.each([
      'IMPORT_ALREADY_RUNNING',
      'OPEN_JOB_EXISTS',
      'FILE_HAS_ERRORS',
      'WRONG_STATUS',
      'FILE_UNAVAILABLE',
      'NOT_FOUND'
    ])('says %s in its own words', (code) => {
      expect(refuse(code)).not.toBe('English from the server');
    });

    it('says a missing answer is the connection, not the job', () => {
      expect(refuse(null, 0)).toBe(
        'The page could not reach the server. Try again.'
      );
    });

    it('shows the server’s text for a code it does not know', () => {
      expect(refuse('SOMETHING_NEW')).toBe('English from the server');
    });
  });

  describe('what the API said when an upload did not go through', () => {
    const fail = (
      code: string | null,
      status = 409,
      details?: Record<string, unknown>
    ) =>
      uploadFailureMessage({
        status,
        code,
        message: 'English from the server',
        details
      });

    it('says an import of the type is running', () => {
      expect(fail('IMPORT_RUNNING')).toContain(
        'An import of this type is running.'
      );
    });

    it('says how large a file may be', () => {
      expect(
        fail('FILE_TOO_LARGE', 413, { maxFileBytes: 100 * 1_048_576 })
      ).toBe('The file is larger than 100 MB.');
    });

    it('uses the server’s text when it does not say how large', () => {
      expect(fail('FILE_TOO_LARGE', 413)).toBe('English from the server');
    });

    it('says the upload did not finish when there was no answer', () => {
      expect(fail(null, 0)).toBe(
        'The upload did not finish. Check your connection and try again.'
      );
    });

    it('shows the server’s text for anything else', () => {
      expect(fail('INVALID_REQUEST', 400)).toBe('English from the server');
    });
  });
});
