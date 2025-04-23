const path = require('path');
const fs = require('fs').promises;
const {
  INTERNAL_SERVER_ERROR,
  BAD_REQUEST
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { error, info } = require('@evershop/evershop/src/lib/log/logger');
const {
  getContextValue
} = require('@evershop/evershop/src/modules/graphql/services/contextHelper');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { Resend } = require('resend');
const Handlebars = require('handlebars');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { getValue } = require('@evershop/evershop/src/lib/util/registry');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const {
      $body: { email, token }
    } = response;

    // Validate input
    if (!email || !token) {
      response.status(BAD_REQUEST).json({
        error: {
          status: BAD_REQUEST,
          message: 'Email and token are required.'
        }
      });
      return;
    }

    // Check if the API key is set
    const apiKey = getEnv('RESEND_API_KEY', '');
    const from = getConfig('resend.from', '');

    if (!apiKey || !from) {
      error('Missing Resend API Key or sender email.');
      response.status(INTERNAL_SERVER_ERROR).json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Internal email configuration is missing.'
        }
      });
      return;
    }

    const resend = new Resend(apiKey);
    const resetPassword = getConfig('resend.events.reset_password', {});

    // Check if the we need to send the email on order placed event
    if (resetPassword.enabled === false) {
      info('Reset password email sending is disabled in config.');
      response.status(200).json({ message: 'Email sending is disabled.' });
      return;
    }

    // Generate the url to reset password page
    const url = buildUrl('updatePasswordPage');
    // Add the token to the url
    const resetPasswordUrl = `${getContextValue(request, 'homeUrl')}${url}?token=${token}`;

    // Build the email data
    const emailDataFinal = await getValue(
      'resend_reset_password_email_data',
      { resetPasswordUrl },
      {}
    );

    // Send email to customer
    const msg = {
      name: 'Reset Password',
      to: email,
      subject: resetPassword.subject || 'Reset Password',
      from
    };

    // Read the template if it's set
    if (resetPassword.templatePath) {
      try {
        const filePath = path.join(process.cwd(), resetPassword.templatePath);
        const templateContent = await fs.readFile(filePath, 'utf8');
        msg.html = Handlebars.compile(templateContent)(emailDataFinal);
      } catch (templateErr) {
        error(`Failed to read or compile email template: ${templateErr.message}`);
        msg.text = `This is your reset password link: ${resetPasswordUrl}`;
      }
    } else {
      msg.text = `This is your reset password link: ${resetPasswordUrl}`;
    }

    try {
      await resend.emails.send(msg);
      next();
    } catch (emailErr) {
      error(`Failed to send email: ${emailErr.message}`);
      response.status(INTERNAL_SERVER_ERROR).json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Failed to send reset password email. Please try again later.'
        }
      });
    }

  } catch (e) {
    error(`Unhandled error in reset password email: ${e.message}`);
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred. Please contact support.'
      }
    });
  }
};
