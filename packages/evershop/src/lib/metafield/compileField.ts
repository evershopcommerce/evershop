import { getStoreCurrency } from '../../modules/setting/services/setting.js';
import { MAX_DEPTH } from './types.js';
import type { FieldDescriptor, Validation } from './types.js';

type JSONSchema = Record<string, any>;

function applyValidations(
  schema: JSONSchema,
  validations: Validation[] = []
): JSONSchema {
  const out = { ...schema };
  for (const v of validations) {
    switch (v.type) {
      case 'size':
        if (typeof v.min === 'number') out.minLength = v.min;
        if (typeof v.max === 'number') out.maxLength = v.max;
        break;
      case 'range':
        if (typeof v.min === 'number') out.minimum = v.min;
        if (typeof v.max === 'number') out.maximum = v.max;
        break;
      case 'regexp':
        if (v.pattern) out.pattern = v.pattern;
        break;
      case 'choices':
        if (Array.isArray(v.values)) out.enum = v.values;
        break;
      default:
        break;
    }
  }
  return out;
}

function compileScalar(field: FieldDescriptor): JSONSchema {
  switch (field.type) {
    case 'short_text':
    case 'long_text':
    case 'rich_text':
    case 'url':
      return { type: 'string' };
    case 'color':
      return { type: 'string', pattern: '^#([0-9a-fA-F]{6})$' };
    case 'date':
      return { type: 'string', format: 'date' };
    case 'integer':
      return { type: 'integer' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'money': {
      // currency must match the store currency (spec §3.6) — admin setting, legacy config fallback
      const currency = getStoreCurrency();
      return {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          currency: currency
            ? { type: 'string', const: currency }
            : { type: 'string' }
        },
        required: ['amount', 'currency'],
        additionalProperties: false
      };
    }
    case 'reference':
      return {
        type: 'object',
        properties: {
          referenceType: { type: 'string' },
          id: { type: ['integer', 'string'] }
        },
        required: ['referenceType', 'id'],
        additionalProperties: false
      };
    case 'json':
      return {}; // arbitrary JSON — opaque, bypasses the depth guard
    default:
      return {};
  }
}

/**
 * Compile a field descriptor into a JSON Schema for AJV. Recurses into `group`
 * sub-fields with a hard depth cap. Throws (status 400) when nesting exceeds
 * `max` — invalid definitions are rejected, never persisted.
 */
export function compileField(
  field: FieldDescriptor,
  depth = 1,
  max = MAX_DEPTH
): JSONSchema {
  let schema: JSONSchema;
  if (field.type === 'group') {
    if (depth >= max) {
      throw Object.assign(
        new Error(`Group nesting exceeds max depth ${max} at "${field.key}"`),
        { status: 400 }
      );
    }
    const subFields = field.subFields ?? [];
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];
    for (const sub of subFields) {
      properties[sub.key] = compileField(sub, depth + 1, max);
      if (sub.required) required.push(sub.key);
    }
    schema = { type: 'object', properties, required, additionalProperties: false };
  } else {
    schema = applyValidations(compileScalar(field), field.validations);
  }
  return field.isList ? { type: 'array', items: schema } : schema;
}
