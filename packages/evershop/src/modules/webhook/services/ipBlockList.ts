import { getConfig } from '../../../lib/util/getConfig.js';

// The block list is shared with the import of images (`lib/ssrf`). It is
// re-exported here so that the webhook code and its tests keep their paths.
export {
  embeddedIPv4,
  isBlockedAddress
} from '../../../lib/ssrf/ipBlockList.js';

/**
 * Config opt-in for receivers on a private network or plain `http:` (local
 * development, a self-hosted n8n or ERP). Off by default; not an admin setting.
 */
export function isPrivateNetworkAllowed(): boolean {
  return getConfig('system.webhook.allowPrivateNetworks', false) === true;
}
