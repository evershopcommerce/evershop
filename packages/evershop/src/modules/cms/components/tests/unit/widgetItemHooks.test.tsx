import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The names of the items inside a widget (a bento tile's heading, a tiered group's name, a mosaic tile's label,
 * one of a trust strip's promises) carry the shared `evershop-widget__item-heading` hook (theme-lab FINDINGS #37).
 *
 * They are NOT the widget's headline, so they must not carry `evershop-widget__heading`: themes give that hook
 * section-headline typography (riso: weight 800 and up to 48px; sweet-haven: up to 44px), and an item name inside a
 * tile would inherit it. Before this hook existed a theme could reach these names only through each widget's own
 * class, so a theme that styled the shared hooks "as it is meant to" left them in core's defaults (a sans at weight
 * 600), and nothing told its author. Cordovan hit it on 2026-10-05, sweet-haven and riso before it.
 *
 * The second half is the contract for the next widget: a heading-like element in a widget component carries one of
 * the two hooks, or is listed in ALLOWED with the reason it is neither.
 */
const { AppProvider } = await import('@components/common/context/app.js');
const { default: BentoGrid } = await import('../../BentoGrid.js');
const { default: TieredCategories } = await import('../../TieredCategories.js');
const { default: CategoryMosaic } = await import('../../CategoryMosaic.js');
const { default: TrustStrip } = await import('../../TrustStrip.js');

