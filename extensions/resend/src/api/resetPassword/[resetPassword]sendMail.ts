import path from "path";
import Handlebars from "handlebars";
import { CreateEmailOptions, Resend } from "resend";
import { promises as fs } from "fs";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { buildUrl } from "@evershop/evershop/lib/router";
import { getContextValue } from "@evershop/evershop/graphql/services";
import { getValue } from "@evershop/evershop/lib/util/registry";
import { error } from "@evershop/evershop/lib/log";
import { INTERNAL_SERVER_ERROR } from "@evershop/evershop/lib/util/httpStatus";

export default async (request, response, next) => {
  try {
    const {
      $body: { email, token },
    } = response;

    // Check if the API key is set
    const apiKey = getEnv("RESEND_API_KEY", "");
    const from = getConfig("resend.from", "");

    if (!apiKey || !from) {
      return;
    }
    const resend = new Resend(apiKey);
    const resetPassword = getConfig("resend.events.reset_password", {
      enabled: true,
      subject: "Reset Password",
      templatePath: undefined, // This is the path to the email template. Starting from the root of the project.
    });

    // Check if the we need to send the email on order placed event
    if (resetPassword.enabled === false) {
      return;
    }

    // Generate the url to reset password page
    const url = buildUrl("updatePasswordPage");
    // Add the token to the url
    const resetPasswordUrl = `${getContextValue(
      request,
      "homeUrl",
      ""
    )}${url}?token=${token}`;

    // Build the email data
    const emailDataFinal = await getValue(
      "resend_reset_password_email_data",
      {
        resetPasswordUrl,
      },
      {}
    );

    // Send email to customer
    const msg: CreateEmailOptions = {
      to: email,
      subject: resetPassword.subject || "Reset Password",
      from,
      html: "",
      text: "",
    };

    // Read the template if it's set
    if (resetPassword.templatePath) {
      // So we need to get the full path to the file
      const filePath = path.join(process.cwd(), resetPassword.templatePath);
      const templateContent = await fs.readFile(filePath, "utf8");
      msg.html = Handlebars.compile(templateContent)(emailDataFinal);
    } else {
      msg.text = `This is your reset password link: ${resetPasswordUrl}`;
    }

    await resend.emails.send(msg);
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
