const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { ViewCustomerPage } = require('../pageObjects/ViewCustomerPage');

const viewCustomerPage = new ViewCustomerPage();

When('user {string} navigates to customers page', async function (string) {
  await viewCustomerPage.navigateToCustomerPage();
});

Then('user {string} should view the customers table', async function (string) {
  await expect(page.locator(viewCustomerPage.tableSelector)).toBeVisible()
});
