import {
  select as _select,
  insert as _insert,
  update as _update,
  del as _del,
  insertOnUpdate as _insertOnUpdate
} from '@evershop/postgres-query-builder';
import type {
  SQLValue,
  PoolClient,
  Pool
} from '@evershop/postgres-query-builder';
import type {
  AdminUserRow,
  AttributeRow,
  AttributeGroupRow,
  AttributeGroupLinkRow,
  AttributeOptionRow,
  CartRow,
  CartAddressRow,
  CartItemRow,
  CategoryRow,
  CategoryDescriptionRow,
  CmsPageRow,
  CmsPageDescriptionRow,
  CollectionRow,
  CouponRow,
  CustomerRow,
  CustomerAddressRow,
  CustomerGroupRow,
  EventRow,
  MigrationRow,
  OrderRow,
  OrderActivityRow,
  OrderAddressRow,
  OrderItemRow,
  PaymentTransactionRow,
  ProductRow,
  ProductAttributeValueIndexRow,
  ProductCategoryRow,
  ProductCollectionRow,
  ProductCustomOptionRow,
  ProductCustomOptionValueRow,
  ProductDescriptionRow,
  ProductImageRow,
  ProductInventoryRow,
  ResetPasswordTokenRow,
  SessionRow,
  SettingRow,
  ShipmentRow,
  ShipmentItemRow,
  ShippingZoneRow,
  ShippingZoneProvinceRow,
  ShippingZoneCountryRow,
  ShippingZoneProviderRow,
  CoreShippingMethodRow,
  CoreShippingMethodRateRow,
  TaxClassRow,
  TaxRateRow,
  UrlRewriteRow,
  VariantGroupRow,
  WidgetInstanceRow,
  WidgetPlacementRow,
  ChangesetRow,
  ChangesetOperationRow,
  RolloutPlanRow
} from '../../types/db/index.js';

// ---- Known EverShop table names ------------------------------------------------

export type TableName =
  | 'admin_user'
  | 'attribute'
  | 'attribute_group'
  | 'attribute_group_link'
  | 'attribute_option'
  | 'cart'
  | 'cart_address'
  | 'cart_item'
  | 'category'
  | 'category_description'
  | 'cms_page'
  | 'cms_page_description'
  | 'collection'
  | 'coupon'
  | 'customer'
  | 'customer_address'
  | 'customer_group'
  | 'event'
  | 'migration'
  | 'order'
  | 'order_activity'
  | 'order_address'
  | 'order_item'
  | 'payment_transaction'
  | 'product'
  | 'product_attribute_value_index'
  | 'product_category'
  | 'product_collection'
  | 'product_custom_option'
  | 'product_custom_option_value'
  | 'product_description'
  | 'product_image'
  | 'product_inventory'
  | 'reset_password_token'
  | 'session'
  | 'setting'
  | 'shipment'
  | 'shipment_item'
  | 'shipping_zone'
  | 'shipping_zone_province'
  | 'shipping_zone_country'
  | 'shipping_zone_provider'
  | 'core_shipping_method'
  | 'core_shipping_method_rate'
  | 'tax_class'
  | 'tax_rate'
  | 'url_rewrite'
  | 'user_token_secret'
  | 'variant_group'
  | 'widget_instance'
  | 'widget_placement'
  | 'changeset'
  | 'changeset_operation'
  | 'rollout_plan';

// ---- Table → column mapping (derived from Row types, always stays in sync) -----

