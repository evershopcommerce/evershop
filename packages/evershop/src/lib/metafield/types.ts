export type MetafieldType =
  | 'short_text'
  | 'long_text'
  | 'rich_text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'color'
  | 'url'
  | 'money'
  | 'json'
  | 'reference'
  | 'group';

export const METAFIELD_TYPES: MetafieldType[] = [
  'short_text',
  'long_text',
  'rich_text',
  'integer',
  'number',
  'boolean',
  'date',
  'color',
  'url',
  'money',
  'json',
  'reference',
  'group'
];

/** Maximum group nesting depth (the root group is level 1). */
export const MAX_DEPTH = 3;

export type ValidationType = 'size' | 'range' | 'regexp' | 'choices';

export interface Validation {
  type: ValidationType;
  min?: number;
  max?: number;
  pattern?: string;
  values?: Array<string | number>;
}

/**
 * The recursive unit describing one field's typing. The same shape is used at
 * every level; sub-fields are descriptors embedded in `subFields` (not rows).
 * Keys are camelCase, including inside the persisted `sub_fields` JSONB.
 */
export interface FieldDescriptor {
  key: string;
  name: string;
  description?: string;
  type: MetafieldType;
  isList?: boolean;
  required?: boolean;
  translatable?: boolean;
  validations?: Validation[];
  appearance?: Record<string, unknown>;
  /** Opaque label for `reference` targets; the consumer dereferences it. */
  referenceType?: string;
  subFields?: FieldDescriptor[];
}

/** A top-level field descriptor plus its placement metadata. */
export interface MetafieldDefinition extends FieldDescriptor {
  uuid: string;
  ownerType: string;
  namespace: string;
  visibleToCustomer: boolean;
  position: number;
}

export interface ShapedMetafield {
  namespace: string;
  key: string;
  type: MetafieldType;
  value: unknown;
}

/** An entity's metafield values, keyed namespace -> field key -> value. */
export type MetaData = Record<string, Record<string, unknown>>;
