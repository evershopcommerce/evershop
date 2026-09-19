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

const TEMPLATE = `{{#> emailLayout preheader=(t "Your order #\${number} is on the way." number=order.order_number)}}
<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:700;color:#111114;">{{t "Your order is on the way"}}</h1>
<p style="margin:0 0 18px;font-size:14px;color:#6b7280;">{{t "Order #\${number}" number=order.order_number}} &middot; {{date order.created_at}}</p>
{{#if shipment.tracking_number}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;"><tr><td style="background:#f6f6f7;border-radius:8px;padding:18px 20px;">
{{#if carrierName}}<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">{{t "Carrier"}}: {{carrierName}}</p>{{/if}}
<p style="margin:0;font-size:15px;font-weight:600;color:#111114;">{{t "Tracking"}}: {{shipment.tracking_number}}</p>
</td></tr></table>
{{else}}
<p style="margin:0 0 6px;font-size:14px;color:#6b7280;">{{t "We'll send tracking details as soon as the carrier scans the package."}}</p>
{{/if}}
{{#if items.length}}<p style="margin:22px 0 8px;font-size:13px;font-weight:600;color:#111114;">{{t "Items in this shipment"}}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{{#each items}}<tr><td style="padding:9px 0;border-bottom:1px solid #e7e8ea;font-size:14px;color:#111114;">{{this.product_name}}<span style="color:#6b7280;font-size:13px;"> &middot; {{t "Qty"}} {{this.qty}}</span></td></tr>{{/each}}</table>{{/if}}
{{#if trackingUrl}}{{> button href=trackingUrl label=(t "Track shipment")}}{{else}}{{> button href=trackOrderUrl label=(t "View your order")}}{{/if}}
{{/emailLayout}}`;

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
