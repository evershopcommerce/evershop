import { renderUrlset } from '../../render/renderUrlset.js';
import { SitemapUrlRecord } from '../../types.js';

describe('renderUrlset', () => {
  it('renders <loc> from record.loc and a valid XML prolog', () => {
    const xml = renderUrlset([{ loc: 'https://shop.com/shoes' }]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<loc>https://shop.com/shoes</loc>');
  });

  it('omits optional tags when absent', () => {
    const xml = renderUrlset([{ loc: 'https://shop.com/a' }]);
    expect(xml).not.toContain('<lastmod>');
    expect(xml).not.toContain('<changefreq>');
    expect(xml).not.toContain('<priority>');
  });

  it('renders optional tags when present', () => {
    const record: SitemapUrlRecord = {
      loc: 'https://shop.com/a',
      lastmod: '2026-01-01T00:00:00.000Z',
      changefreq: 'daily',
      priority: 0.7
    };
    const xml = renderUrlset([record]);
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>0.7</priority>');
  });

  it('declares xmlns:xhtml and renders <xhtml:link> only when a record has alternates', () => {
    const without = renderUrlset([{ loc: 'https://shop.com/a' }]);
    expect(without).not.toContain('xmlns:xhtml');
    expect(without).not.toContain('<xhtml:link');

    const withAlt = renderUrlset([
      {
        loc: 'https://shop.com/a',
        alternates: [{ hreflang: 'en', href: 'https://shop.com/a' }]
      }
    ]);
    expect(withAlt).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(withAlt).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://shop.com/a"/>'
    );
  });

  it('entity-escapes the loc', () => {
    const xml = renderUrlset([{ loc: 'https://shop.com/a?x=1&y=2' }]);
    expect(xml).toContain('<loc>https://shop.com/a?x=1&amp;y=2</loc>');
  });

  it('renders an empty namespace-free urlset for no records', () => {
    const xml = renderUrlset([]);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml).toContain('</urlset>');
    expect(xml).not.toContain('<url>');
    expect(xml).not.toContain('xmlns:xhtml');
  });

  it('clamps priority to one decimal within [0,1]', () => {
    expect(renderUrlset([{ loc: 'x', priority: 1 }])).toContain(
      '<priority>1.0</priority>'
    );
    expect(renderUrlset([{ loc: 'x', priority: 5 }])).toContain(
      '<priority>1.0</priority>'
    );
    expect(renderUrlset([{ loc: 'x', priority: -1 }])).toContain(
      '<priority>0.0</priority>'
    );
  });
});
