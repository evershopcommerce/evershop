import { renderIndex } from '../../render/renderIndex.js';

describe('renderIndex', () => {
  it('renders a child <loc> as baseUrl + /sitemap-<name>.xml', () => {
    const xml = renderIndex(
      [{ name: 'products', lastmod: '2026-01-01T00:00:00.000Z' }],
      'https://shop.com'
    );
    expect(xml).toContain(
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml).toContain('<loc>https://shop.com/sitemap-products.xml</loc>');
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
  });

  it('renders multiple children', () => {
    const xml = renderIndex(
      [{ name: 'products' }, { name: 'categories' }],
      'https://shop.com'
    );
    expect(xml).toContain('https://shop.com/sitemap-products.xml');
    expect(xml).toContain('https://shop.com/sitemap-categories.xml');
    expect((xml.match(/<sitemap>/g) || []).length).toBe(2);
  });

  it('omits <lastmod> when absent', () => {
    const xml = renderIndex([{ name: 'static' }], 'https://shop.com');
    expect(xml).not.toContain('<lastmod>');
  });

  it('renders an empty index for no children', () => {
    const xml = renderIndex([], 'https://shop.com');
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('</sitemapindex>');
    expect(xml).not.toContain('<sitemap>');
  });
});
