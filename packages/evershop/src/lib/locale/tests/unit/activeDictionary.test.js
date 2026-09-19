import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, afterEach } from '@jest/globals';
import {
  setSSRContext,
  getActiveDictionary,
  getLocaleContextIso
} from '../../activeDictionary.js';

afterEach(() => {
  // Reset per-render state and any simulated browser global between tests.
  setSSRContext({ locale: '', defaultLocale: '', isAdmin: false }, {});
  delete globalThis.window;
});

describe('activeDictionary — server (per-render) path', () => {
  it('returns the context + dict set by setSSRContext', () => {
    setSSRContext(
      { locale: 'fr', defaultLocale: 'en', isAdmin: false },
      { Home: 'Accueil' }
    );
    expect(getActiveDictionary()).toEqual({ Home: 'Accueil' });
    expect(getLocaleContextIso()).toEqual({
      locale: 'fr',
      defaultLocale: 'en',
      isAdmin: false
    });
  });

  it('returns empties after a reset', () => {
    setSSRContext({ locale: '', defaultLocale: '', isAdmin: false }, {});
    expect(getActiveDictionary()).toEqual({});
    expect(getLocaleContextIso()).toEqual({
      locale: '',
      defaultLocale: '',
      isAdmin: false
    });
  });
});

describe('activeDictionary — client path (window.eContext)', () => {
  it('reads locale + translations from window.eContext', () => {
    globalThis.window = {
      eContext: {
        locale: 'de',
        defaultLocale: 'en',
        translations: { Home: 'Zuhause' },
        config: { pageMeta: { route: { isAdmin: true } } }
      }
    };
    expect(getActiveDictionary()).toEqual({ Home: 'Zuhause' });
    expect(getLocaleContextIso()).toEqual({
      locale: 'de',
      defaultLocale: 'en',
      isAdmin: true
    });
  });
});

describe('activeDictionary — bundling guard', () => {
  it('does not reference node:async_hooks (must stay client-safe)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const compiled = fs.readFileSync(
      path.join(here, '../../activeDictionary.js'),
      'utf8'
    );
    expect(compiled).not.toMatch(/async_hooks/);
  });
});
