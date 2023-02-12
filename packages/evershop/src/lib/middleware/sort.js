const Topo = require('@hapi/topo');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * This function take a path and scan for the middleware functions
 *
 * @param {array} middlewares  The list of middleware functions
 *
 * @return {array} List of sorted middleware functions
 */
exports.sortMiddlewares = function sortMiddlewares(middlewares = []) {
  const middlewareFunctions = middlewares.filter((m) => {
    if ((m.before === m.after) === null) return true;
    const dependencies = (m.before || []).concat(m.after || []);
    let flag = true;
    dependencies.forEach((d) => {
      if (
        flag === false ||
        middlewares.findIndex(
          (e) =>
            e.id === d &&
            (e.scope === 'app' ||
              e.scope === 'admin' ||
              e.scope === 'frontStore' ||
              e.routeId === null ||
              e.routeId === m.scope ||
              e.routeId === m.routeId)
        ) === -1
      ) {
        flag = false;
      }
    });

    return flag;
  });
  const sorter = new Topo.Sorter();
  middlewareFunctions.forEach((m) => {
    sorter.add(m.id, { before: m.before, after: m.after, group: m.id });
  });

  return sorter.nodes.map((n) => {
    const index = middlewareFunctions.findIndex((m) => m.id === n);
    const m = middlewareFunctions[index];
    middlewareFunctions.splice(index, 1);
    return m;
  });
};
