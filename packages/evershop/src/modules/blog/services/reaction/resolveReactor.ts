import { randomUUID } from 'crypto';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

const VISITOR_COOKIE = 'blog_visitor';

/**
 * Resolves the visitor "fingerprint" used to de-duplicate reactions
 * (`blog_reaction.fingerprint`). It is the value of a signed, http-only cookie
 * — privacy-friendly (no IP/UA hashing). When `issue` is true (the write path)
 * and no cookie exists yet, a fresh id is generated and the cookie is set on
 * the response. On the read path (`issue` false) it returns null when absent.
 */
export function resolveReactor(
  request: EvershopRequest,
  response?: EvershopResponse,
  issue = false
): string | null {
  let fingerprint = request.signedCookies?.[VISITOR_COOKIE];
  if (!fingerprint && issue && response) {
    fingerprint = randomUUID();
    response.cookie(VISITOR_COOKIE, fingerprint, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
  }
  return fingerprint || null;
}
