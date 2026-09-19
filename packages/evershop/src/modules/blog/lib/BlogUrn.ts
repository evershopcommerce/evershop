/**
 * Builders for blog entity URNs (`urn:evershop:blog:<type>:<uuid>`). The
 * (blog, post|category|tag) schemas are registered centrally in `lib/urn`
 * (alongside catalog/cms) so they're available on both client and server.
 */
export { BlogUrn } from '../../../lib/urn/index.js';
