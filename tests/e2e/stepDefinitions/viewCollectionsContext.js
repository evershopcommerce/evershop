const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { CollectionPage } = require('../pageObjects/CollectionsPage');

const collectionPage = new CollectionPage();

When('user {string} navigates to collections page', async function (string) {
  await collectionPage.navigateToCollections();
});

Then(
  'user {string} should view the collections table',
  async function (string) {
    await expect(page.locator(collectionPage.tableSelector)).toBeVisible();
  }
);
