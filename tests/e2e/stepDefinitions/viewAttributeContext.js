const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { ViewAttributePage } = require('../pageObjects/ViewAttributePage');

const viewAttributePage = new ViewAttributePage();

When('user {string} navigates to attributes page', async function (string) {
  await viewAttributePage.navigateToAttribute();
});

Then('user {string} should view the attributes table', async function (string) {
  await expect(page.locator(viewAttributePage.tableSelector)).toBeVisible();
});
