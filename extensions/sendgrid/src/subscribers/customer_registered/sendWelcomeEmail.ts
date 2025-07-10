import { error } from "@evershop/evershop/lib/log";
import { pool } from "@evershop/evershop/lib/postgres";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { getValue } from "@evershop/evershop/lib/util/registry";
import { select } from "@evershop/postgres-query-builder";
import sgMail from "@sendgrid/mail";

export default async function sendOrderConfirmationEmail(data) {
  try {
    // Check if the API key is set
    const apiKey = getEnv("SENDGRID_API_KEY", "");
    const from = getConfig("sendgrid.from", "");

    if (!apiKey || !from) {
      return;
    }
    sgMail.setApiKey(apiKey);
    const customerRegistered = getConfig(
      "sendgrid.events.customer_registered",
      {
        enabled: true,
        subject: "Welcome to Evershop",
        templateId: undefined, // This is the SendGrid template ID
      }
    );

    // Check if the we need to send the email on order placed event
    if (customerRegistered.enabled === false) {
      return;
    }

    // Check if the template is set
    if (!customerRegistered.templateId) {
      return;
    }

    // Build the email data
    const customerId = data.customer_id;
    const customer = await select()
      .from("customer")
      .where("customer_id", "=", customerId)
      .load(pool);

    if (!customer) {
      return;
    }

    // Remove the password
    delete customer.password;

    const emailDataFinal = await getValue<typeof customer>(
      "sendgrid_customer_welcome_email_data",
      customer,
      {}
    );
    // Send the email
    const msg = {
      to: emailDataFinal.email,
      subject: customerRegistered.subject || `Welcome to Evershop`,
      from,
      templateId: customerRegistered.templateId,
      dynamicTemplateData: {
        ...emailDataFinal,
        home_url: getConfig("shop.homeUrl", ""),
      },
    };

    await sgMail.send(msg);
  } catch (e) {
    error(e);
  }
}
