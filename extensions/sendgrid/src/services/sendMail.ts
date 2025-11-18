import { debug, error } from "@evershop/evershop/lib/log";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import sgMail from "@sendgrid/mail";

export const sendMail = async function sendMail(data) {
  try {
    const apiKey = getEnv("SENDGRID_API_KEY", "");
    const from = getConfig("sendgrid.from", "");

    if (!apiKey || !from) {
      debug("No SendGrid API key or from address found");
      return;
    }
    sgMail.setApiKey(apiKey);
    await sgMail.send({ ...data, from });
  } catch (e) {
    error(e);
    throw e;
  }
};
