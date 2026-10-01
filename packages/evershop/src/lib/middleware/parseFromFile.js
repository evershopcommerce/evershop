import { basename } from 'path';
import { buildMiddlewareFunction } from './buildMiddlewareFunction.js';
import { getRouteFromPath } from './getRouteFromPath.js';

/**
 * Guarantee that a ROUTE-level middleware runs after `auth`.
 *
 * The auto-injected default `after: ['escapeHtml', 'auth']` is only applied
 * when a file declares no `after` of its own. A handler named, for example,
 * `[bodyParser]saveGroup.js` declares `after: ['bodyParser']`, which replaces
 * the default and drops `auth` — so the handler can be ordered before `auth`
 * and execute pre-authentication (authorization bypass). Re-inject `auth` into
 * the `after` list for route-level middleware so it can never be scheduled
 * ahead of authentication.
 *
 * Two exclusions keep this cycle-free and correct:
 *  - The `auth` middleware itself is left alone. Forcing `auth` onto `auth`
 *    would be a self-dependency. The page-side `auth` lives in section `all`
 *    folders (routeId `admin`/`frontStore`, NOT null), so the routeId check
 *    below does not catch it — guard on the id explicitly.
 *  - Other app-level pipeline middleware (`route.routeId === null`:
 *    `getCurrentUser`, `payloadValidate`, `apiResponse`, ...) is left alone; it
 *    is what `auth` depends on, so forcing `auth` after it would cycle.
 *  - A file that explicitly declares it runs BEFORE auth (its `before` lists
 *    `auth`, e.g. `[context]bodyParser[auth].js` or `[context]isAdmin[auth].js`)
 *    is left alone. Those run ahead of auth by design, so forcing them after
 *    auth would create a cycle.
 */
function forceAuthDependency(m, route) {
  if (m.id === 'auth') {
    return;
  }
  if (route.routeId === null) {
    return;
  }
  const declaredBefore = m.before || [];
  if (declaredBefore.includes('auth')) {
    return;
  }
  const after = m.after || [];
  if (!after.includes('auth')) {
    m.after = [...after, 'auth'];
  }
}

export function parseFromFile(path) {
  const name = basename(path);
  let m = {};
  let id;
  if (/^(\[)[a-zA-Z1-9.,]+(\])[a-zA-Z1-9]+.js$/.test(name)) {
    const split = name.split(/[\[\]]+/);
    id = split[2].substr(0, split[2].indexOf('.')).trim();
    m = {
      id,
      middleware: buildMiddlewareFunction(id, path),
      after: split[1].split(',').filter((a) => a.trim() !== ''),
      path
    };
  } else if (/^[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\]).js$/.test(name)) {
    const split = name.split(/[\[\]]+/);
    id = split[0].trim();
    m = {
      id,
      middleware: buildMiddlewareFunction(id, path),
      before: split[1].split(',').filter((a) => a.trim() !== ''),
      path
    };
  } else if (
    /^(\[)[a-zA-Z1-9,]+(\])[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\]).js$/.test(name)
  ) {
    const split = name.split(/[\[\]]+/);
    id = split[2].trim();
    m = {
      id,
      middleware: buildMiddlewareFunction(id, path),
      after: split[1].split(',').filter((a) => a.trim() !== ''),
      before: split[3].split(',').filter((a) => a.trim() !== ''),
      path
    };
  } else {
    const split = name.split('.');
    id = split[0].trim();
    m = {
      id,
      middleware: buildMiddlewareFunction(id, path),
      path
    };
  }

  const route = getRouteFromPath(path);
  if (route.region === 'api') {
    if (m.id !== 'context' && m.id !== 'apiErrorHandler') {
      m.before = !m.before ? ['apiResponse'] : m.before;
      m.after = !m.after ? ['escapeHtml', 'auth'] : m.after;
      forceAuthDependency(m, route);
    }
  } else if (m.id !== 'context' && m.id !== 'errorHandler') {
    m.before = !m.before ? ['notFound'] : m.before;
    m.after = !m.after ? ['auth'] : m.after;
    forceAuthDependency(m, route);
  }

  // Check if routeId is an array of routeIds or a single routeId
  if (Array.isArray(route.routeId)) {
    return route.routeId.map((r) => ({
      ...m,
      region: route.region,
      scope: route.scope,
      routeId: r
    }));
  } else {
    return [
      {
        ...m,
        ...route
      }
    ];
  }
}