const state = { config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<
  typeof AppProvider
>['value'];
const inApp = (el: React.ReactElement) => renderToStaticMarkup(<AppProvider value={state}>{el}</AppProvider>);

/** The elements that carry `marker` as a class, with their classes and their text. */
const withClass = (html: string, marker: string) =>
  [...html.matchAll(new RegExp(`<[a-z0-9]+ [^>]*class="([^"]*\\b${marker}\\b[^"]*)"[^>]*>([^<]*)<`, 'g'))].map((m) => ({
    classes: m[1].split(/\s+/),
    text: m[2].trim()
  }));

const bentoTile = (n: number, size: 'lg' | 'sm') => ({
  id: `t${n}`,
  size,
  image: null,
  imageAlt: '',
  backgroundColor: '#eeeeee',
  eyebrow: n === 1 ? 'NEW' : null,
  heading: `Tile ${n}`,
  body: n === 1 ? 'A body line' : null,
  link: { label: 'Shop', url: `/c${n}`, newTab: false },
  textColor: 'dark' as const
});
const tieredGroup = (label: string) => ({
  id: label,
  image: '',
  imageAlt: '',
  parent: { label, url: `/${label.toLowerCase()}` },
  subs: [{ id: `${label}-s`, label: 'Shop all', url: `/${label.toLowerCase()}/all` }]
});
const mosaicTile = (label: string) => ({ id: label, image: '/a.jpg', imageAlt: label, imageWidth: 800, imageHeight: 1000, label, link: `/${label.toLowerCase()}`, newTab: false });
const mosaic = (labelPosition: 'below' | 'overlay') => ({
  heading: 'Shop by category',
  tiles: [mosaicTile('Shoes'), mosaicTile('Bags')],
  columns: 2,
  aspect: 'portrait' as const,
  layout: 'uniform' as const,
  labelPosition
});
const promise = (title: string) => ({ id: title, icon: null, title, description: `About ${title}`, link: null });

const cases = [
  {
    widget: 'bento grid',
    html: inApp(<BentoGrid bentoGridWidget={{ tiles: [bentoTile(1, 'lg'), bentoTile(2, 'sm'), bentoTile(3, 'sm')], gap: 'md', minHeight: 360 }} />),
    names: ['Tile 1', 'Tile 2', 'Tile 3'],
    own: 'evershop-bento-grid__heading'
  },
  {
    widget: 'tiered categories',
    html: inApp(
      <TieredCategories tieredCategoriesWidget={{ groups: [tieredGroup('Women'), tieredGroup('Men')], columns: null, imageAspect: 'landscape', showParentLink: true }} />
    ),
    names: ['Women', 'Men'],
    own: 'evershop-tiered-categories__subheading'
  },
  {
    widget: 'category mosaic, label below',
    html: inApp(<CategoryMosaic categoryMosaicWidget={mosaic('below')} />),
    names: ['Shoes', 'Bags'],
    own: null
  },
  {
    widget: 'category mosaic, label over the photograph',
    html: inApp(<CategoryMosaic categoryMosaicWidget={mosaic('overlay')} />),
    names: ['Shoes', 'Bags'],
    own: null
  },
  {
    widget: 'trust strip',
    html: inApp(
      <TrustStrip trustStripWidget={{ items: [promise('Free shipping'), promise('Easy returns')], columns: 2, showIcons: false, iconSize: 'md', alignment: 'left', divider: false }} />
    ),
    names: ['Free shipping', 'Easy returns'],
    own: 'evershop-trust-strip__heading'
  }
];

describe('item names carry the item hook', () => {
  for (const c of cases) {
    it(`${c.widget}: every item name has it, in order`, () => {
      expect(withClass(c.html, 'evershop-widget__item-heading').map((f) => f.text)).toEqual(c.names);
    });

    it(`${c.widget}: ...and keeps the class existing themes target`, () => {
      if (!c.own) return;
      for (const f of withClass(c.html, 'evershop-widget__item-heading')) expect(f.classes).toContain(c.own);
    });

    it(`${c.widget}: an item name is not the widget's headline`, () => {
      for (const f of withClass(c.html, 'evershop-widget__item-heading')) expect(f.classes).not.toContain('evershop-widget__heading');
    });
  }

  it('the mosaic keeps its section heading as the headline, and only that', () => {
    const html = inApp(<CategoryMosaic categoryMosaicWidget={mosaic('below')} />);
    expect(withClass(html, 'evershop-widget__heading').map((f) => f.text)).toEqual(['Shop by category']);
  });
});

/* ---------------------------------------------------------------- the contract */

// Heading-like elements that are NEITHER a widget's headline NOR an item's name, each with the reason.
const ALLOWED = [
  { file: 'FooterMenu.js', token: 'evershop-footer-menu__title', why: 'a column label ("Shop", "Care"), set in small capitals; not a name' },
  { file: 'FaqBlock.js', token: 'evershop-faq-block__subheading', why: 'an <h3> naming a group of questions: reachable as a heading element, and not a tile' },
  { file: 'BrandStory.js', token: 'evershop-brand-story__heading', contains: 'text-foreground/70', why: "the pull-quote variant's small kicker above the quote" }
];

const modulesDir = fileURLToPath(new URL('../../../../', import.meta.url));
/** Widget render components in the compiled tree: they read widget settings, and are not a settings form or a preview. */
const widgetFiles = () =>
  (fs.readdirSync(modulesDir, { recursive: true }) as string[])
    .filter((f) => /(?:^|\/)components\/(?:frontStore\/)?[A-Za-z]+\.js$/.test(f) && !/\/tests\//.test(f) && !/(?:Setting|Preview)\.js$/.test(f))
    .map((f) => path.join(modulesDir, f))
    .filter((f) => fs.readFileSync(f, 'utf8').includes('getWidgetSetting'));

describe('every heading-like element in a widget carries a shared heading hook', () => {
  const NAME = /evershop-[a-z0-9-]+__(?:heading|subheading|title|name)(?![a-z0-9-])/;
  const HOOK = /evershop-widget__(?:item-)?heading/;

  it('finds the widgets (a guard against the scan silently matching nothing)', () => {
    const names = widgetFiles().map((f) => path.basename(f));
    for (const expected of ['BentoGrid.js', 'TieredCategories.js', 'CategoryMosaic.js', 'TrustStrip.js', 'Banner.js', 'FeaturedBlogs.js', 'CollectionProducts.js']) {
      expect(names).toContain(expected);
    }
  });

  it('has no heading-like element without a hook, except the listed ones', () => {
    const missing: string[] = [];
    for (const file of widgetFiles()) {
      const source = fs.readFileSync(file, 'utf8');
      for (const m of source.matchAll(/className:\s*(?:"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g)) {
        const classes = m[1] ?? m[2];
        const token = NAME.exec(classes)?.[0];
        if (!token || HOOK.test(classes)) continue;
        const base = path.basename(file);
        const allowed = ALLOWED.some((a) => a.file === base && a.token === token && (!a.contains || classes.includes(a.contains)));
        if (!allowed) missing.push(`${base}: ${token}`);
      }
    }
    // A failure here means: add evershop-widget__item-heading (the name of an item) or evershop-widget__heading
    // (the widget's own headline) to that element, or list it in ALLOWED above with the reason it is neither.
    expect(missing).toEqual([]);
  });

  it('lists only exceptions that still exist', () => {
    for (const a of ALLOWED) {
      const file = widgetFiles().find((f) => path.basename(f) === a.file);
      expect(file).toBeDefined();
      expect(fs.readFileSync(file as string, 'utf8')).toContain(a.token);
    }
  });
});
