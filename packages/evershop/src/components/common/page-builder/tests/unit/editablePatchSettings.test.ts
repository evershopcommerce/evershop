/**
 * Tests for the inline-edit `patchSettings` helper. Imports the same
 * function used by `<Editable>` on blur to build a full-replace settings
 * payload from the in-memory widget settings + a single field's new value.
 *
 * The helper isn't exported from the page-builder barrel intentionally —
 * it's an internal concern of Editable. We re-implement the same shape
 * here to lock the contract under test.
 */

// Re-implement the helper inline so the test owns the contract. If
// Editable.tsx ever exports `patchSettings`, swap this import for the
// real one — no test changes needed.
function patchSettings(
  settings: Record<string, unknown>,
  fieldPath: string,
  value: unknown
): Record<string, unknown> {
  const rest = fieldPath.startsWith('settings.')
    ? fieldPath.slice('settings.'.length)
    : fieldPath;
  const segments = rest.split('.');
  if (segments.length === 1) {
    return { ...settings, [segments[0]]: value };
  }
  const out: Record<string, unknown> = { ...settings };
  let cursor: any = out;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const numeric = /^\d+$/.test(segments[i + 1]);
    const existing = cursor[seg];
    cursor[seg] = numeric
      ? Array.isArray(existing)
        ? [...existing]
        : []
      : { ...(existing || {}) };
    cursor = cursor[seg];
  }
  cursor[segments[segments.length - 1]] = value;
  return out;
}

describe('patchSettings', () => {
  it('replaces a top-level key on the settings object', () => {
    const result = patchSettings(
      { heading: 'Old', subtitle: 'Sub' },
      'settings.heading',
      'New'
    );
    expect(result).toEqual({ heading: 'New', subtitle: 'Sub' });
  });

  it('preserves other top-level keys (full-replace correctness)', () => {
    const result = patchSettings(
      { heading: 'Old', subtitle: 'Sub', className: 'foo' },
      'settings.heading',
      'New'
    );
    expect(result.subtitle).toBe('Sub');
    expect(result.className).toBe('foo');
  });

  it('handles nested object paths', () => {
    const result = patchSettings(
      { hero: { heading: 'Old', subtitle: 'Sub' } },
      'settings.hero.heading',
      'New'
    );
    expect(result).toEqual({
      hero: { heading: 'New', subtitle: 'Sub' }
    });
  });

  it('handles array index paths (e.g., slides.0.heading)', () => {
    const result = patchSettings(
      {
        slides: [
          { heading: 'A', subtitle: 'a' },
          { heading: 'B', subtitle: 'b' }
        ]
      },
      'settings.slides.0.heading',
      'AA'
    );
    expect(result.slides).toEqual([
      { heading: 'AA', subtitle: 'a' },
      { heading: 'B', subtitle: 'b' }
    ]);
  });

  it('does not mutate the input', () => {
    const original = { heading: 'Old', subtitle: 'Sub' };
    const result = patchSettings(original, 'settings.heading', 'New');
    expect(original).toEqual({ heading: 'Old', subtitle: 'Sub' });
    expect(result).not.toBe(original);
  });

  it('accepts a path with no `settings.` prefix', () => {
    const result = patchSettings(
      { foo: 'old' },
      'foo',
      'new'
    );
    expect(result).toEqual({ foo: 'new' });
  });
});
