import {
  getSitemapCollectors,
  registerSitemapCollector
} from '../../registry.js';
import { SitemapCollector } from '../../types.js';

const stub = (name: string): SitemapCollector => ({
  name,
  async collect() {
    return [];
  }
});

describe('sitemap collector registry', () => {
  // The registry caches a value on first read and only clears it at the bootstrap lock, so all
  // registration must precede the first `getSitemapCollectors()` — which is exactly the real
  // order (register in bootstrap, read at request/cron time). We register first, then read once.
  it('returns the collectors registered before the first read', () => {
    registerSitemapCollector(stub('alpha'));
    registerSitemapCollector(stub('beta'));
    const names = getSitemapCollectors().map((collector) => collector.name);
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    expect(names).toHaveLength(2);
  });
});
