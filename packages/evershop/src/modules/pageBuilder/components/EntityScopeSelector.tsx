import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ChevronDown, FileText, Globe, Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ScopePage {
  uuid: string;
  name: string;
  urlKey: string;
  urn: string;
  /** Published flag; `false` renders a "Draft" badge. Null/undefined = no badge. */
  status?: boolean | null;
}

interface EntityScopeSelectorProps {
  pages: ScopePage[];
  /** The active scope URN (`urn:evershop:cms:page:<uuid>`), or null for All. */
  currentEntityUrn: string | null;
  /** Label for the route-level ("all entities") option, e.g. "All CMS pages". */
  allLabel: string;
  /** Builds the editor URL for a given entity uuid (or null for the All scope). */
  scopeHref: (entityUuid: string | null) => string;
  loading?: boolean;
}

/**
 * Topbar dropdown that scopes the page-builder to a single entity (e.g. one
 * CMS page) vs. the whole route ("All CMS pages"). Sits beside the route
 * `PageSwitcher`: the route switcher changes *which route* is edited, this
 * changes *which entity within the route* placements are scoped to.
 *
 * Selection is plain `<a href>` navigation (like PageSwitcher) — the draft is
 * global (spec § 5.7), so switching scope preserves all pending work. Owns its
 * own open/search state + outside-click dismissal; the parent only supplies data.
 */
export function EntityScopeSelector({
  pages,
  currentEntityUrn,
  allLabel,
  scopeHref,
  loading = false
}: EntityScopeSelectorProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const node = wrapperRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const currentPage = useMemo(
    () =>
      currentEntityUrn
        ? pages.find((p) => p.urn === currentEntityUrn) ?? null
        : null,
    [pages, currentEntityUrn]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.urlKey ?? '').toLowerCase().includes(q)
    );
  }, [pages, search]);

  // The label reflects the active scope: All, the matched page, or — when the
  // URN doesn't match any listed page (e.g. a draft page not in the published
  // list) — a neutral fallback so the control never renders blank.
  const activeLabel = currentEntityUrn
    ? currentPage?.name ?? _('This page')
    : allLabel;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setSearch('');
        }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
          open ? 'bg-muted/40' : 'hover:bg-muted/40'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={_('Change edit scope')}
      >
        {currentEntityUrn ? (
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {_('Editing')}
        </span>
        <span className="text-xs font-medium text-foreground max-w-[180px] truncate">
          {activeLabel}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-30 w-[420px] max-h-[60vh] bg-card border border-divider rounded-md shadow-lg flex flex-col overflow-hidden"
          role="listbox"
        >
          <div className="p-2 border-b border-divider">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={_('Search pages…')}
                className="w-full text-sm pl-7 pr-2 py-1 rounded-md bg-muted/30 border border-divider focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label={_('Search pages')}
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {/* Route-level ("all entities") option — always visible, ignores search. */}
            <ul className="p-2 pb-0 space-y-1 text-xs">
              <li>
                <a
                  href={scopeHref(null)}
                  onClick={(e) => {
                    if (!currentEntityUrn) {
                      e.preventDefault();
                      setOpen(false);
                      return;
                    }
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                    !currentEntityUrn
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/40'
                  }`}
                  role="option"
                  aria-selected={!currentEntityUrn}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{allLabel}</span>
                  {!currentEntityUrn && (
                    <span className="ml-auto shrink-0 text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      {_('Current')}
                    </span>
                  )}
                </a>
              </li>
            </ul>
            <div className="px-3 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              {_('Pages')}
            </div>
            <ul className="p-2 space-y-1 text-xs">
              {loading && (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  {_('Loading pages…')}
                </li>
              )}
              {!loading &&
                filtered.map((p) => {
                  const isCurrent = p.urn === currentEntityUrn;
                  return (
                    <li key={p.uuid}>
                      <a
                        href={scopeHref(p.uuid)}
                        onClick={(e) => {
                          if (isCurrent) {
                            e.preventDefault();
                            setOpen(false);
                            return;
                          }
                          setOpen(false);
                        }}
                        className={`block px-2 py-1.5 rounded-md text-xs transition-colors ${
                          isCurrent
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted/40'
                        }`}
                        role="option"
                        aria-selected={isCurrent}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-medium">
                              {p.name}
                            </span>
                            {p.status === false && (
                              <span className="shrink-0 text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                                {_('Draft')}
                              </span>
                            )}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                              {_('Current')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate font-mono">
                          /{p.urlKey}
                        </div>
                      </a>
                    </li>
                  );
                })}
              {!loading && filtered.length === 0 && (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  {_('No pages found.')}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
