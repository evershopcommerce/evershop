import { createFieldValidator } from '../../../lib/metafield/fieldValidator.js';
import type {
  FieldDescriptor,
  MetafieldDefinition
} from '../../../lib/metafield/types.js';
import type {
  MetafieldField,
  StoredMetafield
} from '../services/ports/lookup.js';

function fieldOf(descriptor: FieldDescriptor): MetafieldField {
  return {
    key: descriptor.key,
    type: descriptor.type,
    isList: Boolean(descriptor.isList),
    required: Boolean(descriptor.required),
    subFields: (descriptor.subFields ?? []).map(fieldOf)
  };
}

/**
 * A definition of the store as the import wants it: its shape, and core's own
 * check of a value against it (`createFieldValidator`: blank is not provided,
 * `required`, the schema with the validations of the definition), so that a value
 * the import accepts is a value core's `validateMetafields` accepts when the
 * service saves the product.
 */
export function toStoredMetafield(
  definition: MetafieldDefinition
): StoredMetafield {
  return {
    ...fieldOf(definition),
    namespace: definition.namespace,
    check: createFieldValidator(definition)
  };
}
