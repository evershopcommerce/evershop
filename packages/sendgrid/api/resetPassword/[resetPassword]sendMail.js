const {
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const {
  getContextValue
} = require('@evershop/evershop/src/modules/graphql/services/contextHelper');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const sgMail = require('@sendgrid/mail');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const {
      $body: { email, token }
    } = response;

    // Check if the API key is set
    const apiKey = getEnv('SENDGRID_API_KEY', '');
    const from = getConfig('sendgrid.from', '');

    if (!apiKey || !from) {
      return;
    }
    sgMail.setApiKey(apiKey);
    const resetPassword = getConfig('sendgrid.events.reset_password', {});

    // Check if the we need to send the email on order placed event
    if (resetPassword.enabled === false) {
      return;
    }

    // Check if the template is set
    if (!resetPassword.templateId) {
      return;
    }

    // Generate the url to reset password page
    const url = buildUrl('updatePasswordPage');
    // Add the token to the url
    const resetPasswordUrl = `${getContextValue(
      request,
      'homeUrl'
    )}${url}?token=${token}`;

    // Send email to customer
    const msg = {
      name: 'Reset Password',
      to: email,
      subject: resetPassword.subject || 'Reset Password',
      from,
      templateId: resetPassword.templateId,
      dynamicTemplateData: {
        reset_password_url: resetPasswordUrl
      }
    };
    await sgMail.send(msg);
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
