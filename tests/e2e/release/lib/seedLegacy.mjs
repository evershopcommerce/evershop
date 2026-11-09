// Store data made by the PREVIOUS release, before the upgrade, through that
// release's own REST API (the code a real store ran), so the rows carry the
// old version's shape and its triggers' side effects. The upgrade checks
// (specs/upgrade.check.ts) read the result back from legacy.json.
//
// Works for 2.2.x (old address columns) and 2.3.x (Address Format Registry).

const ADDRESS = {
  name: 'Jane Legacy',
  telephone: '+1 650 253 0000',
  line1: '1600 Amphitheatre Pkwy',
  city: 'Mountain View',
  region: 'US-CA',
  postcode: '94043',
  country: 'US'
};

function addressPayload(version) {
  const [major, minor] = version.split('.').map(Number);
  const before23 = major < 2 || (major === 2 && minor < 3);
  return before23
    ? {
        full_name: ADDRESS.name,
        telephone: ADDRESS.telephone,
        address_1: ADDRESS.line1,
        city: ADDRESS.city,
        province: ADDRESS.region,
        country: ADDRESS.country,
        postcode: ADDRESS.postcode
      }
    : {
        recipient: ADDRESS.name,
        telephone: ADDRESS.telephone,
        address_line_1: ADDRESS.line1,
        locality: ADDRESS.city,
        administrative_area: ADDRESS.region,
        country: ADDRESS.country,
        postal_code: ADDRESS.postcode
      };
}

/** A tiny fetch client that keeps cookies, like a browser session. */
function client(baseUrl) {
  const jar = new Map();
  return async function call(method, url, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jar.size)
      headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(baseUrl + url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual'
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (res.status >= 400 || json?.error) {
      throw new Error(
        `${method} ${url} → ${res.status}: ${(
          json?.error?.message || text
        ).slice(0, 300)}`
      );
    }
    return json?.data ?? json;
  };
}

async function placeCodOrder(
  call,
  { sku, qty, email, fullName, version, methodUuid, fromMine }
) {
  let cartId;
  if (fromMine) {
    const added = await call('POST', '/api/cart/mine/items', { sku, qty });
    cartId = added.cartId || added.cart_id || added.uuid;
  } else {
    const cart = await call('POST', '/api/carts', {
      customer_email: email,
      customer_full_name: fullName,
      items: [{ sku, qty }]
    });
    cartId = cart.uuid || cart.cartId || cart.cart_id;
  }
  if (!cartId) throw new Error('the old store did not return a cart id');
  await call('POST', `/api/carts/${cartId}/contacts`, { email });
  const address = addressPayload(version);
  await call('POST', `/api/carts/${cartId}/addresses`, {
    type: 'shipping',
    address
  });
  await call('POST', `/api/carts/${cartId}/addresses`, {
    type: 'billing',
    address
  });
  await call('POST', `/api/carts/${cartId}/shippingMethods`, {
    provider_code: 'core',
    method_code: methodUuid
  });
  await call('POST', `/api/carts/${cartId}/paymentMethods`, {
    method_code: 'cod',
    method_name: 'Cash On Delivery'
  });
  // POST /api/orders turns the filled cart into an order, as the storefront
  // checkout does (the /checkout route wants the whole checkout in its body).
  const placed = await call('POST', '/api/orders', { cart_id: cartId });
  const order = placed.order || placed;
  return {
    uuid: order.uuid,
    order_number: order.order_number ?? order.orderNumber,
    grand_total: order.grand_total ?? order.grandTotal,
    email
  };
}

export async function seedLegacyStore({ baseUrl, admin, version }) {
  const tag = `legacy${Date.now().toString(36)}`;
  const adminCall = client(baseUrl);
  await adminCall('POST', '/admin/user/login', {
    email: admin.email,
    password: admin.password
  });

  const storeName = `Legacy Store ${tag}`;
  await adminCall('POST', '/api/settings', {
    storeName,
    codPaymentStatus: 1,
    codDisplayName: 'Cash On Delivery'
  });

  const category = await adminCall('POST', '/api/categories', {
    name: `Legacy Category ${tag}`,
    url_key: `legacy-category-${tag}`,
    status: 1,
    include_in_nav: 1,
    description: []
  });

  // A fresh store has no package, and a shippable product needs one.
  const pkg = await adminCall('POST', '/api/packages', {
    name: `Legacy Box ${tag}`,
    length: 20,
    width: 15,
    height: 10,
    weight: 0.2,
    is_default: true
  });

  const product = await adminCall('POST', '/api/products', {
    name: `Legacy Product ${tag}`,
    sku: `LEGACY-${tag}`.toUpperCase(),
    url_key: `legacy-product-${tag}`,
    price: 49.5,
    qty: 100,
    weight: 1,
    status: 1,
    visibility: 1,
    manage_stock: 1,
    stock_availability: 1,
    group_id: 1,
    category_id: category.category_id,
    package_id: pkg.package_id ?? pkg.id,
    description: []
  });

  const zone = await adminCall('POST', '/api/shippingZones', {
    name: `Legacy US ${tag}`,
    countries: ['US']
  });
  const zoneId = zone.uuid || zone.shipping_zone_id || zone.id;
  // The core shipping provider is attached to a new zone automatically.
  const method = await adminCall(
    'POST',
    '/api/shippingProviders/core/methods',
    { name: `Legacy Flat ${tag}`, is_enabled: true }
  );
  await adminCall('POST', '/api/shippingProviders/core/rates', {
    method_id: String(method.uuid || method.id),
    zone_id: String(zoneId),
    is_enabled: true,
    cost: 5
  });
  const methodUuid = method.uuid;

  // A registered customer with a password, and one order of theirs.
  const customer = {
    email: `${tag}@release-check.test`,
    password: 'Legacy2026pass',
    full_name: 'Legacy Customer'
  };
  const shopper = client(baseUrl);
  await shopper('POST', '/api/customers', customer);
  await shopper('POST', '/customer/login', {
    email: customer.email,
    password: customer.password
  });
  const customerOrder = await placeCodOrder(shopper, {
    sku: product.sku,
    qty: 2,
    email: customer.email,
    fullName: customer.full_name,
    version,
    methodUuid,
    fromMine: true
  });

  // A guest order.
  const guest = client(baseUrl);
  const guestOrder = await placeCodOrder(guest, {
    sku: product.sku,
    qty: 1,
    email: `guest-${tag}@release-check.test`,
    fullName: 'Legacy Guest',
    version,
    methodUuid,
    fromMine: false
  });

  return {
    version,
    tag,
    storeName,
    category: {
      name: category.name,
      url_key: category.url_key,
      uuid: category.uuid
    },
    product: {
      name: product.name,
      sku: product.sku,
      url_key: product.url_key,
      uuid: product.uuid,
      price: 49.5
    },
    customer,
    address: ADDRESS,
    orders: { customer: customerOrder, guest: guestOrder },
    summary: `category, product, customer, 2 COD orders (#${customerOrder.order_number}, #${guestOrder.order_number})`
  };
}
