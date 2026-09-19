import { applyScopePrefix } from '../../WidgetSettingsScope.js';

describe('applyScopePrefix', () => {
  it('returns the name unchanged when no prefix is given', () => {
    expect(applyScopePrefix(undefined, 'title')).toBe('title');
    expect(applyScopePrefix(null, 'title')).toBe('title');
    expect(applyScopePrefix('', 'title')).toBe('title');
  });

  it('prepends the prefix to the field name', () => {
    expect(applyScopePrefix('block.abc.settings.', 'title')).toBe(
      'block.abc.settings.title'
    );
  });

  it('handles nested field paths', () => {
    expect(applyScopePrefix('block.abc.settings.', 'slides.0.heading')).toBe(
      'block.abc.settings.slides.0.heading'
    );
  });

  it('is idempotent when the name already starts with the prefix', () => {
    expect(
      applyScopePrefix('block.abc.settings.', 'block.abc.settings.title')
    ).toBe('block.abc.settings.title');
  });

  it('does not double-prefix even if a parent scope already prefixed', () => {
    // Defensive: if a setting component is rendered through nested scopes
    // (rare but possible), the field component still resolves to a single
    // prefix application.
    const inner = applyScopePrefix('block.abc.settings.', 'title');
    const outer = applyScopePrefix('block.abc.settings.', inner);
    expect(outer).toBe('block.abc.settings.title');
  });
});
