import { describe, it, expect } from '@jest/globals';
import { ImageError, imageIssue } from '../../../services/images/types.js';

const where = { rowNumber: 7, column: 'images', value: 'https://x.test/a.png' };

describe('imageIssue (IMAGE_UNREADABLE)', () => {
  it('names the row, the column and the URL, and keeps the reason and its figures', () => {
    expect(
      imageIssue(new ImageError('http_status', { status: 404 }), where)
    ).toEqual({
      code: 'IMAGE_UNREADABLE',
      severity: 'error',
      rowNumber: 7,
      column: 'images',
      params: { reason: 'http_status', status: 404 },
      message:
        'The image in column "images" answered with the status 404 and not with an image.',
      say: {
        t: 'The image in column "${1}" ${2}',
        a: [
          'images',
          {
            t: 'answered with the status ${1} and not with an image.',
            a: ['404']
          }
        ]
      },
      value: 'https://x.test/a.png'
    });
  });

  it.each([
    [new ImageError('invalid_url'), 'must start with http://'],
    [new ImageError('blocked'), 'private or reserved address'],
    [new ImageError('timeout'), 'did not answer in time'],
    [new ImageError('network', { code: 'ECONNREFUSED' }), 'ECONNREFUSED'],
    [new ImageError('too_many_redirects', { max: 3 }), 'more than 3 times'],
    [new ImageError('not_an_image', { contentType: 'text/html' }), 'text/html'],
    [
      new ImageError('not_an_image', { contentType: null }),
      'does not say what it is'
    ],
    [
      new ImageError('type_not_allowed', { contentType: 'image/bmp' }),
      'image/bmp'
    ],
    [
      new ImageError('too_large', { contentType: 'image/png', maxMb: 10 }),
      'larger than the 10 MB'
    ],
    [new ImageError('empty'), 'is empty'],
    [new ImageError('storage_failed', { message: 'disk full' }), 'file storage']
  ])('explains %j', (error, text) => {
    expect(imageIssue(error, where).message).toContain(text);
  });

  it('cuts a very long URL in the value', () => {
    const issue = imageIssue(new ImageError('empty'), {
      ...where,
      value: `https://x.test/${'a'.repeat(500)}`
    });
    expect(issue.value?.length).toBeLessThanOrEqual(101);
  });
});
