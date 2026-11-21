import { describe, expect, it } from '@jest/globals';
import vm from 'node:vm';

/**
 * The GA4 head script (googleAnalyticsHead.ts), which the `head` area
 * component GoogleAnalyticsHead.tsx renders:
 * - nothing at all without a valid Measurement ID (empty, a Universal
 *   Analytics id, anything that could break out of the script);
 * - the commands in the order Google's Consent Mode needs: the consent
 *   default (only when the store waits for cookie consent, and no cookie
 *   banner before it set one), `js`, `config`, then the gtag.js loader;
 * - the id in upper case (Google collects nothing for a lower-case one).
 */
const { googleAnalyticsHeadScript, isGa4MeasurementId, toGaConsentDefault } = await import(
  '../../googleAnalyticsHead.js'
);

/**
 * Runs the head script in a bare page: what it pushes to dataLayer, and the
 * script it adds. `before` is what scripts before it pushed (a cookie banner).
 */
function run(script: string, before: unknown[] = []) {
  const added: Array<{ src?: string; async?: boolean }> = [];
  const page = vm.createContext({
    document: {
      createElement: () => ({}),
      head: { appendChild: (s: { src?: string; async?: boolean }) => added.push(s) }
    }
  });
  page.window = page;
  page.dataLayer = [...before];
  vm.runInContext(script, page);
  const commands = (page.dataLayer as IArguments[]).map((args) => Array.from(args));
  return { commands, added, gtag: page.gtag, page };
}

/** A command as 'consent default', 'js', 'config G-…' */
const label = (command: unknown[]) =>
  command[0] === 'js' ? 'js' : command.slice(0, 2).join(' ');

/** What a cookie banner's gtag() pushes: an arguments object */
function gtagArgs(...args: unknown[]): IArguments {
  return function collect() {
    // eslint-disable-next-line prefer-rest-params
    return arguments;
  }.apply(null, args);
}

describe('the GA4 head script', () => {
  it('nothing without a valid Measurement ID', () => {
    for (const id of ['', null, undefined, 'UA-12345-1', 'G-', "G-1');alert(1)//", 'G-ABC DEF', 42]) {
      expect(googleAnalyticsHeadScript(id, 'granted')).toBe('');
      expect(googleAnalyticsHeadScript(id, 'denied')).toBe('');
    }
    expect(isGa4MeasurementId('G-ABC123XYZ')).toBe(true);
    expect(isGa4MeasurementId('g-abc123')).toBe(true);
  });

  it('consent not required: js, config, then the loader; no consent command', () => {
    const { commands, added, gtag } = run(googleAnalyticsHeadScript('G-TEST123', 'granted'));
    expect(commands.map((c) => c[0])).toEqual(['js', 'config']);
    expect(commands[1]).toEqual(['config', 'G-TEST123']);
    expect(added).toEqual([{ async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123' }]);
    expect(typeof gtag).toBe('function');
  });

  it('consent required: the default (all denied, 500 ms for the banner) before js and config', () => {
    const { commands } = run(googleAnalyticsHeadScript('G-TEST123', 'denied'));
    expect(commands.map((c) => c[0])).toEqual(['consent', 'js', 'config']);
    expect(commands[0]).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500
      }
    ]);
  });

  it("consent required, but a cookie banner before it set its own default: the banner's is kept", () => {
    const banner = gtagArgs('consent', 'default', { analytics_storage: 'granted', region: ['US'] });
    const { commands } = run(googleAnalyticsHeadScript('G-TEST123', 'denied'), [banner]);
    expect(commands.map(label)).toEqual(['consent default', 'js', 'config G-TEST123']);
    expect(commands[0][2]).toEqual({ analytics_storage: 'granted', region: ['US'] });
  });

  it("consent required: a banner's update, or an array gtag.js ignores, is no default: the core one is added", () => {
    const cases: Array<[unknown, string]> = [
      [gtagArgs('consent', 'update', { analytics_storage: 'granted' }), 'consent update'],
      [['consent', 'default', { analytics_storage: 'granted' }], 'consent default']
    ];
    for (const [before, first] of cases) {
      const { commands } = run(googleAnalyticsHeadScript('G-TEST123', 'denied'), [before]);
      expect(commands.map(label)).toEqual([first, 'consent default', 'js', 'config G-TEST123']);
      expect(commands[1][2]).toMatchObject({ analytics_storage: 'denied', wait_for_update: 500 });
    }
  });

  it('a lower-case Measurement ID is configured and loaded in upper case', () => {
    const { commands, added } = run(googleAnalyticsHeadScript('g-test123', 'granted'));
    expect(commands[1]).toEqual(['config', 'G-TEST123']);
    expect(added[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST123');
  });

  it('a theme copy of the old GoogleAnalytics component sees GA loaded (it compares the setting as stored)', () => {
    expect(run(googleAnalyticsHeadScript('G-TEST123', 'granted')).page.__evershopGaLoaded).toBe('G-TEST123');
    expect(run(googleAnalyticsHeadScript('g-test123', 'denied')).page.__evershopGaLoaded).toBe('g-test123');
  });

  it('a dataLayer that a script before it made is kept', () => {
    const page = vm.createContext({ document: { createElement: () => ({}), head: { appendChild: () => 0 } } });
    page.window = page;
    page.dataLayer = [['earlier']];
    vm.runInContext(googleAnalyticsHeadScript('G-TEST123', 'granted'), page);
    expect((page.dataLayer as unknown[])[0]).toEqual(['earlier']);
    expect(page.dataLayer).toHaveLength(3);
  });

  it('the setting: "denied" in any case, with spaces around it, is denied; anything else granted', () => {
    for (const value of ['denied', 'DENIED', ' Denied ']) {
      expect(toGaConsentDefault(value)).toBe('denied');
      expect(googleAnalyticsHeadScript('G-TEST123', value)).toContain("gtag('consent','default'");
    }
    for (const value of ['granted', '', null, undefined, 'no', 'de nied', 1]) {
      expect(toGaConsentDefault(value)).toBe('granted');
    }
  });
});
