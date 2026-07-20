import {
  computeDefinitionStatus,
  type DefinitionStatus
} from '@components/common/metafield/definitionStatus.js';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';

/** Payload of the iframe's `metafield-select` bridge message. */
export interface MetafieldSelection {
  ownerType: string;
  ownerUuid?: string;
  namespace: string;
  fieldKey: string;
  value?: unknown;
  declared?: {
    type: string;
    isList?: boolean;
    visibleToCustomer?: boolean;
    name?: string;
    description?: string;
    placeholder?: string;
  } | null;
  resolutionKind?: string;
}

interface ExistingDefinition {
  uuid: string;
  namespace: string;
  key: string;
  name: string;
  type: string;
  isList?: boolean;
  visibleToCustomer?: boolean;
  provisionedByTheme?: string;
}

/** Admin edit-surface deep links per owner (route.json paths, /admin prefix). */
const EDIT_SURFACES: Record<
  string,
  { label: string; url: (uuid?: string) => string | null }
> = {
  product: {
    label: 'the product edit form',
    url: (uuid) => (uuid ? `/admin/products/edit/${uuid}` : null)
  },
  category: {
    label: 'the category edit form',
    url: (uuid) => (uuid ? `/admin/categories/edit/${uuid}` : null)
  },
  collection: {
    label: 'the collection edit form',
    url: (uuid) => (uuid ? `/admin/collections/edit/${uuid}` : null)
  },
  customer: {
    label: 'the customer view',
    url: (uuid) => (uuid ? `/admin/customers/edit/${uuid}` : null)
  },
  order: {
    label: 'the order view',
    url: (uuid) => (uuid ? `/admin/order/edit/${uuid}` : null)
  },
  blog_post: {
    label: 'the blog post edit form',
    url: (uuid) => (uuid ? `/admin/blog/posts/edit/${uuid}` : null)
  },
  blog_category: {
    label: 'the blog category edit form',
    url: (uuid) => (uuid ? `/admin/blog/categories/edit/${uuid}` : null)
  },
  shop: { label: 'Store Settings', url: () => '/admin/setting/store' }
};

/**
 * The guideline drawer (theme-metafields design § V1.1) — informational by
 * design. Metafield values are LIVE entity data (owner decision: the builder
 * is route-level, values are entity-level — a value editor here would write
 * to whatever sample entity the preview happens to show). The drawer
 * explains the field, reports definition status (create-if-missing +
 * immutable-conflict banner), and deep-links to the real editing surface.
 */
