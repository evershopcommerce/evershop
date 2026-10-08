import fs from 'fs/promises';
import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { debug, error } from '../../../../lib/log/logger.js';
import {
  buildEmailBodyFromTemplate,
  sendEmail
} from '../../../../lib/mail/emailHelper.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getValue } from '../../../../lib/util/registry.js';
import { EventData } from '../../../../types/event.js';
import { getStoreLanguage } from '../../../setting/services/setting.js';
import { decorateAddressForEmail } from '../../services/addressEmailData.js';
import { signTrackingToken } from '../../services/anonymousTrackingToken.js';
import { resolveThumbnailUrl } from '../../services/thumbnailUrl.js';

export const TEMPLATE = `{{#> emailLayout preheader=(t "Your order #\${number} is confirmed." number=order.order_number)}}
<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:700;color:#111114;">{{t "Your order is confirmed"}}</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">{{t "Order #\${number}" number=order.order_number}} &middot; {{date order.created_at}}</p>
{{> itemsTable}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 6px;">
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">{{t "Subtotal"}}</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#111114;">{{currency order.sub_total}}</td></tr>
{{#if order.discount_amount}}<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">{{t "Discount"}}</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#111114;">-{{currency order.discount_amount}}</td></tr>{{/if}}
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">{{t "Shipping"}}</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#111114;">{{currency order.shipping_fee_incl_tax}}</td></tr>
{{#if order.tax_amount}}<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">{{t "Tax"}}</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#111114;">{{currency order.tax_amount}}</td></tr>{{/if}}
<tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111114;border-top:1px solid #e7e8ea;">{{t "Total"}}</td><td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;color:#111114;border-top:1px solid #e7e8ea;">{{currency order.grand_total}}</td></tr>
</table>
{{#if orderUrl}}{{> button href=orderUrl label=(t "View your order")}}{{/if}}
{{#if shippingAddress}}<p style="margin:24px 0 4px;font-size:13px;font-weight:600;color:#111114;">{{t "Shipping to"}}</p><p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">{{#each shippingAddress.formatted}}{{this}}<br>{{/each}}</p>{{/if}}
{{/emailLayout}}`;

export default async function sendOrderConfirmationEmail(
  data: EventData<'order_placed'>
) {
  try {
    const config = getConfig('system.notification_emails.order_confirmation', {
      enabled: true
    });

    if (config?.enabled === false) {
      return;
    }
    // Build the email data
    const orderId = data.order_id;
    const order = await select()
      .from('order')
      .where('order_id', '=', orderId)
      .load(pool);

    if (!order) {
      return;
    }

    const items = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool);
    // Local storage stores thumbnails as relative paths; remote providers
    // store absolute URLs that must pass through untouched.
    order.items = items.map((item) => {
      if (item.thumbnail) {
        item.thumbnail = resolveThumbnailUrl(item.thumbnail, getBaseUrl());
      }
      return item;
    });
    // Off-request (event subscriber) — resolve the store locale explicitly (D7).
    // It drives the subject, the body's currency/date format and the address
    // lines, and is passed to sendEmail so everything matches.
    const locale = await getStoreLanguage();

    // Addresses travel under the new column names plus `formatted` (the display
    // lines the default template prints — line 2 and the country included) and
    // the derived names (spec § 3.6). `province_name` is gone with the rename.
    const shippingRow = order.shipping_address_id
      ? await select()
          .from('order_address')
          .where('order_address_id', '=', order.shipping_address_id)
          .load(pool)
      : null;
    const shippingAddress = shippingRow
      ? await decorateAddressForEmail(shippingRow, locale)
      : null;

    // Zero-total orders may have no billing address — pass null through so
    // custom templates can `{{#if billingAddress}}` it (the default template
    // does not render billing at all).
    const billingRow = order.billing_address_id
      ? await select()
          .from('order_address')
          .where('order_address_id', '=', order.billing_address_id)
          .load(pool)
      : null;
    const billingAddress = billingRow
      ? await decorateAddressForEmail(billingRow, locale)
      : null;

    let template;
    if (config?.templatePath) {
      const filePath = path.join(CONSTANTS.ROOTPATH, config.templatePath);
      try {
        await fs.access(filePath);
        template = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        debug(
          `Order confirmation email template file not found at path: ${filePath}. Using default template.`
        );
        template = TEMPLATE;
      }
    } else {
      template = TEMPLATE;
    }
    // Anonymous-safe link to the order for the "View your order" button — a
    // signed tracking URL, falling back to the logged-in account page when the
    // token secret is not configured (mirrors the shipment emails).
    let orderUrl: string;
    try {
      const token = signTrackingToken(order.uuid);
      orderUrl = `${getBaseUrl()}/orders/${order.uuid}/track?token=${encodeURIComponent(
        token
      )}`;
    } catch {
      orderUrl = `${getBaseUrl()}/account/orders/${order.uuid}`;
    }
    const dynamicData = await getValue('orderConfirmationEmailData', {
      order,
      shippingAddress,
      billingAddress,
      orderUrl
    });
    const subject = translate('Your order has been confirmed!', {}, locale);
    if (data.customer_email) {
      const args = await getValue(
        'orderConfirmationEmailArguments',
        {
          to: data.customer_email,
          subject,
          template,
          data: dynamicData,
          locale
        },
        { order }
      );
      await sendEmail('order_confirmation', args);
    }
  } catch (e) {
    error(e);
  }
}
