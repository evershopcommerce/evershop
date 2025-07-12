import sgMail from "@sendgrid/mail";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { select } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/lib/postgres";
import { countries } from "@evershop/evershop/lib/locale/countries";
import { provinces } from "@evershop/evershop/lib/locale/provinces";
import { getValue } from "@evershop/evershop/lib/util/registry";
import { error } from "@evershop/evershop/lib/log";

export default async function sendOrderConfirmationEmail(data) {
  try {
    // Check if the API key is set
    const apiKey = getEnv("SENDGRID_API_KEY", "");
    const from = getConfig("sendgrid.from", "");

    if (!apiKey || !from) {
      return;
    }
    sgMail.setApiKey(apiKey);
    const orderPlaced = getConfig("sendgrid.events.order_placed", {
      enabled: true,
      subject: "Order Confirmation",
      templateId: undefined, // This is the SendGrid template ID
    });

    // Check if the we need to send the email on order placed event
    if (orderPlaced.enabled === false) {
      return;
    }

    // Check if the template is set
    if (!orderPlaced.templateId) {
      return;
    }
    // Build the email data
    const orderId = data.order_id;
    const order = await select()
      .from("order")
      .where("order_id", "=", orderId)
      .load(pool);

    if (!order) {
      return;
    }

    const emailData = order;
    order.items = await select()
      .from("order_item")
      .where("order_item_order_id", "=", order.order_id)
      .execute(pool);

    emailData.shipping_address = await select()
      .from("order_address")
      .where("order_address_id", "=", order.shipping_address_id)
      .load(pool);

    emailData.shipping_address.country_name =
      countries.find((c) => c.code === emailData.shipping_address.country)
        ?.name || "";

    emailData.shipping_address.province_name =
      provinces.find((p) => p.code === emailData.shipping_address.province)
        ?.name || "";

    emailData.billing_address = await select()
      .from("order_address")
      .where("order_address_id", "=", order.billing_address_id)
      .load(pool);

    emailData.billing_address.country_name =
      countries.find((c) => c.code === emailData.billing_address.country)
        ?.name || "";

    emailData.billing_address.province_name =
      provinces.find((p) => p.code === emailData.billing_address.province)
        ?.name || "";

    const finalEmailData = await getValue<typeof emailData>(
      "sendgrid_order_confirmation_email_data",
      emailData,
      {}
    );

    // Send the email
    const msg = {
      to: order.customer_email,
      subject: orderPlaced.subject || "Order Confirmation",
      from,
      templateId: orderPlaced.templateId,
      dynamicTemplateData: finalEmailData,
    };

    await sgMail.send(msg);
  } catch (e) {
    error(e);
  }
}