type TableColumnMap = {
  admin_user: keyof AdminUserRow;
  attribute: keyof AttributeRow;
  attribute_group: keyof AttributeGroupRow;
  attribute_group_link: keyof AttributeGroupLinkRow;
  attribute_option: keyof AttributeOptionRow;
  cart: keyof CartRow;
  cart_address: keyof CartAddressRow;
  cart_item: keyof CartItemRow;
  category: keyof CategoryRow;
  category_description: keyof CategoryDescriptionRow;
  cms_page: keyof CmsPageRow;
  cms_page_description: keyof CmsPageDescriptionRow;
  collection: keyof CollectionRow;
  coupon: keyof CouponRow;
  customer: keyof CustomerRow;
  customer_address: keyof CustomerAddressRow;
  customer_group: keyof CustomerGroupRow;
  event: keyof EventRow;
  migration: keyof MigrationRow;
  order: keyof OrderRow;
  order_activity: keyof OrderActivityRow;
  order_address: keyof OrderAddressRow;
  order_item: keyof OrderItemRow;
  payment_transaction: keyof PaymentTransactionRow;
  product: keyof ProductRow;
  product_attribute_value_index: keyof ProductAttributeValueIndexRow;
  product_category: keyof ProductCategoryRow;
  product_collection: keyof ProductCollectionRow;
  product_custom_option: keyof ProductCustomOptionRow;
  product_custom_option_value: keyof ProductCustomOptionValueRow;
  product_description: keyof ProductDescriptionRow;
  product_image: keyof ProductImageRow;
  product_inventory: keyof ProductInventoryRow;
  reset_password_token: keyof ResetPasswordTokenRow;
  session: keyof SessionRow;
  setting: keyof SettingRow;
  shipment: keyof ShipmentRow;
  shipment_item: keyof ShipmentItemRow;
  shipping_zone: keyof ShippingZoneRow;
  shipping_zone_province: keyof ShippingZoneProvinceRow;
  shipping_zone_country: keyof ShippingZoneCountryRow;
  shipping_zone_provider: keyof ShippingZoneProviderRow;
  core_shipping_method: keyof CoreShippingMethodRow;
  core_shipping_method_rate: keyof CoreShippingMethodRateRow;
  tax_class: keyof TaxClassRow;
  tax_rate: keyof TaxRateRow;
  url_rewrite: keyof UrlRewriteRow;
  user_token_secret: never; // deprecated/removed table
  variant_group: keyof VariantGroupRow;
  widget_instance: keyof WidgetInstanceRow;
  widget_placement: keyof WidgetPlacementRow;
  changeset: keyof ChangesetRow;
  changeset_operation: keyof ChangesetOperationRow;
  rollout_plan: keyof RolloutPlanRow;
};

/**
 * Extends `TableName` with a `string & {}` fallback so custom or future tables
 * (not yet in the schema) are accepted without a compile error, while still
 * surfacing the known table names as autocomplete suggestions.
 */
export type AnyTableName = TableName | (string & {});

// ---- Table → row type mapping (for typed write operations) -------------------

type TableRowMap = {
  admin_user: AdminUserRow;
  attribute: AttributeRow;
  attribute_group: AttributeGroupRow;
  attribute_group_link: AttributeGroupLinkRow;
  attribute_option: AttributeOptionRow;
  cart: CartRow;
  cart_address: CartAddressRow;
  cart_item: CartItemRow;
  category: CategoryRow;
  category_description: CategoryDescriptionRow;
  cms_page: CmsPageRow;
  cms_page_description: CmsPageDescriptionRow;
  collection: CollectionRow;
  coupon: CouponRow;
  customer: CustomerRow;
  customer_address: CustomerAddressRow;
  customer_group: CustomerGroupRow;
  event: EventRow;
  migration: MigrationRow;
  order: OrderRow;
  order_activity: OrderActivityRow;
  order_address: OrderAddressRow;
  order_item: OrderItemRow;
  payment_transaction: PaymentTransactionRow;
  product: ProductRow;
  product_attribute_value_index: ProductAttributeValueIndexRow;
  product_category: ProductCategoryRow;
  product_collection: ProductCollectionRow;
  product_custom_option: ProductCustomOptionRow;
  product_custom_option_value: ProductCustomOptionValueRow;
  product_description: ProductDescriptionRow;
  product_image: ProductImageRow;
  product_inventory: ProductInventoryRow;
  reset_password_token: ResetPasswordTokenRow;
  session: SessionRow;
  setting: SettingRow;
  shipment: ShipmentRow;
  shipment_item: ShipmentItemRow;
  shipping_zone: ShippingZoneRow;
  shipping_zone_province: ShippingZoneProvinceRow;
  shipping_zone_country: ShippingZoneCountryRow;
  shipping_zone_provider: ShippingZoneProviderRow;
  core_shipping_method: CoreShippingMethodRow;
  core_shipping_method_rate: CoreShippingMethodRateRow;
  tax_class: TaxClassRow;
  tax_rate: TaxRateRow;
  url_rewrite: UrlRewriteRow;
  user_token_secret: Record<string, any>; // deprecated/removed table
  variant_group: VariantGroupRow;
  widget_instance: WidgetInstanceRow;
  widget_placement: WidgetPlacementRow;
  changeset: ChangesetRow;
  changeset_operation: ChangesetOperationRow;
  rollout_plan: RolloutPlanRow;
};

