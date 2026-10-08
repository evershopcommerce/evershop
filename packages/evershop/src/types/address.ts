/**
 * Shared address types for services, GraphQL resolvers and the storefront.
 *
 * `Address` is a row of any of the three address tables (`customer_address`,
 * `cart_address`, `order_address`), or an API payload about to become one, in
 * the Address Format Registry vocabulary (spec § 3.1). `AddressGraphql` is the
 * camelCase shape the `Address` GraphQL interface returns (spec § 3.7).
 * Replaces `types/customerAddress.ts` (removed in the breaking release, D-14).
 */
import type {
  AddressError,
  AddressRow,
  ResolvedAddressSchema
} from '../lib/address/types.js';

export type Address = AddressRow;

/** A geographic level below country as GraphQL returns it. `key` is what is stored. */
export interface AddressRegionGraphql {
  key: string;
  name: string;
  isoCode?: string | null;
}

export interface AddressGraphql {
  uuid?: string | null;
  recipient?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  organization?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  dependentLocality?: AddressRegionGraphql | null;
  locality?: AddressRegionGraphql | null;
  administrativeArea?: AddressRegionGraphql | null;
  postalCode?: string | null;
  sortingCode?: string | null;
  country?: { code: string; name: string } | null;
  telephone?: string | null;
  /** Registered extra fields, raw keys as stored (never camel-cased). */
  extra?: Record<string, unknown> | null;
  /** Display lines for the address's country and the request locale (spec § 3.6). */
  formatted?: string[];
  [key: string]: unknown;
}

export type { AddressError, ResolvedAddressSchema };
