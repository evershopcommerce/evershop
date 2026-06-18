import fs from 'fs/promises';
import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { sendEmail } from '../../../../lib/mail/emailHelper.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getValue } from '../../../../lib/util/registry.js';
import { EventData } from '../../../../types/event.js';
import { getStoreLanguage } from '../../../setting/services/setting.js';
import { signTrackingToken } from '../../services/anonymousTrackingToken.js';
import { getCarrier } from '../../services/carrier/registry.js';

const TEMPLATE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;margin:0;padding:0;">
<table align="center" width="100%" style="max-width:600px;margin:10px auto;border:1px solid #e5e5e5;" role="presentation">
<tr><td style="padding:40px 40px 0;text-align:center;">
{{#if storeInfo.logo}}<img alt="{{storeInfo.logo.alt}}" src="{{storeInfo.logo.src}}" height="{{storeInfo.logo.height}}" width="{{storeInfo.logo.width}}" style="display:inline-block;outline:none;border:none;"/>{{/if}}
<h1 style="font-size:28px;line-height:1.3;font-weight:700;margin:24px 0 8px;letter-spacing:-0.5px;">Your order is on the way</h1>
<p style="font-size:14px;color:#6f6f6f;margin:0 0 24px;">Order #{{order.order_number}} &middot; {{date order.created_at}}</p>
</td></tr>
<tr><td style="padding:0 40px 24px;">
<h2 style="font-size:16px;font-weight:600;margin:0 0 12px;">Items in this shipment</h2>
<table width="100%" role="presentation">
<tbody>
{{#each items}}
<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;">
<p style="font-size:14px;margin:0;font-weight:500;">{{this.product_name}}</p>
<p style="font-size:13px;color:#6f6f6f;margin:4px 0 0;">Qty {{this.qty}}</p>
</td></tr>
{{/each}}
</tbody></table>
</td></tr>
<tr><td style="padding:0 40px 24px;">
{{#if trackingUrl}}
<table width="100%" role="presentation"><tr><td style="background:#f7f7f7;border-radius:6px;padding:20px;text-align:center;">
<p style="font-size:13px;color:#6f6f6f;margin:0 0 8px;">Carrier: {{carrierName}}</p>
<p style="font-size:15px;font-weight:600;margin:0 0 16px;">Tracking #: {{shipment.tracking_number}}</p>
<a href="{{trackingUrl}}" style="display:inline-block;background:#111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:6px;">Track shipment &rarr;</a>
</td></tr></table>
{{else}}
{{#if shipment.tracking_number}}
<table width="100%" role="presentation"><tr><td style="background:#f7f7f7;border-radius:6px;padding:20px;text-align:center;">
<p style="font-size:13px;color:#6f6f6f;margin:0 0 8px;">Carrier: {{carrierName}}</p>
<p style="font-size:15px;font-weight:600;margin:0;">Tracking #: {{shipment.tracking_number}}</p>
</td></tr></table>
{{else}}
<p style="font-size:13px;color:#6f6f6f;text-align:center;margin:0;">We&apos;ll send tracking details as soon as the carrier scans the package.</p>
{{/if}}
{{/if}}
</td></tr>
<tr><td style="padding:0 40px 32px;text-align:center;">
<a href="{{trackOrderUrl}}" style="display:inline-block;color:#111;font-size:14px;font-weight:500;text-decoration:underline;">View order details</a>
</td></tr>
<tr><td style="padding:18px 40px;border-top:1px solid #e5e5e5;text-align:center;">
<p style="font-size:12px;color:#afafaf;margin:0;">{{storeInfo.storeName}}{{#if storeInfo.address.street}} &middot; {{storeInfo.address.street}}, {{storeInfo.address.city}}{{/if}}</p>
</td></tr>
</table></body></html>`;

export default async function sendShipmentCreatedEmail(
  data: EventData<'shipment_created'>
) {
  try {
    if (data.notifyCustomer === false) return;

    const config = getConfig('system.notification_emails.shipment_created', {
      enabled: true
    });
    if (config?.enabled === false) return;

    const shipment = await select()
      .from('shipment')
      .where('shipment_id', '=', data.shipmentId)
      .load(pool);
    if (!shipment) return;

    const order = await select()
      .from('order')
      .where('order_id', '=', shipment.shipment_order_id)
      .load(pool);
    if (!order || !order.customer_email) return;

    const shipmentItems = await select()
      .from('shipment_item')
      .where('shipment_id', '=', shipment.shipment_id)
      .execute(pool);
    if (shipmentItems.length === 0) return;

    const orderItems = await select()
      .from('order_item')
      .where(
        'order_item_id',
        'IN',
        shipmentItems.map((i) => i.order_item_id)
      )
      .execute(pool);
    const oiByid = new Map(orderItems.map((oi) => [oi.order_item_id, oi]));
    const items = shipmentItems.map((si) => {
      const oi = oiByid.get(si.order_item_id);
      return {
        qty: si.qty,
        product_name: oi?.product_name ?? '',
        product_sku: oi?.product_sku ?? ''
      };
    });

    const carrierObj = getCarrier(shipment.carrier);
    const carrierName = carrierObj?.name ?? shipment.carrier ?? null;
    // Persisted carrier URL wins; aggregators populate `shipment.tracking_url`
    // from `LabelResult.trackingUrl` because they can't compose URLs at
    // resolve time. Falls back to `generateTrackingUrl(ctx)` for
    // single-carrier extensions that don't return a URL at purchase.
    const trackingUrl =
      shipment.tracking_url ??
      (carrierObj?.generateTrackingUrl && shipment.tracking_number
        ? carrierObj.generateTrackingUrl({
            trackingNumber: shipment.tracking_number,
            carrierShipmentId: shipment.carrier_shipment_id ?? undefined,
            metadata: shipment.carrier_metadata ?? undefined
          })
        : null);

    let trackOrderUrl: string;
    try {
      const token = signTrackingToken(order.uuid);
      trackOrderUrl = `${getBaseUrl()}/orders/${order.uuid}/track?token=${encodeURIComponent(token)}`;
    } catch (e) {
      debug(
        'Anonymous tracking token secret is not configured — falling back to logged-in account URL.'
      );
      trackOrderUrl = `${getBaseUrl()}/account/orders/${order.uuid}`;
    }

    let template;
    if (config?.templatePath) {
      const filePath = path.join(CONSTANTS.ROOTPATH, config.templatePath);
      try {
        await fs.access(filePath);
        template = await fs.readFile(filePath, 'utf8');
      } catch {
        debug(
          `Shipment created email template not found at ${filePath}. Using default.`
        );
        template = TEMPLATE;
      }
    } else {
      template = TEMPLATE;
    }

    const dynamicData = await getValue('shipmentCreatedEmailData', {
      order,
      shipment,
      items,
      carrierName,
      trackingUrl,
      trackOrderUrl
    });
    // Off-request (event subscriber) — resolve the store locale explicitly (D7).
    const locale = await getStoreLanguage();
    const subject = translate(
      'Your order #${number} is on the way',
      {
        number: String(order.order_number)
      },
      locale
    );
    const args = await getValue(
      'shipmentCreatedEmailArguments',
      {
        to: order.customer_email,
        subject,
        template,
        data: dynamicData,
        locale
      },
      { order, shipment }
    );
    await sendEmail('shipment_created', args);
  } catch (e) {
    error(e);
  }
}
