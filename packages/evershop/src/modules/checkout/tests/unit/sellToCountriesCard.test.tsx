import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SellToCountriesCard, strandedSummary, strandedZones } from '../../pages/admin/shippingSetting/shippingSetting/SellToCountries.js';

/**
 * The sell-to card above the shipping zones (Settings → Shipping): posts the
 * single `addressSellToCountries` row, and names the zones a narrower list
 * strands before the merchant saves.
 */
const zones = [
  { uuid: 'z-asia', name: 'Asia', countries: [{ code: 'CN', name: 'China' }, { code: 'VN', name: 'Vietnam' }] },
  { uuid: 'z-us', name: 'United States', countries: [{ code: 'US', name: 'United States' }] }
];
const countries = [{ code: 'US', name: 'United States' }, { code: 'VN', name: 'Vietnam' }, { code: 'CN', name: 'China' }];
const render = (sellTo: 'all' | string[]) =>
  renderToStaticMarkup(<SellToCountriesCard zones={zones} countries={countries} sellTo={sellTo} saveSettingApi="/api/settings" />);

describe('SellToCountriesCard', () => {
  it('computes the zones a narrower list strands', () => {
    expect(strandedSummary(strandedZones(zones, ['US']))).toBe('China, Vietnam (Asia)');
    expect(strandedSummary(strandedZones(zones, ['US', 'CN']))).toBe('Vietnam (Asia)');
    expect(strandedZones(zones, 'all')).toEqual([]);
    expect(strandedZones(zones, ['us', 'cn', 'vn'])).toEqual([]);
  });

  it('renders the switch for "all" with no stranded warning', () => {
    const html = render('all');
    // the visible switch button is named by the visible label (base-ui puts the
    // `id` on its hidden checkbox, so `htmlFor` alone leaves the button unnamed)
    expect(html).toContain('aria-labelledby="addressSellToAll-label"');
    expect(html).toContain('id="addressSellToAll-label"');
    expect(html).toContain('All countries');
    expect(html).toContain('id="sellToCountries"');
    expect(html).not.toContain('These zones will stop serving');
    expect(html).toContain('Save Settings');
  });

  it('shows the multi-select and the stranded zones for a list', () => {
    const html = render(['US']);
    expect(html).toContain('react-select');
    expect(html).toContain('These zones will stop serving: China, Vietnam (Asia)');
  });
});
