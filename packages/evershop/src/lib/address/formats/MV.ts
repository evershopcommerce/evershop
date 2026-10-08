/**
 * GENERATED FILE — do not edit by hand. Regenerate with `npm run generate:address-formats`.
 *
 * Address format data derived from Google's libaddressinput address metadata
 * (https://github.com/google/libaddressinput, served at
 * https://chromium-i18n.appspot.com/ssl-address/data), licensed under the
 * Creative Commons Attribution 4.0 International License (CC-BY 4.0,
 * https://creativecommons.org/licenses/by/4.0/). Changes made: converted from JSON to
 * TypeScript, keys normalized to EverShop's AddressFormat shape, manual corrections from
 * scripts/address-formats/fixes/ applied, EverShop extensions (address_lines, name_order,
 * telephone.dialCode) added. Snapshot: 2026-10-02.
 */
/**
 * Person-name order derived from Unicode CLDR 48.2.0 person-name data
 * (https://cldr.unicode.org), © Unicode, Inc., used under the Unicode License v3
 * (https://www.unicode.org/license.txt).
 */
/* telephone.dialCode from Google's libphonenumber v9.0.40 (https://github.com/google/libphonenumber), Apache License 2.0. */
import type { AddressFormat } from '../types.js';

export default {
  fmt: '%N%n%O%n%A%n%C %Z',
  require: 'AC',
  zip: '\\d{5}',
  zipex: '20026',
  name_order: 'given_first',
  telephone: { dialCode: '+960' }
} satisfies AddressFormat;
