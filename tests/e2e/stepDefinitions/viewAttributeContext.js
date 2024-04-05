const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { ViewAttributePage } = require('../pageObjects/ViewAttributePage');

const viewAttribute = new ViewAttributePage();

When('user {string} navigates to attributes page', async function (string) {
  await viewAttribute.navigateToAttribute();
});

Then('user {string} should view the attributes table', async function (string) {
  await viewAttribute.checkForTable();
});
