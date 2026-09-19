import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { decidePreviewThemeMatch } from '../../../services/enforcePreviewThemeMatch.js';

/**
 * Storefront-wide guard for `?changeset=<token>` previews (spec 04 § 9.4).
 *
 * A page-builder preview is only valid under the theme the changeset belongs
 * to. When an admin previews a draft, then the active theme changes (another
 * tab, the CLI, a config edit), the stale preview URL must not silently render
 * the draft against the wrong theme. On a mismatch:
 *   - JSON / XHR clients get `409 Conflict` (the iframe / fetch caller can
 *     surface a "switch back to <theme>" message);
 *   - browser navigations get `302` to `/` (the normal storefront).
 *
 * Runs on every front-store route via `pages/frontStore/all`, but no-ops
 * immediately when there's no `?changeset` token (the overwhelming majority of
 * requests) so the DB lookup only happens for actual preview requests.
 */
// 3-arg signature: this is an active middleware that may short-circuit the
// response. It calls `next()` to proceed and returns without `next()` once it
// has sent a response.
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void
): Promise<void> => {
  const token = request.query?.changeset
    ? String(request.query.changeset)
    : null;
  if (!token) {
    next();
    return;
  }

  const decision = await decidePreviewThemeMatch(token);
  if (decision.ok) {
    next();
    return;
  }

  const accept = String(request.headers?.accept ?? '');
  const wantsJson =
    (request as unknown as { xhr?: boolean }).xhr === true ||
    accept.includes('application/json');

  if (wantsJson) {
    response.status(409).json({
      error: {
        status: 409,
        message:
          `Preview changeset belongs to theme '${decision.changesetTheme}', ` +
          `but the active theme is '${decision.activeTheme}'. ` +
          `Switch themes to preview it.`
      }
    });
    return;
  }

  response.redirect(302, '/');
};
