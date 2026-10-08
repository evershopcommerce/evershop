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
  fmt: '%N%n%O%n%A%n%C%n%Z',
  require: 'ACZ',
  upper: 'CZ',
  zip: 'GIR ?0AA|(?:(?:AB|AL|B|BA|BB|BD|BF|BH|BL|BN|BR|BS|BT|BX|CA|CB|CF|CH|CM|CO|CR|CT|CV|CW|DA|DD|DE|DG|DH|DL|DN|DT|DY|E|EC|EH|EN|EX|FK|FY|G|GL|GY|GU|HA|HD|HG|HP|HR|HS|HU|HX|IG|IM|IP|IV|JE|KA|KT|KW|KY|L|LA|LD|LE|LL|LN|LS|LU|M|ME|MK|ML|N|NE|NG|NN|NP|NR|NW|OL|OX|PA|PE|PH|PL|PO|PR|RG|RH|RM|S|SA|SE|SG|SK|SL|SM|SN|SO|SP|SR|SS|ST|SW|SY|TA|TD|TF|TN|TQ|TR|TS|TW|UB|W|WA|WC|WD|WF|WN|WR|WS|WV|YO|ZE)(?:\\d[\\dA-Z]? ?\\d[ABD-HJLN-UW-Z]{2}))|BFPO ?\\d{1,4}',
  zipex: 'EC1Y 8SY,GIR 0AA,M2 5BQ,M34 4AB,CR0 2YR,DN16 9AA,W1A 4ZZ,EC1A 1HQ,OX14 4PG,BS18 8HF,NR25 7HG,RH6 0NP,BH23 6AA,B6 5BA,SO23 9AP,PO1 3AX,BFPO 61',
  locality_name_type: 'post_town',
  name_order: 'given_first',
  telephone: { dialCode: '+44' }
} satisfies AddressFormat;
