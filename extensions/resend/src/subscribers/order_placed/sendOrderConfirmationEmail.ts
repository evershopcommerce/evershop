import path from "path";
import { promises } from "fs";
import Handlebars from "handlebars";
import { CreateEmailOptions, Resend } from "resend";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { select } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/lib/postgres";
import { countries } from "@evershop/evershop/lib/locale/countries";
import { provinces } from "@evershop/evershop/lib/locale/provinces";
import { getValue } from "@evershop/evershop/lib/util/registry";
import { error } from "@evershop/evershop/lib/log";
import { CONSTANTS } from "@evershop/evershop/lib/helpers";

export default async function sendOrderConfirmationEmail(data) {
  try {
    // Check if the API key is set
    const apiKey = getEnv("RESEND_API_KEY", "");
    const from = getConfig("resend.from", "");
    if (!apiKey || !from) {
      return;
    }
    const resend = new Resend(apiKey);
    const orderPlaced = getConfig("resend.events.order_placed", {
      enabled: true,
      subject: "Order Confirmation",
      templatePath: undefined,
    });

    // Check if the we need to send the email on order placed event
    if (orderPlaced.enabled !== true) {
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

    // Preparing the data for email
    const msg: CreateEmailOptions = {
      to: order.customer_email,
      subject: orderPlaced.subject || "Order Confirmation",
      from,
      html: "",
      text: "",
    };

    const emailDataFinal = await getValue(
      "resend_order_confirmation_email_data",
      emailData,
      {}
    );
    // Read the template if it's set
    if (orderPlaced.templatePath) {
      // Consider orderPlaced.templatePath is a path to the template file, starting from the root of the project.
      // So we need to get the full path to the file
      const filePath = path.join(CONSTANTS.ROOTPATH, orderPlaced.templatePath);
      const templateContent = await promises.readFile(filePath, "utf8");
      msg.html = Handlebars.compile(templateContent)(emailDataFinal);
    } else {
      msg.text = `Your order #${order.order_number} has been placed. Thank you for shopping with us.`;
    }
    await resend.emails.send(msg);
  } catch (e) {
    error(e);
  }
}
