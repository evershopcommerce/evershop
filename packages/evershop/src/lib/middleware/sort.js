import Topo from '@hapi/topo';

/**
 * Does `startId` (transitively) run before `auth`? Walks `before` edges.
 *
 * @param {string} startId
 * @param {Map<string, object>} byId
 * @param {Set<string>} seen
 * @return {boolean}
 */
function runsBeforeAuth(startId, byId, seen = new Set()) {
  if (startId === 'auth') return true;
  if (seen.has(startId)) return false;
  seen.add(startId);
  const node = byId.get(startId);
  if (!node || !Array.isArray(node.before)) return false;
  return node.before.some((b) => runsBeforeAuth(b, byId, seen));
}

/**
 * When Topo rejects the graph, look for the specific auth-ordering conflict so
 * we can throw an actionable message instead of Topo's opaque
 * "item added into group X created a dependencies error".
 *
 * The conflict: a middleware is required to run AFTER `auth` (authentication)
 * yet is also ordered to run BEFORE `auth`. That happens when a route
 * middleware is placed ahead of a pre-auth middleware without declaring
 * `before: ['auth']` on itself — the loader then forces `auth` into its `after`
 * (so it cannot run unauthenticated) and the two orderings collide.
 *
 * @param {array} middlewares  The post-filter middleware set.
 * @return {string|null}  A message, or null if no auth conflict is found.
 */
function describeAuthOrderingConflict(middlewares) {
  const byId = new Map();
  middlewares.forEach((m) => {
    if (!byId.has(m.id)) byId.set(m.id, m);
  });
  if (!byId.has('auth')) return null;

  for (const m of middlewares) {
    const after = m.after || [];
    if (!after.includes('auth')) continue;
    const before = m.before || [];
    if (before.includes('auth')) {
      return (
        `Middleware "${m.id}" is declared to run before 'auth' but also ends up ` +
        `after 'auth', so it cannot be ordered. Give it an explicit non-empty ` +
        `'after' dependency (for example name it \`[context]${m.id}[auth].ts\`) ` +
        `so the default \`after: ['escapeHtml', 'auth']\` is not applied.`
      );
    }
    const hop = before.find((b) => runsBeforeAuth(b, byId));
    if (hop) {
      return (
        `Middleware "${m.id}" is ordered before "${hop}", which runs before ` +
        `'auth', but "${m.id}" does not declare \`before: ['auth']\`. Route ` +
        `middleware runs after authentication by default; add 'auth' to its ` +
        `before-brackets (e.g. \`${m.id}[${hop},auth].ts\`) only if "${m.id}" is ` +
        `meant to run unauthenticated.`
      );
    }
  }
  return null;
}

/**
 * This function take a path and scan for the middleware functions
 *
 * @param {array} middlewares  The list of middleware functions
 *
 * @return {array} List of sorted middleware functions
 */
export function sortMiddlewares(middlewares = []) {
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
  try {
    middlewareFunctions.forEach((m) => {
      sorter.add(m.id, { before: m.before, after: m.after, group: m.id });
    });
  } catch (e) {
    const message = describeAuthOrderingConflict(middlewareFunctions);
    if (message) {
      throw new Error(message);
    }
    throw e;
  }

  return sorter.nodes.map((n) => {
    const index = middlewareFunctions.findIndex((m) => m.id === n);
    const m = middlewareFunctions[index];
    middlewareFunctions.splice(index, 1);
    return m;
  });
}
