import { describe, expect, it } from '@jest/globals';
import { interpolate } from '../../../../lib/locale/interpolate.js';
import { renderSay, say, sayText } from '../../services/say.js';

/**
 * A sentence kept as a template and its values (`say`), so that it can be said
 * again in another language when it is read.
 */
const column = 'price';

describe('say', () => {
  it('is the English sentence, with the values put in', () => {
    expect(String(say`The value in column "${column}" is ${3} too low.`)).toBe(
      'The value in column "price" is 3 too low.'
    );
    expect(String(say`No values here.`)).toBe('No values here.');
  });

  it('keeps the template with numbered placeholders, in the order of the values', () => {
    const sentence = say`Row ${7} has ${2} cells but the header has ${3}.`;
    expect(sentence.template).toBe(
      'Row ${1} has ${2} cells but the header has ${3}.'
    );
    expect(sentence.data()).toEqual({
      t: 'Row ${1} has ${2} cells but the header has ${3}.',
      a: ['7', '2', '3']
    });
  });

  it('puts a sentence inside a sentence, and keeps both', () => {
    const inner = say`must be a whole number from 0 to ${99}.`;
    const outer = say`The value in column "${column}" ${inner}`;
    expect(String(outer)).toBe(
      'The value in column "price" must be a whole number from 0 to 99.'
    );
    expect(outer.data()).toEqual({
      t: 'The value in column "${1}" ${2}',
      a: ['price', { t: 'must be a whole number from 0 to ${1}.', a: ['99'] }]
    });
  });

  it('keeps a text as it is: a value is not a template', () => {
    const sentence = say`Row ${1} says ${'${2} and ${1}'}.`;
    expect(sentence.data().a).toEqual(['1', '${2} and ${1}']);
    expect(String(sayText('is empty.'))).toBe('is empty.');
    expect(sayText('is empty.').data()).toEqual({ t: 'is empty.', a: [] });
  });

  it('cuts a very long value in what it keeps, not in the sentence', () => {
    const long = 'x'.repeat(5000);
    const sentence = say`The column "${long}" is odd.`;
    expect(String(sentence)).toContain(long);
    const [kept] = sentence.data().a as string[];
    expect(kept.length).toBeLessThan(1100);
    expect(kept.endsWith('…')).toBe(true);
  });
});

describe('renderSay', () => {
  // A dictionary and the interpolation core's `translate` uses.
  const dictionary: Record<string, string> = {
    'Row ${1} has ${2} cells but the header has ${3}.':
      'Dòng ${1} có ${2} ô nhưng dòng tiêu đề có ${3}.',
    'The value in column "${1}" ${2}': 'Giá trị ở cột "${1}" ${2}',
    'must be a whole number from 0 to ${1}.':
      'phải là số nguyên từ 0 đến ${1}.',
    'Swap ${1} and ${2}.': '${2} đổi chỗ với ${1}.'
  };
  const translate = (key: string, values: Record<string, string>) =>
    interpolate(dictionary[key] || key, values);

  it('says a sentence in the language of the dictionary', () => {
    expect(
      renderSay(
        say`Row ${7} has ${2} cells but the header has ${3}.`.data(),
        translate
      )
    ).toBe('Dòng 7 có 2 ô nhưng dòng tiêu đề có 3.');
  });

  it('says a sentence inside a sentence in the language of the whole', () => {
    const data =
      say`The value in column "${column}" ${say`must be a whole number from 0 to ${99}.`}`.data();
    expect(renderSay(data, translate)).toBe(
      'Giá trị ở cột "price" phải là số nguyên từ 0 đến 99.'
    );
  });

  it('lets a translation put the values in another order', () => {
    expect(renderSay(say`Swap ${'a'} and ${'b'}.`.data(), translate)).toBe(
      'b đổi chỗ với a.'
    );
  });

  it('falls back to the English sentence when there is no translation', () => {
    expect(
      renderSay(say`Nothing to say about ${'this'}.`.data(), translate)
    ).toBe('Nothing to say about this.');
  });

  it('does not read a value as a placeholder', () => {
    // A cell that holds `${2}` must come out as it is, not as the second value.
    expect(renderSay(say`Swap ${'${2}'} and ${'b'}.`.data(), translate)).toBe(
      'b đổi chỗ với ${2}.'
    );
  });
});