/**
 * Full row type for table `T`. Use `Partial<RowOf<T>>` in write operations.
 * Falls back to `Record<string, any>` for unknown/custom tables.
 */
export type RowOf<T extends AnyTableName> = T extends TableName
  ? TableRowMap[T]
  : Record<string, any>;

/**
 * Write-compatible version of a row type for use in `.given()`.
 *
 * PostgreSQL `numeric`/`decimal` columns are returned by `node-postgres` as
 * `string` (to preserve precision), but the driver accepts both `string` and
 * `number` as input. This mapped type widens every `string`-typed field to
 * `string | number` (and `string | null` to `string | number | null`) so that
 * calls like `.given({ amount: 42 })` compile without needing an explicit cast.
 */
export type WriteRow<T> = {
  [K in keyof T]: T[K] extends string
    ? string | number
    : T[K] extends string | null
    ? string | number | null
    : T[K];
};

/**
 * Known column names for table `T`.
 * The `string & {}` fallback lets arbitrary expressions, qualified names, and
 * aliased joined columns pass through without a compile error, while still
 * surfacing the known column literals as autocomplete suggestions.
 */
/**
 * Known column names for table `T`.
 * Falls back to `string` for unknown/custom tables so any column name is accepted.
 * The `string & {}` union keeps the known literal suggestions visible in autocomplete.
 */
export type ColumnOf<T extends AnyTableName> = T extends TableName
  ? TableColumnMap[T] | (string & {})
  : string;

/**
 * All known columns from all tables, prefixed with their table name.
 * e.g. 'order.order_id' | 'order.status' | 'product.sku' | ...
 * Used to provide autocomplete in `select()` before `.from()` is called.
 *
 * The mapped-type form `{ [T in TableName]: ... }[TableName]` is required to
 * force correct per-table distribution. Using a generic alias `Prefix<TableName>`
 * causes TypeScript to evaluate `TableColumnMap[T]` with T as the full union,
 * producing a cross-product (e.g. 'product.amount') which is incorrect.
 */
export type AllPrefixedColumns = {
  [T in TableName]: `${T}.${TableColumnMap[T] & string}`;
}[TableName];

// ---- Typed chain interfaces ----------------------------------------------------

/**
 * WHERE-clause chain returned by write query methods (UPDATE / DELETE).
 * Provides `.and()` / `.or()` for additional conditions, then `.execute()`.
 */
