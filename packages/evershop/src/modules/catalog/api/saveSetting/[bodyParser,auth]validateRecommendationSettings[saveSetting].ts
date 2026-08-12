import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { getAjv } from '../../../base/services/getAjv.js';
import relatedProductsRulesSchema from '../../services/recommendation/relatedProductsRulesSchema.json' with { type: 'json' };

/**
 * Gate the Settings save for recommendation keys (spec § 6.2, § 12).
 * Contributed by the catalog module to the setting module's saveSetting route
 * (middleware attaches by route id — the cms file-storage precedent). The
 * explicit `auth` bracket matters: naming brackets replaces the auto-injected
 * API defaults, and without it nothing orders this validator after auth.
 *
 * `relatedProductsRules` accepts null so the global config can be reset to
 * the zero-config default (saveSetting stores '' and the typed getter falls
 * back). Booleans inside the rules object are STRICT: the § 10.1 rule editor
 * must emit typed values. The scalar crossSell* gates are union-typed because
 * number inputs may post strings.
 *
 * Every key is optional here — saveSetting is a generic upsert and most saves
 * carry unrelated keys.
 */
const positiveIntGate = (label: string) => ({
  type: ['integer', 'string'],
  pattern: '^[1-9][0-9]*$',
  minimum: 1,
  errorMessage: {
    type: `${label} must be a number`,
    pattern: `${label} must be a whole number of at least 1`,
    minimum: `${label} must be at least 1`
  }
});

const validationSchema = {
  type: 'object',
  properties: {
    relatedProductsRules: {
      ...relatedProductsRulesSchema,
      type: ['object', 'null']
    },
    crossSellMinPairCount: positiveIntGate('Minimum pair count'),
    crossSellMinAnchorOrders: positiveIntGate('Minimum anchor orders'),
    crossSellMinLift: {
      type: ['number', 'string'],
      pattern: '^[0-9]+(\\.[0-9]+)?$',
      minimum: 0,
      errorMessage: {
        type: 'Minimum lift must be a number',
        pattern: 'Minimum lift must be a non-negative number (e.g. 1 or 1.2)',
        minimum: 'Minimum lift cannot be negative'
      }
    },
    crossSellFallbackEnabled: {
      type: ['integer', 'string', 'boolean'],
      enum: [0, 1, '0', '1', true, false],
      errorMessage: {
        type: 'Cross-sell fallback must be a boolean, number, or string',
        enum: "Cross-sell fallback must be either 0, 1, '0', '1', true, or false"
      }
    }
  },
  additionalProperties: true
};

const validate = getAjv().compile(validationSchema);

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (error?: Error) => void
) => {
  const valid = validate(request.body || {});
  if (!valid) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: validate.errors?.[0]?.message || 'Invalid recommendation settings'
      }
    });
    return;
  }
  next();
};
