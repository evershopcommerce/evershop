const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('playwright/test');
const { AddAttributePage } = require('../pageObjects/AddAttributePage');
const util = require('util');

const addAttributePage = new AddAttributePage();
When(
  'user {string} creates new attribute with following details',
  async function (string, dataTable) {
    await addAttributePage.addAttributes(dataTable);
  }
);

Then(
  'user {string} should be able to view all attributes with name {string}',
  async function (string, name, dataTable) {
    await addAttributePage.gotoAttributesPage();
    const data = dataTable.hashes();

    for (const i in data) {
      const selector = util.format(addAttributePage.selector, data[i].name);
      await expect(page.locator(selector)).toBeVisible();
    }
  }
);
