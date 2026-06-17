import { getActiveDictionary } from '../activeDictionary.js';
import { interpolate } from '../interpolate.js';

/**
 * Client/template translation (spec §6.5). Isomorphic — imports only the iso accessor
 * (no `node:async_hooks`). Looks the source string up in the active dictionary (the
 * dict the server seeds via `setSSRContext`, or `window.eContext.translations` on the
 * client), then substitutes `${var}` via the shared `interpolate`. Missing OR empty
 * entries fall back to the source string (matching the old build-time loader, which
 * only replaced truthy values). For server-side code use `translate`.
 */
export function _(text: string, values?: Record<string, string>): string {
  const dict = getActiveDictionary();
  return interpolate(dict[text] || text, values);
}
