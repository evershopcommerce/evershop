import { describe, it, expect } from '@jest/globals';
import { serializeEContext } from '../../serializeEContext.js';

const LS = String.fromCharCode(0x2028); // line separator
const PS = String.fromCharCode(0x2029); // paragraph separator
const ZWSP = String.fromCharCode(0x200b); // zero-width space

// Free-form translation values that can legitimately appear in CSV files — translation
// text is arbitrary, so the serializer must survive ANY character.
const NASTY = {
  scriptClose: '</script>',
  scriptCloseSpaced: '</SCRIPT >',
  htmlComment: '<!-- hi --> and -->',
  quotes: `He said "hi" & 'bye'`,
  backslashes: 'C:\\path\\to\\x and a\\\\b',
  whitespace: 'line1\nline2\ttab\rcr',
  separators: `a${LS}b${PS}c`,
  zeroWidth: `a${ZWSP}b`,
  unicode: 'Réduction 日本語 مرحبا 🎉🛒',
  placeholders: 'Discount ${x} of ${y}',
  html: '<b>bold</b> <a href="x">link</a> &amp; &lt;',
  injection: '</script><script>alert(1)</script>";alert(2)//',
  braces: '}]);{[(',
  empty: ''
};

const roundTripJson = (value) => JSON.parse(serializeEContext(value));
// Simulates the browser parsing `var eContext = <output>`.
const evalAsScript = (value) =>
  // eslint-disable-next-line no-new-func
  Function(`return (${serializeEContext(value)});`)();

describe('serializeEContext — round-trip fidelity', () => {
  it('JSON.parse recovers every nasty translation value exactly', () => {
    expect(roundTripJson({ translations: NASTY })).toEqual({
      translations: NASTY
    });
  });

  it('evaluating `var eContext = <output>` recovers the value exactly', () => {
    const eContext = {
      locale: 'fr',
      translations: NASTY,
      graphqlResponse: { name: NASTY.injection, sep: NASTY.separators }
    };
    expect(evalAsScript(eContext)).toEqual(eContext);
  });

  it('round-trips each value individually (incl. as an object key)', () => {
    for (const [k, v] of Object.entries(NASTY)) {
      expect(roundTripJson({ [k]: v })).toEqual({ [k]: v });
      // The English source string is itself the dict key, so keys can be nasty too.
      expect(roundTripJson({ [v || '∅']: 'x' })).toEqual({ [v || '∅']: 'x' });
    }
  });
});

describe('serializeEContext — <script> safety', () => {
  const out = serializeEContext({
    t: Object.values(NASTY).join(' | '),
    k: NASTY
  });

  it('contains no raw </script (would close the inline tag)', () => {
    expect(out).not.toMatch(/<\/script/i);
  });

  it('contains no raw <!-- (the HTML-comment opener that arms the script-data hack)', () => {
    // jsesc escapes the opener `<!--` (→ `<!--`). A lone `-->` with no open
    // comment is inert, so only the opener needs neutralizing.
    expect(out).not.toContain('<!--');
  });

  it('contains no raw U+2028 / U+2029 line separators', () => {
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
  });

  it('is itself valid JSON', () => {
    expect(() => JSON.parse(out)).not.toThrow();
  });
});
