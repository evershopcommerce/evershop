const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const sgMail = require('@sendgrid/mail');
const { select } = require('@evershop/postgres-query-builder');
const { createValue } = require('@evershop/evershop/src/lib/util/factory');

module.exports = async function sendOrderConfirmationEmail(data) {
  try {
    // Check if the API key is set
    const apiKey = getConfig('sendgrid.apiKey', '');
    const from = getConfig('sendgrid.from', '');

    if (!apiKey || !from) {
      return;
    }
    sgMail.setApiKey(apiKey);
    const customerRegistered = getConfig(
      'sendgrid.events.customer_registered',
      {}
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
      .from('customer')
      .where('customer_id', '=', customerId)
      .load(pool);

    if (!customer) {
      return;
    }

    // Remove the password
    delete customer.password;

    // Send the email
    const msg = {
      to: customer.email,
      subject: await createValue(
        'sendGridWelcomeEmailSubject',
        'Welcome to Evershop'
      ),
      from: from,
      templateId: customerRegistered.templateId,
      dynamicTemplateData: await createValue(
        'sendGridCustomerWelcomeEmailData',
        {
          ...customer,
          home_url: getConfig('shop.homeUrl', '')
        }
      )
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error(error);
  }
};
