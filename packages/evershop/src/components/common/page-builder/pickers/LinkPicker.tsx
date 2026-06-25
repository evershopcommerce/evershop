
import { drawerInputClass } from '@components/common/page-builder/drawer/index.js';
import { BlogPicker } from '@components/common/page-builder/pickers/BlogPicker.js';
import { CategoryPicker } from '@components/common/page-builder/pickers/CategoryPicker.js';
import { PagePicker } from '@components/common/page-builder/pickers/PagePicker.js';
import { ProductPicker } from '@components/common/page-builder/pickers/ProductPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  BlogUrn,
  CatalogUrn,
  CmsUrn,
  UrnService
} from '@evershop/evershop/lib/urn';
import React, { useState } from 'react';

/**
 * Composite "where does this link go?" picker for widget CTAs and tile
 * links. Tabs: Page · Category · Product · Collection · Custom URL.
 *
 * Storage format:
 *  - Internal entities → URN: `urn:evershop:<kind>:<id>` (id is uuid
 *    for page/category/product, code for collection). The storefront
 *    resolves URNs at request time via per-request batched loaders,
 *    so the rendered link reflects the entity's *current* URL — if a
 *    category is renamed, every widget linking to it follows along.
 *  - Custom URL → plain string (unchanged passthrough).
 *
 * `kind` is an admin-only hint helping the picker re-open on the tab
 * the merchant last used; the URN encodes it too, so kind is derivable
 * on re-edit even when not stored separately.
 */

type ParsedLinkUrn = { kind: Exclude<LinkKind, 'custom'>; id: string };

// Map a URN's (service, type) to the LinkPicker tab kind. Returns null
// for non-link URNs (e.g. widget_instance) so they fall back to custom-URL.
function parseUrn(value: string | undefined | null): ParsedLinkUrn | null {
  if (!value || !UrnService.isValid(value)) return null;
  const { service, type, uuid } = UrnService.parse(value);
  if (service === 'catalog' && type === 'product') return { kind: 'product', id: uuid };
  if (service === 'catalog' && type === 'category') return { kind: 'category', id: uuid };
  if (service === 'cms' && type === 'page') return { kind: 'page', id: uuid };
  if (service === 'blog' && type === 'post')
    return { kind: 'blogPost', id: uuid };
  if (service === 'blog' && type === 'category')
    return { kind: 'blogCategory', id: uuid };
  if (service === 'blog' && type === 'tag')
    return { kind: 'blogTag', id: uuid };
  return null;
}

export type LinkKind =
  | 'page'
  | 'category'
  | 'product'
  | 'blogPost'
  | 'blogCategory'
  | 'blogTag'
  | 'custom';

const TABS: { value: LinkKind; label: string }[] = [
  { value: 'page', label: _('Page') },
  { value: 'category', label: _('Category') },
  { value: 'product', label: _('Product') },
  { value: 'blogPost', label: _('Blog post') },
  { value: 'blogCategory', label: _('Blog category') },
  { value: 'blogTag', label: _('Blog tag') },
  { value: 'custom', label: _('Custom URL') }
];

export interface LinkPickerProps {
  value: string;
  onChange: (next: { url: string; kind: LinkKind; label?: string }) => void;
  /** Initial tab. Defaults to "custom" so the freeform path is the fastest. */
  initialKind?: LinkKind;
  /** When non-collection links are out of scope (e.g. a collection-only CTA),
   *  hide the other tabs. */
  allowedKinds?: LinkKind[];
}

export function LinkPicker({
  value,
  onChange,
  initialKind = 'custom',
  allowedKinds
}: LinkPickerProps) {
  const visibleTabs = allowedKinds
    ? TABS.filter((t) => allowedKinds.includes(t.value))
    : TABS;
  // If the stored value is a URN, the kind is derivable from it — open
  // on that tab regardless of the explicit `initialKind` hint.
  const parsed = parseUrn(value);
  const effectiveInitial: LinkKind = parsed ? parsed.kind : initialKind;
  const [tab, setTab] = useState<LinkKind>(
    visibleTabs.find((t) => t.value === effectiveInitial)?.value ??
      visibleTabs[0].value
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-divider">
        {visibleTabs.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`relative -mb-px border-b-2 px-2 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'page' && (
        <PagePicker
          selectedUuid={parsed?.kind === 'page' ? parsed.id : null}
          selectedUrl={parsed ? null : value || null}
          onPick={(r) =>
            onChange({ url: CmsUrn.page(r.uuid), kind: 'page', label: r.name })
          }
        />
      )}
      {tab === 'category' && (
        <CategoryPicker
          selectedUuid={parsed?.kind === 'category' ? parsed.id : null}
          selectedUrl={parsed ? null : value || null}
          onPick={(r) =>
            onChange({
              url: CatalogUrn.category(r.uuid),
              kind: 'category',
              label: r.name
            })
          }
        />
      )}
      {tab === 'product' && (
        <ProductPicker
          selectedUuid={parsed?.kind === 'product' ? parsed.id : null}
          selectedUrl={parsed ? null : value || null}
          onPick={(r) =>
            onChange({
              url: CatalogUrn.product(r.uuid),
              kind: 'product',
              label: r.name
            })
          }
        />
      )}
      {tab === 'blogPost' && (
        <BlogPicker
          kind="post"
          selectedUuid={parsed?.kind === 'blogPost' ? parsed.id : null}
          onPick={(r) =>
            onChange({
              url: BlogUrn.post(r.uuid),
              kind: 'blogPost',
              label: r.name
            })
          }
        />
      )}
      {tab === 'blogCategory' && (
        <BlogPicker
          kind="category"
          selectedUuid={parsed?.kind === 'blogCategory' ? parsed.id : null}
          onPick={(r) =>
            onChange({
              url: BlogUrn.category(r.uuid),
              kind: 'blogCategory',
              label: r.name
            })
          }
        />
      )}
      {tab === 'blogTag' && (
        <BlogPicker
          kind="tag"
          selectedUuid={parsed?.kind === 'blogTag' ? parsed.id : null}
          onPick={(r) =>
            onChange({
              url: BlogUrn.tag(r.uuid),
              kind: 'blogTag',
              label: r.name
            })
          }
        />
      )}
      {tab === 'custom' && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={parsed ? '' : value || ''}
            onChange={(e) =>
              onChange({ url: e.target.value, kind: 'custom' })
            }
            placeholder="/c/sale or https://example.com"
            className={drawerInputClass}
          />
          <div className="text-[11px] text-muted-foreground">
            {_('Paste a URL or a relative path starting with ')}
            <code>/</code>.
          </div>
        </div>
      )}
    </div>
  );
}
