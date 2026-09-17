import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { debug } from '../../../../lib/log/logger.js';
import {
  getEmailService,
  sendEmail
} from '../../../../lib/mail/emailHelper.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getValue } from '../../../../lib/util/registry.js';
import {
  getStoreEmail,
  getStoreLanguage
} from '../../../setting/services/setting.js';

/**
 * Notification sent to the store when a visitor submits the contact form.
 *
 * `{{t}}` keys are the English source strings, so the copy localizes through
 * the normal `translations/<locale>/*.csv` dictionaries like every other email.
 * The visitor's address is rendered in the body as well as set on `replyTo`,
 * because `replyTo` is only honored if the registered email service forwards it
 * — the body copy is the fallback that always works.
 */
const TEMPLATE = `{{#> emailLayout preheader=(t "New message from \${name} via your contact form." name=submission.name)}}
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:#111114;">{{t "New contact form message"}}</h1>
<p style="margin:0 0 16px;">{{t "Someone sent a message through the contact form on your store."}}</p>
{{> divider}}
<p style="margin:0 0 6px;"><strong>{{t "From"}}:</strong> {{submission.name}}</p>
<p style="margin:0 0 6px;"><strong>{{t "Email"}}:</strong> <a href="mailto:{{submission.email}}" style="color:#111114;">{{submission.email}}</a></p>
{{#if submission.phone}}<p style="margin:0 0 6px;"><strong>{{t "Phone"}}:</strong> {{submission.phone}}</p>{{/if}}
{{#if submission.subject}}<p style="margin:0 0 6px;"><strong>{{t "Subject"}}:</strong> {{submission.subject}}</p>{{/if}}
{{> divider}}
<p style="margin:0 0 6px;white-space:pre-wrap;">{{submission.message}}</p>
<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">{{t "Reply directly to this email to respond to \${name}." name=submission.name}}</p>
{{/emailLayout}}`;

export interface ContactFormEmailInput {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}

/**
 * Attempts the store notification. Returns a result rather than throwing on the
 * two "not configured" conditions, so the caller can record WHY nothing was
 * sent without treating it as a failure. A genuine transport error still
 * throws — the caller catches it and stores the message.
 */
export async function sendContactFormEmail(
  submission: ContactFormEmailInput
): Promise<{ sent: boolean; reason?: string }> {
  const config = getConfig('system.notification_emails.contact_form', {
    enabled: true
  });
  if (config?.enabled === false) {
    return {
      sent: false,
      reason: 'The contact_form email is disabled by config'
    };
  }

  // No delivery mechanism registered — core ships no SMTP, an extension must
  // call registerEmailService() from bootstrap.
  if (!getEmailService()) {
    return { sent: false, reason: 'No email service registered' };
  }

  // The recipient is ALWAYS the store email setting, never anything the client
  // sent — otherwise the public endpoint would be an open relay.
  const to = await getStoreEmail();
  if (!to) {
    return { sent: false, reason: 'Store email is not set' };
  }

  // Called from an /api route, which the locale middleware skips — no ALS
  // locale (D7). Resolve the store default explicitly, same as the other
  // in-request sender (sendResetPasswordEmail).
  const locale = await getStoreLanguage();
  const subject = translate(
    'New contact form message from ${name}',
    { name: submission.name },
    locale
  );

  let template = TEMPLATE;
  if (config?.templatePath) {
    const filePath = path.join(
      CONSTANTS.ROOTPATH,
      config.templatePath as string
    );
    try {
      await fs.access(filePath);
      template = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      debug(
        `Contact form email template file not found at path: ${filePath}. Using default template.`
      );
    }
  }

  const dynamicData = await getValue('contactFormEmailData', { submission });
  const args = await getValue(
    'contactFormEmailArguments',
    {
      to,
      replyTo: submission.email,
      subject,
      template,
      data: dynamicData,
      locale
    },
    { submission }
  );
  await sendEmail('contact_form', args);
  return { sent: true };
}
