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
    Welcome {{customer.full_name}}. Thanks for joining us.
    <div>
       ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
    </div>
  </div>

  <body
    style="
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    "
  >
    <table
      align="center"
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="max-width: 37.5em; margin: 0 auto; padding: 20px 0 48px"
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
            <p style="font-size: 16px; line-height: 26px; margin: 16px 0">
              Hi {{customer.full_name}},
            </p>
            <p style="font-size: 16px; line-height: 26px; margin: 16px 0">
              Welcome to {{storeInfo.storeName}}. We are excited to have you on board. You
              can now start shopping and enjoy the best deals on the market.
            </p>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="text-align: center"
            >
              <tbody>
                <tr>
                  <td>
                    <a
                      href="{{storeInfo.homeUrl}}"
                      style="
                        background-color: #000000;
                        border-radius: 3px;
                        color: #ffffff;
                        font-size: 16px;
                        text-decoration: none;
                        text-align: center;
                        display: inline-block;
                        padding: 12px 12px 12px 12px;
                        line-height: 100%;
                        max-width: 100%;
                      "
                      target="_blank"
                      ><span
                        ><!--[if mso
                          ]><i
                            style="
                              letter-spacing: 12px;
                              mso-font-width: -100%;
                              mso-text-raise: 18;
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
                          mso-text-raise: 9px;
                        "
                        >Start shopping</span
                      ><span
                        ><!--[if mso
                          ]><i
                            style="letter-spacing: 12px; mso-font-width: -100%"
                            hidden
                            >&nbsp;</i
                          ><!
                        [endif]--></span
                      ></a
                    >
                  </td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 16px; line-height: 26px; margin: 16px 0">
              Best,<br />The {{storeInfo.storeName}}
            </p>
            <hr
              style="
                width: 100%;
                border: none;
                border-top: 1px solid #000000;
                margin: 20px 0;
              "
            />
            <p
              style="
                font-size: 12px;
                line-height: 24px;
                margin: 16px 0;
                color: #000000;
              "
            >
              {{storeInfo.address.street}}, {{storeInfo.address.city}}, {{storeInfo.address.state}} {{storeInfo.address.zip}}, {{storeInfo.address.country}}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;
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
