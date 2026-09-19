import fs from 'fs/promises';
import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { sendEmail } from '../../../../lib/mail/emailHelper.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getValue } from '../../../../lib/util/registry.js';
import { EventData } from '../../../../types/event.js';
import { getStoreLanguage } from '../../../setting/services/setting.js';

// Renders into the shared email layout (header/logo + footer) like the other
// transactional emails, so the redesign is consistent across all of them.
// Overridable per store via `system.notification_emails.order_refunded.templatePath`.
const TEMPLATE = `{{#> emailLayout preheader=(t "A refund of \${amount} was issued for order #\${number}." amount=(currency refund.amount) number=order.order_number)}}
<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:700;color:#111114;">{{#if refund.isFullRefund}}{{t "Your order has been refunded"}}{{else}}{{t "A refund has been issued"}}{{/if}}</h1>
<p style="margin:0 0 18px;font-size:14px;color:#6b7280;">{{t "Order #\${number}" number=order.order_number}}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.62;color:#111114;">{{t "We've refunded \${amount} to your original payment method. Depending on your bank, it may take a few business days to appear on your statement." amount=(currency refund.amount)}}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;">
<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">{{t "Order number"}}</td><td style="padding:6px 0;font-size:14px;text-align:right;color:#111114;">#{{order.order_number}}</td></tr>
<tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111114;border-top:1px solid #e7e8ea;">{{t "Refund amount"}}</td><td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;color:#111114;border-top:1px solid #e7e8ea;">{{currency refund.amount}}</td></tr>
</table>
{{/emailLayout}}`;

/**
 * Emails the customer when their payment is refunded (full or partial). Fires on
 * every refund, whatever the payment method or trigger — admin action or gateway
 * webhook — because they all converge on `recordRefund`, which emits
 * `order_refunded`.
 */
export default async function sendRefundEmail(
  data: EventData<'order_refunded'>
) {
  try {
    const config = getConfig('system.notification_emails.order_refunded', {
      enabled: true
    });
    if (config?.enabled === false) {
      return;
    }

    const order = await select()
      .from('order')
      .where('order_id', '=', data.orderId)
      .load(pool);
    if (!order || !order.customer_email) {
      return;
    }

    let template = TEMPLATE;
    if (config?.templatePath) {
      const filePath = path.join(CONSTANTS.ROOTPATH, config.templatePath);
      try {
        await fs.access(filePath);
        template = await fs.readFile(filePath, 'utf8');
      } catch {
        debug(
          `Refund email template not found at ${filePath}. Using default template.`
        );
      }
    }

    const dynamicData = await getValue('orderRefundedEmailData', {
      order,
      refund: {
        amount: data.amount,
        currency: data.currency,
        isFullRefund: data.isFullRefund,
        transactionId: data.transactionId
      }
    });
    // Off-request subscriber (D7): resolve the store locale explicitly and pass
    // it so the subject and the body's currency helper agree.
    const locale = await getStoreLanguage();
    const subject = translate(
      data.isFullRefund
        ? 'Your order has been refunded'
        : 'A refund has been issued for your order',
      {},
      locale
    );
    const args = await getValue(
      'orderRefundedEmailArguments',
      {
        to: order.customer_email,
        subject,
        template,
        data: dynamicData,
        locale
      },
      { order }
    );
    await sendEmail('order_refunded', args);
  } catch (e) {
    error(e);
  }
}
