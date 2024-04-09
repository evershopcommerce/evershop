const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { DeleteCollectionPage } = require('../pageObjects/DeleteCollectionPage');

const deleteCollectionPage = new DeleteCollectionPage();

When('user {string} deletes a collection', async function (string) {
  await deleteCollectionPage.deleteCollection();
});

Then(
  'user {string} should view list of remaining collections',
  async function (string) {
    await expect(
      page.locator(deleteCollectionPage.tableSelector)
    ).toBeVisible();
  }
);
