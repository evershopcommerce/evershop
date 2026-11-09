// What the checkout (04) and order (05) specs need before anyone can buy, made
// through the admin REST API: COD enabled, a US shipping zone with a flat-rate
// method, products. Plus a fast guest COD order through the storefront REST
// API, for specs that need an order but do not test the checkout UI (04 does).
//
// Everything is created with unique names, so it works on an empty fresh store,
// on an upgraded store that already has zones and products, and on re-runs.
//
// API budget: the store allows 120 /api requests a minute per IP, for the
// whole suite (the browser's included), and these specs run in seconds. So
// the set-up is made once per store and reused (see checkoutWorld), and
// helpers make as few calls as they can.
import fs from 'node:fs';
import path from 'node:path';
import {
  request as playwrightRequest,
  type APIRequestContext
} from '@playwright/test';
import { adminStateFile, releaseStore, stateDir, unique } from './store';

/** A US address the Address Format Registry accepts (city, state, ZIP). */
export const US_ADDRESS = {
  recipient: 'Jane Release',
  telephone: '+1 650 253 0000',
  address_line_1: '1600 Amphitheatre Pkwy',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  /** How the storefront shows `administrative_area`. */
  regionName: 'California',
  postal_code: '94043',
  country: 'US'
} as const;

export const FLAT_RATE = 7.5;
export const COD_NAME = 'Cash On Delivery';

export interface CheckoutWorld {
  /** Core shipping method uuid: the `method_code` of the Core provider. */
  methodUuid: string;
  methodName: string;
  packageId: number;
  /** A product with a large stock, for tests that do not count stock. */
  product: TestProduct;
}

export const SHARED_PRICE = 40;

export interface TestProduct {
  id: number;
  uuid: string;
  sku: string;
  name: string;
  price: number;
}

export interface PlacedOrder {
  uuid: string;
  orderNumber: string;
  email: string;
  grandTotal: number;
}

/** An API client signed in as the admin (the session admin.setup.ts saved).
 *  The caller disposes it. */
export async function adminApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: releaseStore().baseUrl,
    storageState: adminStateFile()
  });
}

