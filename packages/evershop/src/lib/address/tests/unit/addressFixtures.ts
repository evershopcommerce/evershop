/**
 * Format records inlined from scripts/address-formats/snapshot/google/*.json,
 * merged over ZZ the way `getAddressFormat` does, with the generator's
 * EverShop extensions (`name_order`, `telephone.dialCode`). `lfmt` is omitted
 * where upstream's equals `fmt` (VN). Tests derive from these so they do not
 * depend on the generated files' content.
 */
import type {
  AddressFormat,
  AddressFormatPatch,
  ResolvedAddressField,
  ResolvedAddressSchema
} from '../../types.js';

export const ZZ: AddressFormat = {
  fmt: '%N%n%O%n%A%n%C',
  require: 'AC',
  upper: 'C',
  state_name_type: 'province',
  locality_name_type: 'city',
  sublocality_name_type: 'suburb',
  zip_name_type: 'postal',
  name_order: 'given_first'
};

export const US: AddressFormat = {
  ...ZZ,
  fmt: '%N%n%O%n%A%n%C, %S %Z',
  require: 'ACSZ',
  upper: 'CS',
  zip: '(\\d{5})(?:[ \\-](\\d{4}))?',
  zipex: '95014,22162-1010',
  state_name_type: 'state',
  zip_name_type: 'zip',
  languages: ['en'],
  telephone: { dialCode: '+1' }
};

export const DE: AddressFormat = {
  ...ZZ,
  fmt: '%N%n%O%n%A%n%Z %C',
  require: 'ACZ',
  zip: '\\d{5}',
  zipex: '26133,53225',
  telephone: { dialCode: '+49' }
};

export const HK: AddressFormat = {
  ...ZZ,
  fmt: '%S%n%C%n%A%n%O%n%N',
  lfmt: '%N%n%O%n%A%n%C%n%S',
  require: 'AS',
  upper: 'S',
  state_name_type: 'area',
  locality_name_type: 'district',
  languages: ['zh-Hant', 'en'],
  lang: 'zh',
  name_order: 'family_first',
  telephone: { dialCode: '+852' }
};

export const JP: AddressFormat = {
  ...ZZ,
  fmt: '〒%Z%n%S%n%A%n%O%n%N',
  lfmt: '%N%n%O%n%A, %S%n%Z',
  require: 'ASZ',
  upper: 'S',
  state_name_type: 'prefecture',
  zip: '\\d{3}-?\\d{4}',
  zipex: '154-0023,350-1106,951-8073,112-0001,208-0032,231-0012',
  languages: ['ja'],
  name_order: 'family_first',
  telephone: { dialCode: '+81' }
};

export const VN: AddressFormat = {
  ...ZZ,
  fmt: '%N%n%O%n%A%n%C%n%S %Z',
  require: 'AS',
  zip: '\\d{5}\\d?',
  zipex: '70010,55999',
  languages: ['vi'],
  name_order: 'family_first',
  telephone: { dialCode: '+84' }
};

export const CN: AddressFormat = {
  ...ZZ,
  fmt: '%Z%n%S%C%D%n%A%n%O%n%N',
  lfmt: '%N%n%O%n%A%n%D%n%C%n%S, %Z',
  require: 'ACSZ',
  upper: 'S',
  sublocality_name_type: 'district',
  zip: '\\d{6}',
  zipex: '266033,317204,100096,100808',
  languages: ['zh'],
  name_order: 'family_first',
  telephone: { dialCode: '+86' }
};

/** The reference package's Vietnam patch (spec § 3.2). */
export const VN_WARD_PATCH: AddressFormatPatch = {
  fmt: '%N%n%O%n%A%n%D%n%C%n%S',
  require: 'ACDS',
  sublocality_name_type: 'ward',
  telephone: { pattern: '^(\\+84|0)[0-9]{9}$', example: '0912 345 678' }
};

export function ids(schema: ResolvedAddressSchema): string[] {
  return schema.fields.map((f) => f.id);
}

export function rows(schema: ResolvedAddressSchema): number[] {
  return schema.fields.map((f) => f.row);
}

export function byId(schema: ResolvedAddressSchema, id: string): ResolvedAddressField {
  const field = schema.fields.find((f) => f.id === id);
  if (!field) {
    throw new Error(`field '${id}' missing; schema has: ${ids(schema).join(', ')}`);
  }
  return field;
}

export function rowOf(schema: ResolvedAddressSchema, id: string): number {
  return byId(schema, id).row;
}

export function onRow(schema: ResolvedAddressSchema, row: number): string[] {
  return schema.fields.filter((f) => f.row === row).map((f) => f.id);
}
