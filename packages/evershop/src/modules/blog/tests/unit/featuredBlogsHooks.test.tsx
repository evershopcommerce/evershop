import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from '@jest/globals';
import { AppProvider } from '../../../../components/common/context/app.js';
import FeaturedBlogs from '../../components/frontStore/FeaturedBlogs.js';

/**
 * Every widget with a heading, an eyebrow or a sub-text carries the shared
 * `evershop-widget__heading|eyebrow|subtext` hooks, so a theme restyles every
 * widget's headline in one rule. This one carried none (theme-lab FINDINGS #59),
 * and a theme could reach it only by structure.
 */
const posts = [1, 2].map((n) => ({
  uuid: `p-${n}`,
  name: `Post ${n}`,
  url: `/blog/post-${n}`,
  shortDescription: `Summary ${n}`,
  thumbnail: null,
  publishedAt: '2026-09-01T00:00:00.000Z',
  readingTime: n,
  author: { fullName: 'Ada' }
}));
const state = { config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<
  typeof AppProvider
>['value'];
const render = (widget: Record<string, unknown>) =>
  renderToStaticMarkup(
    <AppProvider value={state}>
      <FeaturedBlogs featuredBlogsWidget={widget as React.ComponentProps<typeof FeaturedBlogs>['featuredBlogsWidget']} />
    </AppProvider>
  );
const classesOf = (html: string, tag: string, marker: string) => {
  const m = new RegExp(`<${tag} class="([^"]*\\b${marker}\\b[^"]*)"`).exec(html);
  return m ? m[1].split(/\s+/) : null;
};

describe('FeaturedBlogs shared hooks', () => {
  const html = render({ eyebrow: 'JOURNAL', heading: 'From the journal', subText: 'Notes on craft.', columns: 3, posts });

  it('marks the heading with the shared hook and its own', () => {
    const h = classesOf(html, 'h2', 'evershop-widget__heading');
    expect(h).toContain('evershop-featured-blogs__heading');
  });

  it('marks the eyebrow with the shared hook and its own', () => {
    const e = classesOf(html, 'p', 'evershop-widget__eyebrow');
    expect(e).toContain('evershop-featured-blogs__eyebrow');
  });

  it('marks the sub-text with the shared hook and its own', () => {
    const s = classesOf(html, 'p', 'evershop-widget__subtext');
    expect(s).toContain('evershop-featured-blogs__subtext');
  });

  it('keeps the root class existing themes target, and adds the widget one', () => {
    const root = /<div class="([^"]*\bfeatured-blogs\b[^"]*)"/.exec(html);
    expect(root).not.toBeNull();
    expect(root![1].split(/\s+/)).toContain('evershop-featured-blogs');
  });

  it('names the grid, so the cards can be reached without a descendant selector', () => {
    expect(classesOf(html, 'div', 'evershop-featured-blogs__grid')).toContain('grid');
  });

  it('draws no heading, eyebrow or sub-text that was not set', () => {
    const bare = render({ columns: 3, posts });
    expect(bare).not.toContain('evershop-widget__heading');
    expect(bare).not.toContain('evershop-widget__eyebrow');
    expect(bare).not.toContain('evershop-widget__subtext');
  });
});