/** Run `fn` with an admin API client and dispose it after. */
export async function withAdminApi<T>(
  fn: (api: APIRequestContext) => Promise<T>
): Promise<T> {
  const api = await adminApi();
  try {
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

/** One REST call; throws with the store's message on any error answer. */
export async function call<T = any>(
  api: APIRequestContext,
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const res = await api.fetch(url, { method, data });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON: reported below
  }
  if (!res.ok() || json?.error) {
    throw new Error(
      `${method} ${url} answered ${res.status()}: ${String(
        json?.error?.message ?? text
      ).slice(0, 300)}`
    );
  }
  return (json?.data ?? json) as T;
}

/**
 * Cash on Delivery on, plus a US zone with its own flat-rate Core method, a
 * package and a product. Zones may overlap (a store offers the union of their
 * methods), so a store that already ships to the US keeps its methods and
 * gains this one.
 *
 * The zone, method, package and product are made once per store database and
 * kept in the run's output folder: a worker restarted after a failed test, the
 * other spec file and a --specs-only re-run reuse them instead of spending the
 * API budget again. Whichever spec runs first makes them, so no spec depends
 * on another one having run. COD is turned on every time (another spec may
 * have turned it off).
 */
export async function checkoutWorld(
  api: APIRequestContext
): Promise<CheckoutWorld> {
  await call(api, 'POST', '/api/settings', {
    codPaymentStatus: 1,
    codDisplayName: COD_NAME
  });
  const file = path.join(
    stateDir(),
    `.checkout-world-${releaseStore().database}.json`
  );
  if (fs.existsSync(file))
    return JSON.parse(fs.readFileSync(file, 'utf8')) as CheckoutWorld;

  const tag = unique('rc');
  const zone = await call(api, 'POST', '/api/shippingZones', {
    name: `Release check US ${tag}`,
    countries: ['US']
  });
  const methodName = `Release flat ${tag}`;
  const method = await call(
    api,
    'POST',
    '/api/shippingProviders/core/methods',
    { name: methodName, is_enabled: true }
  );
  await call(api, 'POST', '/api/shippingProviders/core/rates', {
    method_id: method.uuid,
    zone_id: zone.uuid,
    is_enabled: true,
    cost: FLAT_RATE
  });
  // A shippable product needs a package (parcel size).
  const pkg = await call(api, 'POST', '/api/packages', {
    name: `Release box ${tag}`,
    length: 20,
    width: 15,
    height: 10
  });
  const base = {
    methodUuid: method.uuid,
    methodName,
    packageId: pkg.package_id
  };
  const product = await createProduct(api, base, {
    price: SHARED_PRICE,
    qty: 100000,
    label: 'Shared'
  });
  const world: CheckoutWorld = { ...base, product };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(world, null, 2)}\n`);
  return world;
}

/** A simple, visible, in-stock product that manages its stock. */
export async function createProduct(
  api: APIRequestContext,
  world: Pick<CheckoutWorld, 'packageId'>,
  {
    price = 40,
    qty = 100,
    label = 'Product'
  }: { price?: number; qty?: number; label?: string } = {}
): Promise<TestProduct> {
  const tag = unique('rc');
  const name = `Release ${label} ${tag}`;
  const product = await call(api, 'POST', '/api/products', {
    name,
    sku: tag.toUpperCase(),
    url_key: `release-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${tag}`,
    price,
    qty,
    weight: 1,
    status: 1,
    visibility: 1,
    manage_stock: 1,
    stock_availability: 1,
    group_id: 1,
    package_id: world.packageId,
    description: []
  });
  return {
    id: product.product_id,
    uuid: product.uuid,
    sku: product.sku,
    name,
    price
  };
}

/** Admin GraphQL. */
export async function adminGraphql<T = any>(
  api: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await api.post('/api/admin/graphql', {
    data: { query, variables }
  });
  const json = await res.json();
  if (!res.ok() || json.errors)
    throw new Error(
      `admin GraphQL answered ${res.status()}: ${JSON.stringify(
        json.errors ?? json
      ).slice(0, 300)}`
    );
  return json.data as T;
}

export async function stockOf(
  api: APIRequestContext,
  productId: number
): Promise<number> {
  const data = await adminGraphql(
    api,
    'query Stock($id: ID) { product(id: $id) { inventory { qty } } }',
    { id: productId }
  );
  return data.product.inventory.qty;
}

export interface AdminOrderView {
  orderNumber: string;
  coupon: string | null;
  customerEmail: string;
  discountAmount: { value: number };
  grandTotal: { value: number };
  status: { code: string };
  paymentStatus: { code: string };
  shipmentStatus: { code: string };
  items: { productSku: string; qty: number }[];
}

const ORDER_FIELDS = `orderNumber coupon customerEmail
  discountAmount { value } grandTotal { value }
  status { code } paymentStatus { code } shipmentStatus { code }
  items { productSku qty }`;

export async function adminOrder(
  api: APIRequestContext,
  uuid: string
): Promise<AdminOrderView> {
  const data = await adminGraphql(
    api,
    `query Order($uuid: String!) { order(uuid: $uuid) { ${ORDER_FIELDS} } }`,
    { uuid }
  );
  return data.order;
}

/** An order and a product's stock in one request. */
export async function adminOrderAndStock(
  api: APIRequestContext,
  uuid: string,
  productId: number
): Promise<{ order: AdminOrderView; stock: number }> {
  const data = await adminGraphql(
    api,
    `query OrderStock($uuid: String!, $id: ID) {
      order(uuid: $uuid) { ${ORDER_FIELDS} }
      product(id: $id) { inventory { qty } }
    }`,
    { uuid, id: productId }
  );
  return { order: data.order, stock: data.product.inventory.qty };
}

/**
 * A guest COD order through the storefront REST API, in its own browser-less
 * session, shipped to US_ADDRESS with the world's flat-rate method.
 *
 * It goes the way the storefront does, around two core bugs (see the
 * release-check report):
 *   - it opens a page first, for the storefront session cookie: API routes do
 *     not start a session, and `POST /api/cart/mine/items` without that cookie
 *     puts every such caller's items in ONE shared cart (`sid = ''`);
 *   - it reads the cart's id back through GraphQL `myCart`: the `cartId` that
 *     `POST /api/carts` and `POST /api/cart/mine/items` answer for a NEW cart
 *     has no dashes, and every `/api/carts/:cart_id/...` route refuses it with
 *     404 "Invalid cart".
 */
export async function placeCodOrder(
  world: Pick<CheckoutWorld, 'methodUuid'>,
  items: { product: TestProduct; qty: number }[],
  email: string = `${unique('guest')}@release-check.test`
): Promise<PlacedOrder> {
  const api = await playwrightRequest.newContext({
    baseURL: releaseStore().baseUrl
  });
  try {
    const page = await api.get('/cart');
    if (!page.ok()) throw new Error(`GET /cart answered ${page.status()}`);
    for (const { product, qty } of items) {
      await call(api, 'POST', '/api/cart/mine/items', {
        sku: product.sku,
        qty
      });
    }
    const gql = await api.post('/api/graphql', {
      data: { query: '{ myCart { uuid totalQty } }' }
    });
    const myCart = (await gql.json())?.data?.myCart;
    const wanted = items.reduce((n, i) => n + i.qty, 0);
    if (!myCart?.uuid || myCart.totalQty !== wanted) {
      throw new Error(
        `GraphQL myCart after adding ${wanted} units: ${JSON.stringify(myCart)}`
      );
    }
    const cartId: string = myCart.uuid;
    const order = await call(
      api,
      'POST',
      `/api/carts/${cartId}/checkout`,
      checkoutPayload(world, cartId, email)
    );
    return {
      uuid: order.uuid,
      orderNumber: String(order.order_number),
      email,
      grandTotal: Number(order.grand_total)
    };
  } finally {
    await api.dispose();
  }
}

/**
 * The body of `POST /api/carts/:cart_id/checkout` that places a guest COD
 * order to US_ADDRESS in one call: the checkout service takes the contact,
 * both addresses, the shipping and the payment method itself (each also has
 * its own route). `customer.email` is required: the route reads it unguarded.
 */
export function checkoutPayload(
  world: Pick<CheckoutWorld, 'methodUuid'>,
  cartId: string,
  email: string
) {
  const address = {
    recipient: US_ADDRESS.recipient,
    telephone: US_ADDRESS.telephone,
    address_line_1: US_ADDRESS.address_line_1,
    locality: US_ADDRESS.locality,
    administrative_area: US_ADDRESS.administrative_area,
    postal_code: US_ADDRESS.postal_code,
    country: US_ADDRESS.country
  };
  return {
    cart_id: cartId,
    customer: { email },
    shippingAddress: address,
    billingAddress: address,
    shippingMethod: world.methodUuid,
    shippingProvider: 'core',
    paymentMethod: 'cod'
  };
}

/** Escape a string for use inside a RegExp. */
export function re(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}
