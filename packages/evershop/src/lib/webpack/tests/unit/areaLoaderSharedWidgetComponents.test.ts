import { describe, it, expect } from '@jest/globals';
import { buildWidgetComponentsPerRoute } from '../../loaders/AreaLoader.js';

/**
 * Regression: two widget types sharing one settingComponent (or preview)
 * file. Imports dedupe BY URL while identifiers generate PER TYPE — the
 * second type's map entry must reference the identifier the deduped import
 * actually declared, or the generated admin Index references an undeclared
 * variable and the whole bundle dies at init ("eXXXX is not defined").
 */

const widget = (type: string, settingComponent: string, preview: string) => ({
  type,
  settingComponent,
  component: `/dist/components/${type}.js`,
  previewComponent: preview
});

function referencedIds(components: Record<string, { component: { default: string } }>) {
  return Object.values(components).map((entry) =>
    entry.component.default.replace(/-/g, '')
  );
}

describe('AreaLoader shared widget component files', () => {
  it('admin: two types sharing settingComponent + preview reference the single emitted import', () => {
    const imports = new Map<{ id: string; url: string }, string>();
    const components = buildWidgetComponentsPerRoute(
      { isAdmin: true },
      [
        widget('type_a', '/dist/components/SharedSetting.js', '/dist/components/PreviewA.js'),
        widget('type_b', '/dist/components/SharedSetting.js', '/dist/components/PreviewA.js')
      ],
      imports
    );
    const declaredIds = Array.from(imports.keys()).map((key) => key.id);
    // One import per unique file (shared setting + shared preview).
    expect(declaredIds).toHaveLength(2);
    // Four map entries (setting + preview per type), keys per-type…
    expect(Object.keys(components)).toHaveLength(4);
    // …but every referenced identifier must be one that was actually declared.
    for (const referenced of referencedIds(
      components as Record<string, { component: { default: string } }>
    )) {
      expect(declaredIds).toContain(referenced);
    }
  });

  it('storefront: distinct component files keep distinct imports and references', () => {
    const imports = new Map<{ id: string; url: string }, string>();
    const components = buildWidgetComponentsPerRoute(
      { isAdmin: false },
      [
        widget('type_a', '/dist/components/SettingA.js', '/dist/components/PreviewA.js'),
        widget('type_b', '/dist/components/SettingB.js', '/dist/components/PreviewB.js')
      ],
      imports
    );
    const declaredIds = Array.from(imports.keys()).map((key) => key.id);
    expect(declaredIds).toHaveLength(2); // storefront bundles widget.component only
    for (const referenced of referencedIds(
      components as Record<string, { component: { default: string } }>
    )) {
      expect(declaredIds).toContain(referenced);
    }
  });
});
