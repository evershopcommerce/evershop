const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { SearchCustomerPage } = require('../pageObjects/SearchCustomerPage');

const searchCustomerPage = new SearchCustomerPage();

//Search customer by name
When(
  'user {string} searches for a user with name {string}',
  async function (string, name) {
    await searchCustomerPage.searchByName(name);
    await searchCustomerPage.pressEnter();
  }
);

Then(
  'user {string} should view the customer with name {string}',
  async function (string, string2) {
    await expect(page.locator(searchCustomerPage.customerNameSelector1)).toBeVisible();
  }
);

//search customer by email
When(
  'user {string} searches for a user with email {string}',
  async function (string, email) {
    await searchCustomerPage.searchByEmail(email);
    await searchCustomerPage.pressEnter();
  }
);

Then(
  'user {string} should view the customer with email {string}',
  async function (string, string2) {
    await expect(page.locator(searchCustomerPage.customerNameSelector2)).toBeVisible();
  }
);
