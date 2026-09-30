import { describe, expect, it } from '@jest/globals';
import { matchesAccept } from '../../mimeMatch.js';

describe('matchesAccept', () => {
  it('matches exact types and family wildcards', () => {
    expect(matchesAccept('image/png', ['image/png'])).toBe(true);
    expect(matchesAccept('image/png', ['image/*'])).toBe(true);
    expect(matchesAccept('application/pdf', ['image/*'])).toBe(false);
    expect(matchesAccept('image/png', ['*/*'])).toBe(true);
  });

  it('allows everything when nothing is requested', () => {
    expect(matchesAccept('application/zip', undefined)).toBe(true);
    expect(matchesAccept('application/zip', [])).toBe(true);
  });

  it('allows a file whose type is unknown', () => {
    // A provider written before listings reported types. Rejecting everything
    // it returns would make the browser unusable against it.
    expect(matchesAccept(undefined, ['image/*'])).toBe(true);
  });

  it('ignores case and surrounding space', () => {
    expect(matchesAccept('IMAGE/PNG', [' image/png '])).toBe(true);
  });
});
