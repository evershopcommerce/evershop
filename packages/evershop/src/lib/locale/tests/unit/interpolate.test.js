import { describe, it, expect } from '@jest/globals';
import { interpolate } from '../../interpolate.js';

describe('interpolate', () => {
  it('returns the text unchanged when no values are given', () => {
    expect(interpolate('Hi ${name}')).toBe('Hi ${name}');
    expect(interpolate('Hi ${name}', {})).toBe('Hi ${name}');
  });

  it('substitutes a placeholder', () => {
    expect(interpolate('Hi ${name}', { name: 'Lee' })).toBe('Hi Lee');
  });

  it('substitutes the same placeholder more than once', () => {
    expect(interpolate('${x} and ${x}', { x: 'A' })).toBe('A and A');
  });

  it('substitutes multiple distinct placeholders', () => {
    expect(interpolate('${a}-${b}', { a: '1', b: '2' })).toBe('1-2');
  });

  it('leaves a placeholder whose key is absent untouched', () => {
    expect(interpolate('Hi ${name}', { other: 'x' })).toBe('Hi ${name}');
  });

  it('trims whitespace inside the placeholder key', () => {
    expect(interpolate('${ name }', { name: 'X' })).toBe('X');
  });

  it('does not touch a $ that is not followed by {', () => {
    expect(interpolate('Cost $5 and ${n}', { n: '3' })).toBe('Cost $5 and 3');
  });

  it('is single-pass — a value containing ${...} is not re-substituted', () => {
    expect(interpolate('${a}', { a: '${b}', b: 'NESTED' })).toBe('${b}');
  });

  it('leaves stray braces alone', () => {
    expect(interpolate('a}b{c', { c: 'X' })).toBe('a}b{c');
  });

  it('substitutes an empty-string value', () => {
    expect(interpolate('[${x}]', { x: '' })).toBe('[]');
  });

  it('keeps free-form / unicode text around placeholders intact', () => {
    expect(interpolate('Réduction ${d} 🎉', { d: '10%' })).toBe(
      'Réduction 10% 🎉'
    );
  });
});
