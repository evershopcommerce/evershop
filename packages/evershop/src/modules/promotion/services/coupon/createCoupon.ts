import {
  commit,
  insert,
  PoolClient,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import type { CouponRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import couponDataSchema from './couponDataSchema.json' with { type: 'json' };

type ProductCondition = {
  key: string;
  operator: 'IN' | 'NOT IN' | '=' | '!=' | '>' | '>=' | '<' | '<=';
  value: string | number | Array<string | number | boolean | null | object>;
};

type RequiredProduct = {
  key: string;
  operator: 'IN' | 'NOT IN' | '=' | '!=' | '>' | '>=' | '<' | '<=';
  qty?: string | number;
  value: string | number | Array<string | number | boolean | null | object>;
};

export type CouponData = {
  coupon: string;
  status: '0' | '1' | 0 | 1;
  discount_amount: string | number;
  discount_type: string;
  description?: string;
  free_shipping?: '0' | '1' | 0 | 1 | boolean;
  target_products?: {
    maxQty?: string | number;
    products?: ProductCondition[];
  };
  condition?: {
    order_total?: string | number;
    order_qty?: string | number;
    required_products?: RequiredProduct[];
  };
  user_condition?: {
    groups?: Array<string | number>;
    emails?: string[];
    purchased?: number;
  };
  max_uses_time_per_coupon?: string;
  max_uses_time_per_customer?: string;
  start_date?: string | null;
  end_date?: string | null;
  [key: string]: unknown;
};

function validateCouponDataBeforeInsert(data: CouponData): CouponData {
  const ajv = getAjv();
  (couponDataSchema as any).required = [
    'coupon',
    'status',
    'discount_amount',
    'discount_type'
  ];
  const jsonSchema = getValueSync(
    'createCouponDataJsonSchema',
    couponDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertCouponData(data: CouponData, connection: PoolClient): Promise<CouponRow> {
  const coupon = await insert('coupon').given(data).execute(connection);
  return coupon;
}

/**
 * Create coupon service. This service will create a coupon with all related data
 * @param {CouponData} data
 * @param {Record<string, any>} context
 */
async function createCoupon(data: CouponData, context: Record<string, any>): Promise<CouponRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const couponData = await getValue('couponDataBeforeCreate', data);
    // Validate coupon data
    validateCouponDataBeforeInsert(couponData);

    // Insert coupon data
    const coupon = await hookable(insertCouponData, { ...context, connection })(
      couponData,
      connection
    );
    await commit(connection);
    return coupon;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (data: CouponData, context: Record<string, any> = {}): Promise<CouponRow> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(createCoupon, context)(data, context);
  return coupon;
};

export function hookBeforeInsertCouponData(
  callback: (data: CouponData, connection: PoolClient) => Promise<void>,
  priority?: number
): void {
  hookBefore('insertCouponData', callback, priority);
}

export function hookAfterInsertCouponData(
  callback: (data: CouponData, connection: PoolClient) => Promise<void>,
  priority?: number
): void {
  hookAfter('insertCouponData', callback, priority);
}

export function hookBeforeCreateCoupon(
  callback: (data: CouponData, context: Record<string, any>) => Promise<void>,
  priority?: number
): void {
  hookBefore('createCoupon', callback, priority);
}

export function hookAfterCreateCoupon(
  callback: (data: CouponData, context: Record<string, any>) => Promise<void>,
  priority?: number
): void {
  hookAfter('createCoupon', callback, priority);
}
