import { describe, expect, it } from '@jest/globals';
import { emailPattern } from '../../services/customer/emailPattern.js';

describe('emailPattern', () => {
  it('leaves an ordinary address as it is', () => {
    expect(emailPattern('jane.doe+shop@example.com')).toBe(
      'jane.doe+shop@example.com'
    );
  });

  it('writes the three characters of a pattern as themselves', () => {
    expect(emailPattern('a_b%c\\d@example.com')).toBe(
      'a\\_b\\%c\\\\d@example.com'
    );
  });
});
