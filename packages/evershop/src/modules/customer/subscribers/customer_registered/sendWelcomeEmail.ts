import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { debug, error } from '../../../../lib/log/logger.js';
import {
  buildEmailBodyFromTemplate,
  sendEmail
} from '../../../../lib/mail/emailHelper.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getValue } from '../../../../lib/util/registry.js';
import { EventData } from '../../../../types/event.js';
import { getStoreLanguage } from '../../../setting/services/setting.js';

const TEMPLATE = `{{#> emailLayout preheader=(t "Welcome to \${store}." store=storeInfo.storeName)}}
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:#111114;">{{t "Welcome, \${name}." name=customer.full_name}}</h1>
<p style="margin:0 0 16px;">{{t "Thanks for creating an account with \${store}. Your cart, orders, and saved addresses now live in one place." store=storeInfo.storeName}}</p>
{{> button href=storeInfo.homeUrl label=(t "Start shopping")}}
{{/emailLayout}}`;
export default async function sendCustomerWelcomeEmail(
  data: EventData<'customer_registered'>
) {
  try {
    const email = data.email;
    // Off-request (event subscriber) — resolve the store locale explicitly (D7).
    const locale = await getStoreLanguage();
    const subject = translate('Welcome to our store!', {}, locale);
    const config = getConfig('system.notification_emails.customer_welcome', {
      enabled: true
    });
    if (config?.enabled === false) {
      return;
    }
    let template;
    if (config?.templatePath) {
      const filePath = path.join(CONSTANTS.ROOTPATH, config.templatePath);
      try {
        await fs.access(filePath);
        template = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        debug(
          `Customer welcome email template file not found at path: ${filePath}. Using default template.`
        );
        template = TEMPLATE;
      }
    } else {
      template = TEMPLATE;
    }
    const dynamicData = await getValue('customerWelcomeEmailData', {
      customer: data
    });
    const args = await getValue(
      'customerWelcomeEmailArguments',
      {
        to: email,
        subject,
        template,
        data: dynamicData,
        locale
      },
      { customer: data }
    );
    await sendEmail('customer_welcome', args);
  } catch (e) {
    error(e);
  }
}
