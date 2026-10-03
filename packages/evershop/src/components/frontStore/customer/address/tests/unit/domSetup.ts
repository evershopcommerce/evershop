/**
 * A minimal browser for the interactive address-form tests. Jest runs in the
 * node environment here (`testEnvironment: "node"`), so the DOM comes from
 * jsdom installed as globals BEFORE react-dom is evaluated — import this file
 * first and load React through dynamic imports afterwards. Only what the
 * shared form fields touch is polyfilled.
 */
// jsdom is CommonJS over an ESM-only dependency (`@exodus/bytes`); Jest's
// module loader cannot `require()` ESM, Node's can (Node ≥ 22.12). Jest also
// shims `node:module` (its `createRequire` returns Jest's require), so the
// real builtin is taken from `process.getBuiltinModule` (Node ≥ 22.3) and
// jsdom loads outside Jest's registry. It is installed as a dependency of the
// `extensions/agent-platform` workspace (isomorphic-dompurify).
type NodeModule = { createRequire(from: string): NodeJS.Require };
const getBuiltin = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
if (typeof getBuiltin !== 'function') {
  throw new Error('domSetup needs Node ≥ 22.3 (process.getBuiltinModule) to load jsdom outside Jest');
}
const nodeRequire = (getBuiltin('node:module') as NodeModule).createRequire(import.meta.url);
const { JSDOM } = nodeRequire('jsdom') as typeof import('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true
});
const { window } = dom;
const g = globalThis as Record<string, unknown>;
g.window = window;
g.document = window.document;
g.navigator = window.navigator;
for (const key of [
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLTextAreaElement',
  'HTMLButtonElement',
  'Element',
  'Node',
  'Text',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
  'InputEvent',
  'getComputedStyle',
  'DOMRect',
  'MutationObserver'
]) {
  if (!(key in g)) {
    g[key] = (window as unknown as Record<string, unknown>)[key];
  }
}
if (!('matchMedia' in window)) {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    }
  });
}
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
g.ResizeObserver = g.ResizeObserver ?? Observer;
g.IntersectionObserver = g.IntersectionObserver ?? Observer;
(window as unknown as Record<string, unknown>).ResizeObserver = g.ResizeObserver;
(window as unknown as Record<string, unknown>).IntersectionObserver = g.IntersectionObserver;
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
g.requestAnimationFrame = g.requestAnimationFrame ?? ((cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 0));
g.cancelAnimationFrame = g.cancelAnimationFrame ?? ((id: number) => clearTimeout(id));
g.IS_REACT_ACT_ENVIRONMENT = true;

export const appState = {
  config: { pageMeta: { route: { id: 'checkout' } } },
  widgets: [],
  propsMap: {}
};
