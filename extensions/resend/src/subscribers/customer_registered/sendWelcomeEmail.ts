import path from "path";
import { promises as fs } from "fs";
import Handlebars from "handlebars";
import { CreateEmailOptions, Resend } from "resend";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { select } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/lib/postgres";
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
    const customerRegistered = getConfig("resend.events.customer_registered", {
      enabled: true,
      subject: "Welcome to Evershop",
      templatePath: undefined,
    });

    // Check if the we need to send the email on order placed event
    if (customerRegistered.enabled !== true) {
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

    const emailDataFinal = await getValue(
      "resend_customer_welcome_email_data",
      customer,
      {}
    );
    // Send the email
    const msg: CreateEmailOptions = {
      to: emailDataFinal.email,
      subject: customerRegistered.subject || `Welcome to Evershop`,
      from,
      html: "",
      text: "",
    };

    // Read the template if it's set
    if (customerRegistered.templatePath) {
      // So we need to get the full path to the file
      const filePath = path.join(
        CONSTANTS.ROOTPATH,
        customerRegistered.templatePath
      );
      const templateContent = await fs.readFile(filePath, "utf8");
      msg.html = Handlebars.compile(templateContent)(emailDataFinal);
    } else {
      msg.text = `Hello ${emailDataFinal.full_name}. Welcome to our store!`;
    }

    await resend.emails.send(msg);
  } catch (e) {
    error(e);
  }
}
