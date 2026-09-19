import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ChevronDown, FileText, Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface PageRoute {
  id: string;
  name: string;
  path: string;
}

interface PageSwitcherProps {
  pageRoutes: PageRoute[];
  currentRouteId: string;
  currentRouteName: string;
  routesWithDraftOps: Set<string>;
  editPathForRoute: (routeId: string) => string;
}

/**
 * Topbar dropdown that lists every editable storefront route. Used both as
 * a "switch page" affordance and as a quick visual of which routes have
 * pending draft work (the colored Draft / Live / Current pills).
 *
 * Owns its open/search state and the outside-click dismissal — parent only
 * supplies the data. Switching routes is plain `<a href>` navigation
 * because the user's draft is global (spec § 5.7) — the changeset persists
 * across routes, so there's no unsaved-work prompt to insert.
 */
export function PageSwitcher({
  pageRoutes,
  currentRouteId,
  currentRouteName,
  routesWithDraftOps,
  editPathForRoute
}: PageSwitcherProps): React.ReactElement {
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pageRoutes;
    return pageRoutes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.path ?? '').toLowerCase().includes(q)
    );
  }, [pageRoutes, search]);

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
        aria-label={_('Switch page')}
      >
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          {currentRouteName}
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
            <div className="px-3 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              {_('Pages')}
            </div>
            <ul className="p-2 space-y-1 text-xs">
              {filtered.map((r) => {
                const isCurrent = r.id === currentRouteId;
                const hasDraftOps = routesWithDraftOps.has(r.id);
                const target = editPathForRoute(r.id);
                return (
                  <li key={r.id}>
                    <a
                      href={target}
                      onClick={(e) => {
                        if (isCurrent) {
                          e.preventDefault();
                          setOpen(false);
                          return;
                        }
                        // Otherwise close the dropdown and let the anchor
                        // navigate; the draft is preserved across routes.
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
                        <span className="truncate font-medium">{r.name}</span>
                        {isCurrent ? (
                          <span className="shrink-0 text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                            {_('Current')}
                          </span>
                        ) : hasDraftOps ? (
                          <span className="shrink-0 text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">
                            {_('Draft')}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                            {_('Live')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.path}
                      </div>
                    </a>
                  </li>
                );
              })}
              {pageRoutes.length === 0 && (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  {_('No editable routes.')}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
