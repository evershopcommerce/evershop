import { EvershopRequest } from "@evershop/evershop";
import { getContextValue } from "@evershop/evershop/graphql/services";
import { error } from "@evershop/evershop/lib/log";
import { buildUrl } from "@evershop/evershop/lib/router";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { INTERNAL_SERVER_ERROR } from "@evershop/evershop/lib/util/httpStatus";
import sgMail from "@sendgrid/mail";

export default async (request: EvershopRequest, response, next) => {
  try {
    const {
      $body: { email, token },
    } = response;

    // Check if the API key is set
    const apiKey = getEnv("SENDGRID_API_KEY", "");
    const from = getConfig("sendgrid.from", "");

    if (!apiKey || !from) {
      return;
    }
    sgMail.setApiKey(apiKey);
    const resetPassword = getConfig("sendgrid.events.reset_password", {
      enabled: true,
      subject: "Reset Password",
      templateId: undefined, // This is the SendGrid template ID
    });

    // Check if the we need to send the email on order placed event
    if (resetPassword.enabled === false) {
      return;
    }

    // Check if the template is set
    if (!resetPassword.templateId) {
      return;
    }

    // Generate the url to reset password page
    const url = buildUrl("updatePasswordPage");
    // Add the token to the url
    const resetPasswordUrl = `${getContextValue(
      request as EvershopRequest,
      "homeUrl",
      request.hostname
    )}${url}?token=${token}`;

    // Send email to customer
    const msg = {
      name: "Reset Password",
      to: email,
      subject: resetPassword.subject || "Reset Password",
      from,
      templateId: resetPassword.templateId,
      dynamicTemplateData: {
        reset_password_url: resetPasswordUrl,
      },
    };
    await sgMail.send(msg);
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message,
      },
    });
  }
};
