/**
 * Number of reverse-proxy hops in front of the app, read from the
 * `TRUST_PROXY_HOPS` environment variable. This drives Express `trust proxy`,
 * which in turn determines `request.ip` — and therefore the rate limiter's
 * per-IP bucketing. Set it to your real proxy depth:
 *
 *   0  = app is directly internet-facing (do not trust X-Forwarded-For)
 *   1  = one reverse proxy / load balancer (default; e.g. nginx or an ALB)
 *   2+ = a proxy chain, e.g. CDN -> load balancer -> app (Cloudflare + nginx)
 *
 * Getting this wrong breaks client-IP detection: too low collapses many users
 * behind a proxy into a single IP (false-positive throttling); too high lets a
 * client spoof `X-Forwarded-For` to dodge limits. An unset, empty, or invalid
 * value falls back to 1 — the safe default for the common single-proxy deploy,
 * matching EverShop's previous production behavior.
 */
export function getTrustProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw === undefined || raw.trim() === '') {
    return 1;
  }
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0) {
    return 1;
  }
  return hops;
}
