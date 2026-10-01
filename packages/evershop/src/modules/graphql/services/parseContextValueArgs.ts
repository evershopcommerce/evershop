import JSON5 from 'json5';

/**
 * Parse the decoded ARGUMENT LIST of a compiled `getContextValue(...)` token
 * into a real arguments array, as DATA only.
 *
 * The build (`lib/webpack/util/parseGraphqlByFile.js`) rewrites a
 * `getContextValue(<args>)` call authored in a route's GraphQL `query` /
 * `variables` block into a base64 token. At request time the token is decoded
 * back to the argument-list source text — e.g. `"orderUuid"`, or `"key", 5` —
 * and must be turned into a real call.
 *
 * This replaces `eval('getContextValue(request, ' + decoded + ')')`, which
 * executed arbitrary JavaScript (a stored widget-setting value could reach it,
 * giving remote code execution). The arguments are only ever data literals, so
 * JSON5 parses them as data and executes nothing: wrapping the list in `[...]`
 * turns `"key", 5` into the array `["key", 5]`. A non-literal payload throws a
 * SyntaxError instead of running.
 */
export function parseContextValueArgs(decoded: string): unknown[] {
  return JSON5.parse(`[${decoded}]`);
}
