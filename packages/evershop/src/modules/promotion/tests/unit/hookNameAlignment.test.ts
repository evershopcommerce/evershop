import { describe, it, expect } from '@jest/globals';
import { replaceHomepageCore } from '../../services/landingPage/replaceHomepage.js';

/**
 * `hookable()` keys hooks by the WRAPPED function's `.name`. The public
 * `hookBefore/AfterReplaceHomepage` helpers register `'replaceHomepage'`, so
 * the wrapped named function expression must carry exactly that name.
 */
describe('hookable name alignment — replaceHomepage', () => {
  it('replaceHomepageCore.name === "replaceHomepage"', () => {
    expect(replaceHomepageCore.name).toBe('replaceHomepage');
  });
});
