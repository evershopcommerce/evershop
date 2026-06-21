import { Editable } from '@components/common/page-builder/index.js';
import React from 'react';

/**
 * Footer menu — a row of titled columns, each holding a flat (1-level) list
 * of navigation links. The "shop / learn / care" block at the top of most
 * storefront footers.
 *
 * Colors are inherited (`currentColor` + opacity) rather than hard-coded so
 * the block reads correctly on both the default light footer and a dark
 * custom footer. The number of columns is simply the number of configured
 * column entries; on desktop they spread evenly, on mobile they fall back
 * to two columns.
 */

export interface FooterMenuLink {
  id: string;
  label: string;
  /** Resolved at request time: URN → current URL, or null when missing. */
  url: string | null;
  /** Open in a new browser tab. New-tab links always get rel="noopener noreferrer". */
  newTab?: boolean;
  /** SEO: add rel="nofollow" — don't pass ranking credit to this link. */
  nofollow?: boolean;
  /** Privacy: add rel="noreferrer". New-tab links already include it. */
  noReferrer?: boolean;
}

export interface FooterMenuColumn {
  id: string;
  title: string;
  links: FooterMenuLink[];
}

export interface FooterMenuProps {
  footerMenuWidget: {
    columns: FooterMenuColumn[];
  };
}

const LINK_CLASS =
  'evershop-footer-menu__link text-sm opacity-80 transition-opacity hover:opacity-100 hover:underline';

/**
 * `rel` for a **same-tab** link. Its target is not `_blank`, so it's
 * unconstrained by `react/jsx-no-target-blank` and can be computed here.
 * New-tab links are rendered in a separate branch with a literal
 * `target="_blank"` + literal `rel` so the rule can verify them statically.
 */
function sameTabRel(link: FooterMenuLink): string | undefined {
  const tokens = [
    link.noReferrer ? 'noreferrer' : null,
    link.nofollow ? 'nofollow' : null
  ].filter(Boolean);
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

export default function FooterMenu({ footerMenuWidget }: FooterMenuProps) {
  const { columns = [] } = footerMenuWidget ?? {};

  // Keep a column only if it carries a title or at least one usable link.
  // Track each column's index in the original settings array so an inline
  // title edit writes back to `settings.columns.${originalIndex}.title` even
  // after empty columns are filtered out of the render.
  const visible = columns
    .map((col, originalIndex) => ({ col, originalIndex }))
    .filter(
      ({ col: c }) =>
        c &&
        ((typeof c.title === 'string' && c.title.trim().length > 0) ||
          (Array.isArray(c.links) &&
            c.links.some((l) => l && l.label && l.url)))
    );
  if (visible.length === 0) return null;

  const cols = Math.min(Math.max(visible.length, 1), 6);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media (min-width: 768px) { .evershop-footer-menu-grid { grid-template-columns: repeat(var(--evershop-footer-cols, 3), minmax(0, 1fr)); } }`
        }}
      />
      <div
        className="evershop-footer-menu evershop-footer-menu-grid grid grid-cols-2 gap-x-8 gap-y-10 py-8"
        // Custom property drives the desktop `repeat(N, …)`; the media query
        // above only applies it at ≥768px so mobile stays at two columns.
        style={
          { ['--evershop-footer-cols' as string]: cols } as React.CSSProperties
        }
      >
        {visible.map(({ col, originalIndex }) => {
          const links = (col.links ?? []).filter(
            (l) => l && l.label && l.url
          );
          const hasTitle =
            typeof col.title === 'string' && col.title.trim().length > 0;
          return (
            <div
              key={col.id}
              className="evershop-footer-menu__column space-y-3"
            >
              {hasTitle && (
                <Editable
                  as="div"
                  fieldPath={`settings.columns.${originalIndex}.title`}
                  className="evershop-footer-menu__title text-xs font-semibold uppercase tracking-wider opacity-60"
                >
                  {col.title}
                </Editable>
              )}
              {links.length > 0 && (
                <ul className="evershop-footer-menu__links space-y-2.5">
                  {links.map((link) => (
                    <li key={link.id} className="evershop-footer-menu__item">
                      {link.newTab ? (
                        <a
                          href={link.url as string}
                          target="_blank"
                          rel={
                            link.nofollow
                              ? 'noopener noreferrer nofollow'
                              : 'noopener noreferrer'
                          }
                          className={LINK_CLASS}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <a
                          href={link.url as string}
                          rel={sameTabRel(link)}
                          className={LINK_CLASS}
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export const query = `
  query Query($columns: JSON) {
    footerMenuWidget(columns: $columns) {
      columns
    }
  }
`;

export const variables = `{
  columns: getWidgetSetting("columns", [])
}`;
