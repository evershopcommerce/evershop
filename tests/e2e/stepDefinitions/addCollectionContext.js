const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { AddCollectionPage } = require('../pageObjects/AddCollectionPage');

const addCollectionPage = new AddCollectionPage()

When(
  'user {string} creates new collection with following details',
  async function (string, dataTable) {
    const inputData = dataTable.hashes();
    await addCollectionPage.fillCollectionInputData(inputData);
  }
);

Then(
  'user {string} should be able to add products to the collection',
  async function (string) {
    await expect(page.locator(addCollectionPage.addProductSelector)).toBeVisible();
  }
);
