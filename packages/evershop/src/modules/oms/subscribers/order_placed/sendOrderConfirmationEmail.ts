import fs from 'fs/promises';
import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { countries } from '../../../../lib/locale/countries.js';
import { provinces } from '../../../../lib/locale/provinces.js';
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
    Your order has been confirmed. Thanks for shopping with us.
    <div>
       ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
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
      style="
        max-width: 100%;
        margin: 10px auto;
        width: 600px;
        border: 1px solid #e5e5e5;
      "
    >
      <tbody>
        <tr style="width: 100%">
          <td>
            <hr
              style="
                width: 100%;
                border: none;
                border-top: 1px solid #eaeaea;
                border-color: #e5e5e5;
                margin: 0;
              "
            />
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="padding: 40px 74px; text-align: center"
            >
              <tbody>
                <tr>
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
                    <h1
                      style="
                        font-size: 32px;
                        line-height: 1.3;
                        font-weight: 700;
                        text-align: center;
                        letter-spacing: -1px;
                      "
                    >
                      Thanks for shopping with us.
                    </h1>
                    <hr
                      style="
                        width: 100%;
                        border: none;
                        border-top: 1px solid #eaeaea;
                        border-color: #e5e5e5;
                        margin: 0;
                      "
                    />
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="
                        padding-left: 40px;
                        padding-right: 40px;
                        padding-top: 22px;
                        padding-bottom: 22px;
                      "
                    >
                      <tbody>
                        <tr>
                          <td>
                            <table
                              align="center"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="display: inline-flex"
                            >
                              <tbody style="width: 100%">
                                <tr style="width: 100%">
                                  <td
                                    data-id="__react-email-column"
                                    style="width: 170px"
                                  >
                                    <p
                                      style="
                                        font-size: 14px;
                                        line-height: 2;
                                        margin: 0;
                                        font-weight: bold;
                                      "
                                    >
                                      Order Number
                                    </p>
                                    <p
                                      style="
                                        font-size: 14px;
                                        line-height: 1.4;
                                        margin: 12px 0 0 0;
                                        font-weight: 500;
                                        color: #6f6f6f;
                                      "
                                    >
                                      #{{order.order_number}}
                                    </p>
                                  </td>
                                  <td data-id="__react-email-column">
                                    <p
                                      style="
                                        font-size: 14px;
                                        line-height: 2;
                                        margin: 0;
                                        font-weight: bold;
                                      "
                                    >
                                      Order Date
                                    </p>
                                    <p
                                      style="
                                        font-size: 14px;
                                        line-height: 1.4;
                                        margin: 12px 0 0 0;
                                        font-weight: 500;
                                        color: #6f6f6f;
                                      "
                                    >
                                      {{date order.created_at}}
                                    </p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            {{#if shippingAddress}}
              <hr
                style="
                  width: 100%;
                  border: none;
                  border-top: 1px solid #eaeaea;
                  border-color: #e5e5e5;
                  margin: 0;
                "
              />
              <table
                align="center"
                width="100%"
                border="0"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="
                  padding-left: 40px;
                  padding-right: 40px;
                  padding-top: 22px;
                  padding-bottom: 22px;
                "
              >
                <tbody>
                  <tr>
                    <td>
                      <p
                        style="
                          font-size: 15px;
                          line-height: 2;
                          margin: 0;
                          font-weight: bold;
                        "
                      >
                        Shipping to: {{shippingAddress.full_name}}
                      </p>
                      <p
                        style="
                          font-size: 14px;
                          line-height: 2;
                          margin: 0;
                          color: #747474;
                          font-weight: 500;
                        "
                      >
                        {{shippingAddress.address_1}}, {{shippingAddress.city}},
                        {{shippingAddress.province_name}}
                        {{shippingAddress.postcode}}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            {{/if}}
            <hr
              style="
                width: 100%;
                border: none;
                border-top: 1px solid #eaeaea;
                border-color: #e5e5e5;
                margin: 0;
              "
            />
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="
                padding-left: 40px;
                padding-right: 40px;
                padding-top: 40px;
                padding-bottom: 40px;
              "
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                    >
                      <tbody style="width: 100%">
                        {{#each order.items}}
                        <tr style="width: 100%">
                          <td data-id="__react-email-column">
                            <img
                              alt="{{this.product_name}}"
                              src="{{this.thumbnail}}"
                              style="
                                display: block;
                                outline: none;
                                border: none;
                                text-decoration: none;
                                float: left;
                              "
                              width="100px"
                            />
                          </td>
                          <td
                            data-id="__react-email-column"
                            style="vertical-align: top; padding-left: 12px"
                          >
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              {{this.product_name}}
                            </p>
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                color: #747474;
                                font-weight: 500;
                              "
                            >
                              {{this.qty}} | {{currency this.final_price}}
                            </p>
                          </td>
                        </tr>
                        {{/each}}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <hr
              style="
                width: 100%;
                border: none;
                border-top: 1px solid #eaeaea;
                border-color: #e5e5e5;
                margin: 0;
              "
            />
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="
                padding-left: 40px;
                padding-right: 40px;
                padding-top: 40px;
                padding-bottom: 40px;
              "
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                    >
                      <tbody style="width: 100%">
                        <tr style="width: 100%">
                          <td data-id="__react-email-column">
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              Subtotal:
                            </p>
                          </td>
                          <td
                            data-id="__react-email-column"
                            style="vertical-align: top; padding-left: 12px; text-align: right"
                          >
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              {{currency order.sub_total}}
                            </p>
                          </td>
                        </tr>
                        {{#if order.discount_amount}}
                        <tr style="width: 100%">
                          <td data-id="__react-email-column">
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              Discount:
                            </p>
                          </td>
                          <td
                            data-id="__react-email-column"
                            style="vertical-align: top; padding-left: 12px; text-align: right"
                          >
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              -{{currency order.discount_amount}}
                            </p>
                          </td>
                        </tr>
                        {{/if}}
                        <tr style="width: 100%">
                          <td data-id="__react-email-column">
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              Shipping:
                            </p>
                          </td>
                          <td
                            data-id="__react-email-column"
                            style="vertical-align: top; padding-left: 12px; text-align: right"
                          >
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              {{currency order.shipping_fee_incl_tax}}
                            </p>
                          </td>
                        </tr>
                        <tr style="width: 100%">
                          <td data-id="__react-email-column">
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              Tax:
                            </p>
                          </td>
                          <td
                            data-id="__react-email-column"
                            style="vertical-align: top; padding-left: 12px; text-align: right"
                          >
                            <p
                              style="
                                font-size: 14px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 500;
                              "
                            >
                              {{currency order.tax_amount}}
                            </p>
                          </td>
                        </tr>
                        <tr style="width: 100%">
                          <td data-id="__react-email-column" style="padding-top: 12px">
                            <p
                              style="
                                font-size: 16px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 600;
                              "
                            >
                              Total:
                            </p>
                          </td>
                          <td
                            data-id="__react-email-column"
                            style="vertical-align: top; padding-left: 12px; padding-top: 12px; text-align: right"
                          >
                            <p
                              style="
                                font-size: 16px;
                                line-height: 2;
                                margin: 0;
                                font-weight: 600;
                              "
                            >
                              {{currency order.grand_total}}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <hr
              style="
                width: 100%;
                border: none;
                border-top: 1px solid #eaeaea;
                border-color: #e5e5e5;
                margin: 0;
              "
            />
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="padding-top: 22px; padding-bottom: 22px"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                    >
                      <tbody style="width: 100%">
                        <tr style="width: 100%">
                          <p
                            style="
                              font-size: 13px;
                              line-height: 24px;
                              margin: 0;
                              color: #afafaf;
                              text-align: center;
                              padding-top: 30px;
                              padding-bottom: 30px;
                            "
                          >
                            Please contact us if you have any questions.
                          </p>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                    >
                      <tbody style="width: 100%">
                        <tr style="width: 100%">
                          <p
                            style="
                              font-size: 13px;
                              line-height: 24px;
                              margin: 0;
                              color: #afafaf;
                              text-align: center;
                            "
                          >
                            {{storeInfo.address.street}},
                            {{storeInfo.address.city}},
                            {{storeInfo.address.state}}
                            {{storeInfo.address.zip}},
                            {{storeInfo.address.country}}
                          </p>
                        </tr>
                      </tbody>
                    </table>
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
    // Loop through each item to add the base Url before the thumbnail path
    order.items = items.map((item) => {
      if (item.thumbnail) {
        const baseUrl = getBaseUrl();
        item.thumbnail = `${baseUrl}${item.thumbnail}`;
      }
      return item;
    });
    const shippingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(pool);
    if (!data.no_shipping_required) {
      shippingAddress.country_name =
        countries.find((c) => c.code === shippingAddress.country)?.name || '';
      shippingAddress.province_name =
        provinces.find((p) => p.code === shippingAddress.province)?.name || '';
    }

    const billingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.billing_address_id)
      .load(pool);

    billingAddress.country_name =
      countries.find((c) => c.code === billingAddress.country)?.name || '';

    billingAddress.province_name =
      provinces.find((p) => p.code === billingAddress.province)?.name || '';

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
    const dynamicData = await getValue('orderConfirmationEmailData', {
      order,
      shippingAddress,
      billingAddress
    });
    // Off-request (event subscriber) — resolve the store locale explicitly (D7), use it
    // for the subject and pass it to sendEmail so the body's currency/date format match.
    const locale = await getStoreLanguage();
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
