import {
  getAllCarriers,
  getCarrier
} from '../../../services/carrier/registry.js';
import { getCarrierCapabilities } from '../../../types/carrier.js';

/**
 * Admin GraphQL surface for the in-memory carrier registry (C2).
 *
 * Reads come straight from the in-memory map populated at bootstrap by
 * extensions calling `registerCarrier(...)`. No DB join — there's no
 * persisted carrier state. `capabilities` reflects which optional methods
 * the runtime object implements, so the admin UI can show/hide "Create
 * label", "Schedule pickup", etc. action buttons.
 */
function toCarrierShape(c) {
  return {
    code: c.code,
    name: c.name,
    description: c.description ?? null,
    capabilities: getCarrierCapabilities(c)
  };
}

export default {
  Query: {
    carriers: () =>
      getAllCarriers()
        .map(toCarrierShape)
        .sort((a, b) => a.name.localeCompare(b.name)),
    carrier: (_, { code }) => {
      const c = getCarrier(code);
      return c ? toCarrierShape(c) : null;
    }
  }
};
