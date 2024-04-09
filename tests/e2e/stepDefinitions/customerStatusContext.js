const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { CustomerStatusPage } = require('../pageObjects/CustomerStatusPage');

const customerStatusPage = new CustomerStatusPage();
//DISABLE CUSTOMER STATUS
When(
  'user {string} disables a customer with email {string}',
  async function (string, string2) {
    await customerStatusPage.disableCustomerStatus();
  }
);

Then('user with email {string} should be disabled', async function (string) {
  await customerStatusPage.disableStatus();
  await expect(page.locator(customerStatusPage.disableStatusSelector)).toContainText(
    'Disabled'
  );
});

//ENABLE CUSTOMER STATUS
When(
  'user {string} enables a customer with email {string}',
  async function (string, string2) {
    await customerStatusPage.enableCustomerStatus();
  }
);

Then('user with email {string} should be enabled', async function (string) {
  await customerStatusPage.enableStatus();
  await expect(page.locator(customerStatusPage.enabledStatusSelector)).toContainText(
    'Enabled'
  );
});
