const sgMail = require('@sendgrid/mail');
const { error, debug } = require('@evershop/evershop/src/lib/log/logger');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

module.exports.sendMail = async function sendMail(data) {
  try {
    const apiKey = getEnv('SENDGRID_API_KEY', '');
    const from = getConfig('sendgrid.from', '');

    if (!apiKey || !from) {
      debug('No SendGrid API key or from address found');
      return;
    }
    sgMail.setApiKey(apiKey);
    await sgMail.send({ ...data, from });
  } catch (e) {
    error(e);
    throw e;
  }
};
