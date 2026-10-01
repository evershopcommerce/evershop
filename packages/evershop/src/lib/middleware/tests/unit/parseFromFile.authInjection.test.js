import { sep } from 'path';
import { describe, it, expect } from '@jest/globals';
import { parseFromFile } from '../../parseFromFile.js';
import { sortMiddlewares } from '../../sort.js';

/**
 * Regression test for the pre-authentication authorization bypass.
 *
 * A route-level API handler that declares its own `after` bracket (to order
 * itself against a sibling such as `bodyParser`) used to lose the auto-injected
 * `auth` dependency, letting it run before authentication. `parseFromFile` must
 * now guarantee `auth` is in the `after` list for every route-level middleware
 * except the request parsers that explicitly run before auth.
 */

const apiRoute = (folder, file) =>
  ['', 'modules', 'catalog', 'api', folder, file].join(sep);
const apiGlobal = (file) => ['', 'modules', 'base', 'api', 'global', file].join(sep);
const pageRoute = (scope, folder, file) =>
  ['', 'modules', 'catalog', 'pages', scope, folder, file].join(sep);

const first = (path) => parseFromFile(path)[0];

describe('parseFromFile — auth is non-optional for route-level middleware', () => {
  it('re-injects auth when a handler declares its own `after` (the bypass)', () => {
    const m = first(apiRoute('createVariantGroup', '[bodyParser]saveGroup.js'));
    expect(m.id).toBe('saveGroup');
    expect(m.after).toContain('bodyParser');
    expect(m.after).toContain('auth');
    expect(m.before).toContain('apiResponse');
  });

  it('keeps auth for a handler with no brackets (the default path)', () => {
    const m = first(apiRoute('createVariantGroup', 'saveGroup.js'));
    expect(m.after).toContain('auth');
    expect(m.after).toContain('escapeHtml');
  });

  it('does NOT force auth onto a parser that declares it runs before auth', () => {
    // `[context]bodyParser[auth].js` must stay ordered before auth, otherwise
    // the chain cycles. It never sends a response, so it is not an authz risk.
    const m = first(apiRoute('createVariantGroup', '[context]bodyParser[auth].js'));
    expect(m.before).toContain('auth');
    expect(m.after).toEqual(['context']);
    expect(m.after).not.toContain('auth');
  });

  it('leaves app-level pipeline middleware untouched (no self-dependency)', () => {
    const m = first(apiGlobal('[context]getCurrentUser.js'));
    expect(m.routeId).toBeNull();
    expect(m.after).toEqual(['context']);
    expect(m.after).not.toContain('auth');
  });

  it('re-injects auth for a route-level page handler too', () => {
    const m = first(pageRoute('frontStore', 'someRoute', '[loadThing]handler.js'));
    expect(m.after).toContain('loadThing');
    expect(m.after).toContain('auth');
  });

  it('never adds auth to the auth middleware itself (section-scoped, in all/)', () => {
    // Page auth lives in `pages/<scope>/all/[context]auth.js` → routeId is
    // 'admin'/'frontStore', not null. It must NOT get auth in its own `after`,
    // otherwise Topo throws "Item cannot come after itself: auth".
    const admin = first(pageRoute('admin', 'all', '[context]auth.js'));
    expect(admin.id).toBe('auth');
    expect(admin.routeId).toBe('admin');
    expect(admin.after).toEqual(['context']);

    const front = first(pageRoute('frontStore', 'all', '[context]auth.js'));
    expect(front.id).toBe('auth');
    expect(front.routeId).toBe('frontStore');
    expect(front.after).toEqual(['context']);
  });

  it('orders auth BEFORE the handler and produces no dependency cycle', () => {
    const globals = [
      { id: 'context', scope: 'app', region: 'api', routeId: null },
      { id: 'getCurrentUser', after: ['context'], scope: 'app', region: 'api', routeId: null },
      { id: 'auth', after: ['getCurrentUser'], scope: 'app', region: 'api', routeId: null },
      { id: 'payloadValidate', after: ['auth'], scope: 'app', region: 'api', routeId: null },
      { id: 'escapeHtml', after: ['payloadValidate'], scope: 'app', region: 'api', routeId: null },
      {
        id: 'apiResponse',
        after: ['auth'],
        before: ['apiErrorHandler'],
        scope: 'app',
        region: 'api',
        routeId: null
      },
      { id: 'apiErrorHandler', scope: 'app', region: 'api', routeId: null }
    ];
    const bodyParser = first(
      apiRoute('createVariantGroup', '[context]bodyParser[auth].js')
    );
    const saveGroup = first(apiRoute('createVariantGroup', '[bodyParser]saveGroup.js'));

    let sorted;
    expect(() => {
      sorted = sortMiddlewares([...globals, bodyParser, saveGroup]);
    }).not.toThrow();

    const ids = sorted.map((m) => m.id);
    expect(ids).toContain('auth');
    expect(ids).toContain('saveGroup');
    expect(ids.indexOf('auth')).toBeLessThan(ids.indexOf('saveGroup'));
  });
});

describe('sortMiddlewares — actionable error for an auth-ordering conflict', () => {
  const authChain = [
    { id: 'context', scope: 'app', region: 'api', routeId: null },
    { id: 'getCurrentUser', after: ['context'], scope: 'app', region: 'api', routeId: null },
    { id: 'auth', after: ['getCurrentUser'], before: ['apiResponse'], scope: 'app', region: 'api', routeId: null },
    { id: 'payloadValidate', after: ['auth'], scope: 'app', region: 'api', routeId: null },
    { id: 'escapeHtml', after: ['payloadValidate'], scope: 'app', region: 'api', routeId: null },
    { id: 'apiResponse', after: ['auth'], scope: 'app', region: 'api', routeId: null },
    // Pre-auth parser: runs before auth.
    { id: 'bodyParser', after: ['context'], before: ['auth'], scope: 'createX', region: 'api', routeId: 'createX' }
  ];

  it('explains the conflict and names the middleware and the pre-auth hop', () => {
    // `rawCapture` wants to run before the pre-auth `bodyParser` but did not
    // declare `before: ['auth']`, so the loader forced `auth` into its `after`.
    const rawCapture = {
      id: 'rawCapture',
      before: ['bodyParser'],
      after: ['escapeHtml', 'auth'],
      scope: 'createX',
      region: 'api',
      routeId: 'createX'
    };

    expect(() => sortMiddlewares([...authChain, rawCapture])).toThrow(
      /Middleware "rawCapture" is ordered before "bodyParser".*before: \['auth'\]/s
    );
    // And it must NOT fall back to Topo's opaque message.
    expect(() => sortMiddlewares([...authChain, rawCapture])).not.toThrow(
      /created a dependencies error/
    );
  });

  it('rethrows the original error when the cycle is unrelated to auth', () => {
    // A plain 2-node cycle with no auth involvement.
    const a = { id: 'a', after: ['b'], scope: 'frontStore', region: 'pages', routeId: 'r' };
    const b = { id: 'b', after: ['a'], scope: 'frontStore', region: 'pages', routeId: 'r' };
    expect(() => sortMiddlewares([a, b])).toThrow(/created a dependencies error/);
  });
});
