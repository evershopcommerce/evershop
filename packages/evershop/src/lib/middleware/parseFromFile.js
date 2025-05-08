import { basename } from 'path';
import { buildMiddlewareFunction } from './buildMiddlewareFunction.js';
import { getRouteFromPath } from './getRouteFromPath.js';

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
      m.after = !m.after ? ['escapeHtml'] : m.after;
    }
  } else if (m.id !== 'context' && m.id !== 'errorHandler') {
    m.before = !m.before ? ['buildQuery'] : m.before;
    m.after = !m.after ? ['auth'] : m.after;
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
