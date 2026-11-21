import { getValue } from '../../../../lib/util/registry.js';

/**
 * Customer columns that only the store may set. The public routes (the sign-up
 * `POST /api/customers`, a customer editing `PATCH /api/customers/me`) pass the
 * request body to the customer services, which write any key that is a column,
 * so those routes remove these first. An admin creating a customer keeps them.
 *  - `group_id`: the customer group decides prices, taxes and promotions.
 *  - `status`: enables or disables the account.
 *  - `meta_data`: the custom fields, written only by the admin metafield
 *    route, which checks them against their definitions.
 *  - `customer_id`, `uuid`, `created_at`, `updated_at`: the database sets them.
 * Columns an extension adds pass through, so a sign-up or profile form that an
 * extension extends keeps working. An extension protects its own column with
 * the `protectedCustomerFields` registry value (see below).
 */
export const PROTECTED_CUSTOMER_FIELDS = [
  'group_id',
  'status',
  'meta_data',
  'customer_id',
  'uuid',
  'created_at',
  'updated_at'
] as const;

/**
 * The fields a public route removes: the core list plus the fields extensions
 * add with `addProcessor('protectedCustomerFields', ...)` in their bootstrap.
 * The context (`this` in a `function` processor) carries the `routeId`, so an
 * extension can protect a field on one route only.
 *
 * An extension can only ADD. A core field it leaves out of the list it returns
 * stays protected: letting a visitor pick, say, their customer group is a
 * feature for the extension's own route, with its own checks, not a switch
 * that turns the protection off for the whole store.
 */
export async function getProtectedCustomerFields(context: {
  routeId: string;
}): Promise<string[]> {
  const fields = await getValue<string[]>(
    'protectedCustomerFields',
    [...PROTECTED_CUSTOMER_FIELDS],
    context,
    (value) =>
      Array.isArray(value) && value.every((field) => typeof field === 'string')
  );
  return [...new Set([...PROTECTED_CUSTOMER_FIELDS, ...fields])];
}

/**
 * A copy of `data` without the protected fields and the `extra` ones. Anything
 * that is not a plain object is returned as it is, for the service's own
 * validation to refuse.
 */
export async function withoutProtectedCustomerFields<T>(
  data: T,
  context: { routeId: string },
  extra: readonly string[] = []
): Promise<T> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return data;
  }
  const copy = { ...data } as Record<string, unknown>;
  const fields = await getProtectedCustomerFields(context);
  [...fields, ...extra].forEach((field) => {
    delete copy[field];
  });
  return copy as T;
}
