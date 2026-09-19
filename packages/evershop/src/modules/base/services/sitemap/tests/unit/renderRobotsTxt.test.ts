import { renderRobotsTxt } from '../../render/renderRobotsTxt.js';

describe('renderRobotsTxt', () => {
  it('renders the default body with an absolute Sitemap line', () => {
    const txt = renderRobotsTxt({
      sitemapUrl: 'https://shop.com/sitemap.xml',
      disallow: ['/admin/', '/checkout']
    });
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Disallow: /admin/');
    expect(txt).toContain('Disallow: /checkout');
    expect(txt).toContain('Sitemap: https://shop.com/sitemap.xml');
  });

  it('emits a bare "Disallow:" (allow all) when the disallow list is empty', () => {
    const txt = renderRobotsTxt({
      sitemapUrl: 'https://shop.com/sitemap.xml',
      disallow: []
    });
    expect(txt.split('\n')).toContain('Disallow:');
  });

  it('omits the Sitemap line when includeSitemap is false', () => {
    const txt = renderRobotsTxt({
      sitemapUrl: 'https://shop.com/sitemap.xml',
      disallow: ['/admin/'],
      includeSitemap: false
    });
    expect(txt).not.toContain('Sitemap:');
    expect(txt).toContain('Disallow: /admin/');
  });
});
