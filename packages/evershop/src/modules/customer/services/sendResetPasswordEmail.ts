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

const TEMPLATE = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    {{#if storeInfo.logo}}
      <link rel="preload" as="image" href="{{storeInfo.logo.url}}" />
    {{/if}}
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  </head>
  <div
    style="
      display: none;
      overflow: hidden;
      line-height: 1px;
      opacity: 0;
      max-height: 0;
      max-width: 0;
    "
  >
    {{storeName}} reset your password
    <div>
       ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
    </div>
  </div>

  <body style="background-color: #ffffff; padding: 10px 0">
    <table
      align="center"
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="max-width: 37.5em; background-color: #ffffff; padding: 45px"
    >
      <tbody>
        <tr style="width: 100%">
          <td>
            {{#if storeInfo.logo}}
              <img
                alt="{{storeInfo.logo.alt}}"
                height="{{storeInfo.logo.height}}"
                src="{{storeInfo.logo.src}}"
                style="
                  display: block;
                  outline: none;
                  border: none;
                  text-decoration: none;
                "
                width="{{storeInfo.logo.width}}"
              />
            {{/if}}
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
            >
              <tbody>
                <tr>
                  <td>
                    <p
                      style="font-size:16px;line-height:26px;margin:16px 0;font-family:&#x27;Open Sans&#x27;, &#x27;HelveticaNeue-Light&#x27;, &#x27;Helvetica Neue Light&#x27;, &#x27;Helvetica Neue&#x27;, Helvetica, Arial, &#x27;Lucida Grande&#x27;, sans-serif;font-weight:300;color:#000000"
                    >
                      Hi,
                    </p>
                    <p
                      style="font-size:16px;line-height:26px;margin:16px 0;font-family:&#x27;Open Sans&#x27;, &#x27;HelveticaNeue-Light&#x27;, &#x27;Helvetica Neue Light&#x27;, &#x27;Helvetica Neue&#x27;, Helvetica, Arial, &#x27;Lucida Grande&#x27;, sans-serif;font-weight:300;color:#000000"
                    >
                      Someone recently requested a password change for your
                      {{storeInfo.storeName}} account. If this was you, you can set a new
                      password here:
                    </p>
                    <a
                      href="{{resetPasswordUrl}}"
                      style="background-color:#000000;border-radius:4px;color:#ffffff;font-family:&#x27;Open Sans&#x27;, &#x27;Helvetica Neue&#x27;, Arial;font-size:15px;text-decoration:none;text-align:center;display:inline-block;width:210px;padding:14px 7px 14px 7px;line-height:100%;max-width:100%"
                      target="_blank"
                      ><span
                        ><!--[if mso
                          ]><i
                            style="
                              letter-spacing: 7px;
                              mso-font-width: -100%;
                              mso-text-raise: 21;
                            "
                            hidden
                            >&nbsp;</i
                          ><!
                        [endif]--></span
                      ><span
                        style="
                          max-width: 100%;
                          display: inline-block;
                          line-height: 120%;
                          mso-padding-alt: 0px;
                          mso-text-raise: 10.5px;
                        "
                        >Reset password</span
                      ><span
                        ><!--[if mso
                          ]><i
                            style="letter-spacing: 7px; mso-font-width: -100%"
                            hidden
                            >&nbsp;</i
                          ><!
                        [endif]--></span
                      ></a
                    >
                    <p
                      style="font-size:16px;line-height:26px;margin:16px 0;font-family:&#x27;Open Sans&#x27;, &#x27;HelveticaNeue-Light&#x27;, &#x27;Helvetica Neue Light&#x27;, &#x27;Helvetica Neue&#x27;, Helvetica, Arial, &#x27;Lucida Grande&#x27;, sans-serif;font-weight:300;color:#000000"
                    >
                      If you don&#x27;t want to change your password or
                      didn&#x27;t request this, just ignore and delete this
                      message.
                    </p>
                    <p
                      style="font-size:16px;line-height:26px;margin:16px 0;font-family:&#x27;Open Sans&#x27;, &#x27;HelveticaNeue-Light&#x27;, &#x27;Helvetica Neue Light&#x27;, &#x27;Helvetica Neue&#x27;, Helvetica, Arial, &#x27;Lucida Grande&#x27;, sans-serif;font-weight:300;color:#000000"
                    >
                      To keep your account secure, please don&#x27;t forward
                      this email to anyone.
                    </p>

                    <p
                      style="font-size:16px;line-height:26px;margin:16px 0;font-family:&#x27;Open Sans&#x27;, &#x27;HelveticaNeue-Light&#x27;, &#x27;Helvetica Neue Light&#x27;, &#x27;Helvetica Neue&#x27;, Helvetica, Arial, &#x27;Lucida Grande&#x27;, sans-serif;font-weight:300;color:#000000"
                    >
                      Happy Shopping!
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

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
