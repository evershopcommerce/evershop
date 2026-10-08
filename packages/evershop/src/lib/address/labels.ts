/**
 * `labelType` → English source string (specification § 3.4, § 4.4). The
 * server translates these with the injected `translate`; the client mirrors
 * the map in a literal `_()` switch so the key extractor sees every string.
 */
import type { ResolvedAddressField } from './types.js';

export const ADDRESS_LABELS: Record<string, string> = {
  recipient: 'Full name',
  given_name: 'Given name',
  family_name: 'Family name',
  organization: 'Company',
  address_line: 'Address',
  address_line_2: 'Address 2',
  address_line_3: 'Address line 3',
  telephone: 'Telephone',
  country: 'Country',
  // state_name_type
  province: 'Province',
  state: 'State',
  prefecture: 'Prefecture',
  area: 'Area',
  county: 'County',
  emirate: 'Emirate',
  department: 'Department',
  district: 'District',
  do_si: 'Do/Si',
  island: 'Island',
  oblast: 'Oblast',
  parish: 'Parish',
  region: 'Region',
  // locality_name_type
  city: 'City',
  post_town: 'Post town',
  suburb: 'Suburb',
  // sublocality_name_type
  neighborhood: 'Neighborhood',
  village: 'Village',
  village_township: 'Village/Township',
  townland: 'Townland',
  ward: 'Ward',
  // zip_name_type
  postal: 'Postcode',
  zip: 'ZIP code',
  pin: 'PIN code',
  eircode: 'Eircode',
  sorting_code: 'Sorting code'
};

/** The English source label of a field: its own label (extras), else the typed label, else its id. */
export function labelFor(field: ResolvedAddressField): string {
  return field.label ?? ADDRESS_LABELS[field.labelType] ?? field.id;
}
