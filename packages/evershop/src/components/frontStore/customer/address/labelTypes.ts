import type { ResolvedAddressField } from '@evershop/evershop/lib/address/types';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

/**
 * `labelType` → translated label (spec § 3.4, § 4.4). A literal `_()` per
 * label type so the translation key extractor sees every English source
 * string; `lib/address/labels.ts` holds the same map for the server, and a
 * drift test keeps the two in step. Extras carry their own English label and
 * translate dynamically.
 */
export function labelTypeLabel(labelType: string): string | undefined {
  switch (labelType) {
    case 'recipient':
      return _('Full name');
    case 'given_name':
      return _('Given name');
    case 'family_name':
      return _('Family name');
    case 'organization':
      return _('Company');
    case 'address_line':
      return _('Address');
    case 'address_line_2':
      return _('Address 2');
    case 'address_line_3':
      return _('Address line 3');
    case 'telephone':
      return _('Telephone');
    case 'country':
      return _('Country');
    // state_name_type
    case 'province':
      return _('Province');
    case 'state':
      return _('State');
    case 'prefecture':
      return _('Prefecture');
    case 'area':
      return _('Area');
    case 'county':
      return _('County');
    case 'emirate':
      return _('Emirate');
    case 'department':
      return _('Department');
    case 'district':
      return _('District');
    case 'do_si':
      return _('Do/Si');
    case 'island':
      return _('Island');
    case 'oblast':
      return _('Oblast');
    case 'parish':
      return _('Parish');
    case 'region':
      return _('Region');
    // locality_name_type
    case 'city':
      return _('City');
    case 'post_town':
      return _('Post town');
    case 'suburb':
      return _('Suburb');
    // sublocality_name_type
    case 'neighborhood':
      return _('Neighborhood');
    case 'village':
      return _('Village');
    case 'village_township':
      return _('Village/Township');
    case 'townland':
      return _('Townland');
    case 'ward':
      return _('Ward');
    // zip_name_type
    case 'postal':
      return _('Postcode');
    case 'zip':
      return _('ZIP code');
    case 'pin':
      return _('PIN code');
    case 'eircode':
      return _('Eircode');
    case 'sorting_code':
      return _('Sorting code');
    default:
      return undefined;
  }
}

/** The label types `labelTypeLabel` knows; the drift test compares this with `ADDRESS_LABELS`. */
export const LABEL_TYPES: readonly string[] = [
  'recipient', 'given_name', 'family_name', 'organization', 'address_line', 'address_line_2',
  'address_line_3', 'telephone', 'country', 'province', 'state', 'prefecture', 'area', 'county',
  'emirate', 'department', 'district', 'do_si', 'island', 'oblast', 'parish', 'region', 'city',
  'post_town', 'suburb', 'neighborhood', 'village', 'village_township', 'townland', 'ward',
  'postal', 'zip', 'pin', 'eircode', 'sorting_code'
];

/** Translated label of a field: its own English label for extras, else the typed label, else its id. */
export function addressFieldLabel(field: ResolvedAddressField): string {
  if (field.labelType === 'extra' && field.label) {
    return _(field.label);
  }
  return labelTypeLabel(field.labelType) ?? (field.label ? _(field.label) : field.id);
}

/**
 * Validation messages the schema and the server emit, as literals for the
 * extractor. Any other key (a package's own `pattern.messageKey`) translates
 * dynamically through `_()`.
 */
export function addressMessage(key: string, values: Record<string, string>): string {
  switch (key) {
    case '${field} is required':
      return _('${field} is required', values);
    case '${field} is not valid':
      return _('${field} is not valid', values);
    case '${field} is not a valid region':
      return _('${field} is not a valid region', values);
    default:
      return _(key, values);
  }
}
