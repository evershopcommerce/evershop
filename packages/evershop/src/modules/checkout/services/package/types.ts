/** A row of the `package` table — an admin-managed box/envelope size.
 *  Dimensions are in `shop.dimensionUnit`; `weight` (tare — the empty
 *  package's own weight) is in `shop.weightUnit`. numeric columns come back
 *  from pg as strings. */
export interface PackageRow {
  package_id: number;
  uuid: string;
  name: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}
