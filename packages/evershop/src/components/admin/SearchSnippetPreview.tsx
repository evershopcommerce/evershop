import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface SearchSnippetPreviewProps {
  /** URL slug (the url_key). */
  urlKey?: string;
  /** Meta title. Falls back to `name`, then a placeholder. */
  metaTitle?: string;
  /** Meta description. */
  metaDescription?: string;
  /** Path prefix before the slug, e.g. "/blog/" or "/blog/category/". */
  pathPrefix?: string;
  /** Entity name, used to derive the slug/title when those are blank. */
  name?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A Google-style search-result (SERP) snippet preview for SEO editing. Shows the
 * breadcrumb URL, title and description as a search engine would render them.
 * The title links to the live page in a new tab.
 */
export function SearchSnippetPreview({
  urlKey,
  metaTitle,
  metaDescription,
  pathPrefix = '/',
  name
}: SearchSnippetPreviewProps) {
  // Resolve the origin on the client so the link points at this store and the
  // breadcrumb shows the real domain (SSR-safe: empty until mounted).
  const [origin, setOrigin] = React.useState('');
  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const slug = (urlKey || '').trim() || slugify(name || '');
  const path = `${pathPrefix}${slug}`;
  const href = `${origin}${path}`;
  const host = origin ? origin.replace(/^https?:\/\//, '') : '';

  const title =
    (metaTitle || '').trim() || (name || '').trim() || _('Untitled page');
  const description = (metaDescription || '').trim();
  const crumbs = path.split('/').filter(Boolean);

  return (
    <div className="search-snippet-preview rounded-md border border-border bg-card p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
        {_('Search result preview')}
      </div>

      {/* Breadcrumb URL line */}
      <div className="flex items-center gap-1 text-xs text-gray-600 truncate">
        <span className="font-medium text-gray-700">{host || '…'}</span>
        {crumbs.map((segment, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            <span className="text-gray-400">›</span>
            <span className="truncate">{segment}</span>
          </span>
        ))}
      </div>

      {/* Clickable title (opens the live page in a new tab) */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={_('Open page in a new tab')}
        className="mt-0.5 block truncate text-lg leading-tight text-[#1a0dab] visited:text-[#681da8] hover:underline"
      >
        {title}
      </a>

      {/* Description (Google clamps to ~2 lines) */}
      <p className="mt-1 text-xs italic leading-snug text-[#4d5156] line-clamp-2">
        {description ||
          _('Add a meta description to control the text shown here.')}
      </p>
    </div>
  );
}
