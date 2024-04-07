const path = require('path');
const fs = require('fs').promises;
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { Resend } = require('resend');
const { select } = require('@evershop/postgres-query-builder');
const { contries } = require('@evershop/evershop/src/lib/locale/countries');
const { provinces } = require('@evershop/evershop/src/lib/locale/provinces');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const Handlebars = require('handlebars');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { getValue } = require('@evershop/evershop/src/lib/util/registry');

module.exports = async function sendOrderConfirmationEmail(data) {
  try {
    // Check if the API key is set
    const apiKey = getEnv('RESEND_API_KEY', '');
    const from = getConfig('resend.from', '');
    if (!apiKey || !from) {
      return;
    }
    const resend = new Resend(apiKey);
    const orderPlaced = getConfig('resend.events.order_placed', {});

    // Check if the we need to send the email on order placed event
    if (orderPlaced.enabled !== true) {
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

    const emailData = order;
    order.items = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool);

    emailData.shipping_address = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(pool);

    emailData.shipping_address.country_name =
      contries.find((c) => c.code === emailData.shipping_address.country)
        ?.name || '';

    emailData.shipping_address.province_name =
      provinces.find((p) => p.code === emailData.shipping_address.province)
        ?.name || '';

    emailData.billing_address = await select()
      .from('order_address')
      .where('order_address_id', '=', order.billing_address_id)
      .load(pool);

    emailData.billing_address.country_name =
      contries.find((c) => c.code === emailData.billing_address.country)
        ?.name || '';

    emailData.billing_address.province_name =
      provinces.find((p) => p.code === emailData.billing_address.province)
        ?.name || '';

    // Preparing the data for email
    const msg = {
      to: order.customer_email,
      subject: orderPlaced.subject || 'Order Confirmation',
      from
    };

    const emailDataFinal = await getValue(
      'resend_order_confirmation_email_data',
      emailData,
      {}
    );
    // Read the template if it's set
    if (orderPlaced.templatePath) {
      // Consider orderPlaced.templatePath is a path to the template file, starting from the root of the project.
      // So we need to get the full path to the file
      const filePath = path.join(process.cwd(), orderPlaced.templatePath);
      const templateContent = await fs.readFile(filePath, 'utf8');
      msg.html = Handlebars.compile(templateContent)(emailDataFinal);
    } else {
      msg.text = `Your order #${order.order_number} has been placed. Thank you for shopping with us.`;
    }
    await resend.emails.send(msg);
  } catch (e) {
    error(e);
  }
};