export interface TypedWriteConditionChain<T extends AnyTableName> {
  and(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  or(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  andWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  orWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<any>;
}

/** Typed INSERT query. `.given()` accepts the row shape of table `T`. */
export interface TypedInsertQuery<T extends AnyTableName> {
  given(data: Partial<WriteRow<RowOf<T>>>): TypedInsertQuery<T>;
  prime(field: ColumnOf<T>, value: any): TypedInsertQuery<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<any>;
}

/** Typed UPDATE query. `.given()` / `.prime()` are constrained to columns of `T`. */
export interface TypedUpdateQuery<T extends AnyTableName> {
  given(data: Partial<WriteRow<RowOf<T>>>): TypedUpdateQuery<T>;
  prime(field: ColumnOf<T>, value: any): TypedUpdateQuery<T>;
  where(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  andWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  orWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<any>;
}

/** Typed DELETE query. `.where()` is constrained to columns of `T`. */
export interface TypedDeleteQuery<T extends AnyTableName> {
  where(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  andWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  orWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedWriteConditionChain<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<any[]>;
}

/** Typed INSERT … ON CONFLICT DO UPDATE query. */
export interface TypedInsertOnUpdateQuery<T extends AnyTableName> {
  given(data: Partial<WriteRow<RowOf<T>>>): TypedInsertOnUpdateQuery<T>;
  prime(field: ColumnOf<T>, value: any): TypedInsertOnUpdateQuery<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<any>;
}

/**
 * Returned by `.leftJoin()` / `.rightJoin()` / `.innerJoin()`.
 * Call `.on()` to complete the join condition.
 */
export interface TypedJoin<T extends AnyTableName> {
  on(
    column: string,
    operator: string,
    referencedColumn: string
  ): TypedQueryChain<T>;
}

/**
 * The WHERE-clause chain returned by `.where()` / `.andWhere()` / `.orWhere()`.
 * Provides `.and()` / `.or()` for additional conditions, then `.execute()` / `.load()`.
 */
export interface TypedConditionChain<T extends AnyTableName> {
  and(field: ColumnOf<T>, operator: string, value: any): TypedConditionChain<T>;
  or(field: ColumnOf<T>, operator: string, value: any): TypedConditionChain<T>;
  andWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedConditionChain<T>;
  orWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedConditionChain<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<RowOf<T>[]>;
  load(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<RowOf<T> | null>;
}

/**
 * A fully table-aware SELECT query chain.
 * Every field parameter is constrained to the known columns of table `T`
 * (with a `string` fallback so expressions and join aliases still work).
 */
export interface TypedQueryChain<T extends AnyTableName> {
  /**
   * Add a column to the SELECT clause. Accepts bare column names for table `T`
   * (e.g. `'order_id'`) or prefixed names for cross-table references after joins
   * (e.g. `'product.sku'`), as well as SQL expressions via `sql(...)`.
   */
  select(
    field: ColumnOf<T> | AllPrefixedColumns | SQLValue,
    alias?: string
  ): TypedQueryChain<T>;
  /**
   * Set the FROM table and re-narrow the chain to that table's columns.
   * Calling `.from('order')` causes all subsequent `.where()`, `.orderBy()`,
   * etc. to suggest only the columns of the `order` table.
   */
  from<U extends AnyTableName>(table: U, alias?: string): TypedQueryChain<U>;
  where(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedConditionChain<T>;
  andWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedConditionChain<T>;
  orWhere(
    field: ColumnOf<T>,
    operator: string,
    value: any
  ): TypedConditionChain<T>;
  leftJoin(table: TableName | (string & {}), alias?: string): TypedJoin<T>;
  rightJoin(table: TableName | (string & {}), alias?: string): TypedJoin<T>;
  innerJoin(table: TableName | (string & {}), alias?: string): TypedJoin<T>;
  groupBy(...fields: Array<ColumnOf<T>>): TypedQueryChain<T>;
  orderBy(
    field: ColumnOf<T>,
    direction?: 'ASC' | 'DESC' | (string & {})
  ): TypedQueryChain<T>;
  orderDirection(direction: string): TypedQueryChain<T>;
  having(field: ColumnOf<T>, operator: string, value: any): TypedQueryChain<T>;
  limit(offset: number, limit: number): TypedQueryChain<T>;
  removeOrderBy(): TypedQueryChain<T>;
  removeGroupBy(): TypedQueryChain<T>;
  removeLimit(): TypedQueryChain<T>;
  execute(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<RowOf<T>[]>;
  load(
    connection: PoolClient | Pool,
    releaseConnection?: boolean
  ): Promise<RowOf<T> | null>;
  sql(): Promise<string>;
  clone(): TypedQueryChain<T>;
}

/**
 * The initial query builder, before a table is bound via `.from()`.
 * Column arguments are drawn from the union of every known table's columns.
 * Call `.from(tableName)` to bind a specific table and unlock per-table column
 * suggestions on all subsequent methods.
 */
export interface UnboundSelectChain {
  /**
   * Add a column to the SELECT clause. Suggestions are shown as `table.column`
   * (e.g. `'order.order_id'`, `'product.sku'`) so you know which table each
   * column belongs to. You are responsible for calling `.from(table)` with
   * the matching table afterwards.
   */
  select(
    field: AllPrefixedColumns | (string & {}),
    alias?: string
  ): UnboundSelectChain;
  /**
   * Bind a table and return a fully typed query chain.
   *
   * @example
   * select('order.order_id', 'order.status').from('order').where('status', '=', 'pending').execute(pool)
   */
  from<T extends AnyTableName>(table: T, alias?: string): TypedQueryChain<T>;
}

// ---- Typed factory functions ---------------------------------------------------

/**
 * Begin a SELECT query.
 *
 * Column name suggestions are shown as `table.column` (e.g. `'order.order_id'`,
 * `'product.sku'`) so you can see which table each column belongs to.
 * Once you call `.from(tableName)`, the chain narrows to that table's columns
 * for `.where()`, `.orderBy()`, `.groupBy()`, etc.
 *
 * @example
 * // All columns shorthand:
 * select().from('order').where('status', '=', 'pending').execute(pool)
 *
 * // Explicit columns with table-prefixed suggestions:
 * select('order.order_id', 'order.uuid')
 *   .from('order')
 *   .orderBy('created_at', 'DESC')
 *   .execute(pool)
 */
export function select(
  ...args: Array<AllPrefixedColumns | (string & {})>
): UnboundSelectChain & {
  from<T extends AnyTableName>(table: T, alias?: string): TypedQueryChain<T>;
} {
  return _select(...(args as string[])) as unknown as UnboundSelectChain;
}

/** Insert a row into a known EverShop table. `.given()` suggests columns of `T`. */
export function insert<T extends AnyTableName>(table: T): TypedInsertQuery<T> {
  return _insert(table) as unknown as TypedInsertQuery<T>;
}

/** Update rows in a known EverShop table. `.given()` / `.where()` suggest columns of `T`. */
export function update<T extends AnyTableName>(table: T): TypedUpdateQuery<T> {
  return _update(table) as unknown as TypedUpdateQuery<T>;
}

/** Delete rows from a known EverShop table. `.where()` suggests columns of `T`. */
export function del<T extends AnyTableName>(table: T): TypedDeleteQuery<T> {
  return _del(table) as unknown as TypedDeleteQuery<T>;
}

/** Insert or update rows in a known EverShop table on conflict. `.given()` suggests columns of `T`. */
export function insertOnUpdate<T extends AnyTableName>(
  table: T,
  conflictColumns: Array<ColumnOf<T>>
): TypedInsertOnUpdateQuery<T> {
  return _insertOnUpdate(
    table,
    conflictColumns as string[]
  ) as unknown as TypedInsertOnUpdateQuery<T>;
}

// ---- Re-export everything else from postgres-query-builder ---------------------

export {
  node,
  getConnection,
  startTransaction,
  commit,
  rollback,
  release,
  execute,
  sql,
  value,
  SelectQuery,
  UpdateQuery,
  InsertQuery,
  InsertOnUpdateQuery,
  DeleteQuery,
  type SQLValue,
  type Binding,
  type Pool,
  type PoolClient,
  type JoinDefinition
} from '@evershop/postgres-query-builder';