export default function MetafieldGuideDrawer({
  selection,
  onClose,
  containerRef
}: {
  selection: MetafieldSelection;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const { ownerType, ownerUuid, namespace, fieldKey, declared } = selection;
  const [existing, setExisting] = useState<ExistingDefinition | null>(null);
  const [status, setStatus] = useState<DefinitionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await axios.get(
        `/api/metafield-definitions?ownerType=${encodeURIComponent(ownerType)}`
      );
      const defs: ExistingDefinition[] = res.data?.data ?? [];
      const found =
        defs.find((d) => d.namespace === namespace && d.key === fieldKey) ??
        null;
      setExisting(found);
      setStatus(computeDefinitionStatus(declared ?? null, found));
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    }
  }, [ownerType, namespace, fieldKey, declared]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createDefinition = async () => {
    if (!declared) return;
    setBusy(true);
    setError(null);
    try {
      await axios.post('/api/metafield-definitions', {
        ownerType,
        namespace,
        fieldKey,
        name: declared.name ?? fieldKey,
        fieldType: declared.type,
        ...(declared.isList ? { isList: true } : {}),
        ...(declared.visibleToCustomer === false
          ? { visibleToCustomer: false }
          : {}),
        ...(declared.description ? { description: declared.description } : {}),
        ...(declared.placeholder
          ? { appearance: { placeholder: declared.placeholder } }
          : {}),
        // Attribute to the active theme (resolved server-side) — same
        // ownership a boot/activate provisioning run would have stamped.
        provisionedByActiveTheme: true
      });
    } catch (e: any) {
      // 409 = a concurrent create (boot provisioning, another tab) won the
      // race — fall through to refresh and re-diff against the winner.
      if (e?.response?.status !== 409) {
        setError(e?.response?.data?.error?.message ?? (e as Error).message);
      }
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const surface = EDIT_SURFACES[ownerType];
  const editUrl = surface?.url(ownerUuid) ?? null;
  const displayName = existing?.name ?? declared?.name ?? fieldKey;
  const valuePreview =
    selection.value === null || selection.value === undefined
      ? null
      : JSON.stringify(selection.value, null, 1);

  return (
    <aside
      ref={containerRef as React.RefObject<HTMLElement>}
      data-testid="mf-guide-drawer"
      className="absolute top-0 right-0 h-full w-[380px] bg-white border-l border-border shadow-xl z-[1200] overflow-y-auto"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Live data
          </div>
          <div className="font-semibold">{displayName}</div>
        </div>
        <button
          type="button"
          aria-label="Close"
          className="text-xl leading-none px-2 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="px-4 py-3 space-y-4 text-sm">
        <div className="rounded border border-violet-200 bg-violet-50 text-violet-900 p-3">
          This is a <strong>metafield</strong> — live{' '}
          <strong>{ownerType.replace('_', ' ')}</strong> data, not part of your
          draft. Changes to it apply immediately, everywhere the entity appears,
          and are not staged, previewed or published by the page builder.
        </div>

        <dl className="grid grid-cols-[90px_1fr] gap-y-1">
          <dt className="text-muted-foreground">Field</dt>
          <dd>
            {ownerType}.{namespace}.{fieldKey}
          </dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>
            {(existing?.type ?? declared?.type ?? 'unknown').toLowerCase()}
            {existing?.isList ?? declared?.isList ? ' (list)' : ''}
          </dd>
          {(existing?.provisionedByTheme || declared) && (
            <>
              <dt className="text-muted-foreground">Declared by</dt>
              <dd>
                {existing?.provisionedByTheme
                  ? `theme "${existing.provisionedByTheme}"`
                  : 'the active theme'}
              </dd>
            </>
          )}
          {(declared?.description || selection.declared?.placeholder) && (
            <>
              {declared?.description && (
                <>
                  <dt className="text-muted-foreground">About</dt>
                  <dd>{declared.description}</dd>
                </>
              )}
              {declared?.placeholder && (
                <>
                  <dt className="text-muted-foreground">Default</dt>
                  <dd>“{declared.placeholder}”</dd>
                </>
              )}
            </>
          )}
        </dl>

        {valuePreview !== null && (
          <div>
            <div className="text-muted-foreground mb-1">
              Current value on the previewed entity
            </div>
            <pre className="rounded bg-muted p-2 text-xs max-h-40 overflow-auto whitespace-pre-wrap">
              {valuePreview.slice(0, 800)}
            </pre>
          </div>
        )}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 text-red-800 p-3">
            {error}
          </div>
        )}

        {status?.kind === 'conflict' && (
          <div
            data-testid="mf-guide-conflict"
            className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-3"
          >
            <strong>Definition conflict.</strong> A field with this key already
            exists but differs on{' '}
            {status.details
              .map(
                (d) =>
                  `${d.field} (theme declares ${JSON.stringify(
                    d.declared
                  )}, existing is ${JSON.stringify(d.existing)})`
              )
              .join('; ')}
            . These are immutable — the theme’s declaration is skipped and the
            existing definition stays in charge. To adopt the theme’s shape, use
            a new key in the theme, or delete the existing definition (this
            drops its stored values store-wide).
          </div>
        )}

        {status?.kind === 'missing-declared' && (
          <div className="rounded border border-border p-3 space-y-2">
            <div>
              The theme declares this field but it hasn’t been created yet (it
              provisions automatically at activation or the next server start).
            </div>
            <button
              type="button"
              data-testid="mf-guide-create"
              disabled={busy}
              onClick={createDefinition}
              className="rounded bg-violet-600 px-3 py-1.5 text-white text-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create this field now'}
            </button>
          </div>
        )}

        {status?.kind === 'exists' && (
          <div data-testid="mf-guide-exists" className="text-emerald-700">
            ✓ Definition exists — the field is editable in the admin.
          </div>
        )}
        {status?.kind === 'exists-undeclared' && (
          <div className="text-muted-foreground">
            This field isn’t declared by the active theme — it’s managed
            directly in the admin.
          </div>
        )}

        <div className="rounded border border-border p-3 space-y-2">
          <div className="font-medium">How to edit the value</div>
          <div className="text-muted-foreground">
            Values are edited per {ownerType.replace('_', ' ')} in{' '}
            {surface?.label ?? 'the admin'} (Custom fields section)
            {ownerUuid && ownerType !== 'shop'
              ? ' — the link below opens the entity currently shown in the preview.'
              : '.'}
          </div>
          {editUrl && (
            <a
              className="inline-block rounded border border-violet-600 text-violet-700 px-3 py-1.5 text-sm hover:bg-violet-50"
              href={editUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="mf-guide-edit-link"
            >
              Open {surface.label} ↗
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
