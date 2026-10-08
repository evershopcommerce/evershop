import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { translate } from '../../../lib/locale/translate/translate.js';
import { debug } from '../../../lib/log/logger.js';
import {
  buildEmailBodyFromTemplate,
  sendEmail
} from '../../../lib/mail/emailHelper.js';
import { buildAbsoluteUrl } from '../../../lib/router/buildAbsoluteUrl.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getValue } from '../../../lib/util/registry.js';
import { getStoreLanguage } from '../../setting/services/setting.js';

const TEMPLATE = `{{#> emailLayout preheader=(t "Reset your \${store} password." store=storeInfo.storeName)}}
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:#111114;">{{t "Reset your password"}}</h1>
<p style="margin:0 0 16px;">{{t "We received a request to reset the password for your \${store} account. Choose a new one below." store=storeInfo.storeName}}</p>
{{> button href=resetPasswordUrl label=(t "Reset password")}}
<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">{{t "If you didn't request this, you can safely ignore this email — your password won't change."}}</p>
{{/emailLayout}}`;

export async function sendResetPasswordEmail(email, existingCustomer, token) {
  // Triggered from an /api route, which the locale middleware skips — no ALS locale (D7).
  // Resolve the store default explicitly.
  const locale = await getStoreLanguage();
  const subject = translate('Reset your password', {}, locale);
  const url = buildAbsoluteUrl('resetPasswordPage');
  const resetPasswordUrl = `${url}?token=${token}`;
  let template = '';
  const config = getConfig('system.notification_emails.reset_password');
  // Check if templatePath is set in config and the file is exists. It should be relative to the project root
  if (config?.templatePath) {
    const filePath = path.join(CONSTANTS.ROOTPATH, config.templatePath);
    try {
      await fs.access(filePath);
      template = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      debug(
        `Reset password email template file not found at path: ${filePath}. Using default template.`
      );
      template = TEMPLATE;
    }
  } else {
    template = TEMPLATE;
  }
  const dynamicData = await getValue('resetPasswordEmailData', {
    token,
    resetPasswordUrl,
    customer: existingCustomer
  });
  const args = await getValue(
    'resetPasswordEmailArguments',
    {
      to: email,
      subject,
      template,
      data: dynamicData,
      locale
    },
    { customer: existingCustomer, token }
  );
  await sendEmail('reset_password', args);
}
