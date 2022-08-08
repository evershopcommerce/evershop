const { basename } = require('path');
const { buildMiddlewareFunction } = require('./buildMiddlewareFunction');
const { getRouteFromPath } = require('./getRouteFromPath');

module.exports.parseFromFile = (path) => {
  const name = basename(path);
  let m = {}, id;
  if (/^(\[)[a-zA-Z1-9.,]+(\])[a-zA-Z1-9]+.js$/.test(name)) {
    // eslint-disable-next-line no-useless-escape
    const split = name.split(/[\[\]]+/);
    id = split[2].substr(0, split[2].indexOf('.')).trim();
    m = {
      id: id,
      middleware: buildMiddlewareFunction(id, path),
      after: split[1].split(',').filter((a) => a.trim() !== ''),
      path: path
    };
  } else if (/^[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\]).js$/.test(name)) {
    // eslint-disable-next-line no-useless-escape
    const split = name.split(/[\[\]]+/);
    id = split[0].trim()
    m = {
      id: id,
      middleware: buildMiddlewareFunction(id, path),
      before: split[1].split(',').filter((a) => a.trim() !== ''),
      path: path
    };
  } else if (/^(\[)[a-zA-Z1-9,]+(\])[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\]).js$/.test(name)) {
    // eslint-disable-next-line no-useless-escape
    const split = name.split(/[\[\]]+/);
    id = split[2].trim();
    m = {
      id: id,
      middleware: buildMiddlewareFunction(id, path),
      after: split[1].split(',').filter((a) => a.trim() !== ''),
      before: split[3].split(',').filter((a) => a.trim() !== ''),
      path: path
    };
  } else {
    const split = name.split('.');
    id = split[0].trim();
    m = {
      id: id,
      middleware: buildMiddlewareFunction(id, path),
      path: path
    };
  }
  if (m.id !== 'context' && m.id !== 'errorHandler') {
    m.before = !m.before ? (['notification']) : m.before;
    m.after = !m.after ? (['session']) : m.after;
  }

  const route = getRouteFromPath(path);

  // Check if routeId is an array of routeIds or a single routeId
  if (Array.isArray(route.routeId)) {
    return route.routeId.map((r) => {
      return {
        ...m,
        scope: route.scope,
        routeId: r
      };
    })
  } else {
    return [
      {
        ...m,
        ...route
      }
    ];
  }
}