const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { CollectionPage } = require('../pageObjects/CollectionsPage');

const collection = new CollectionPage();

When('user {string} navigates to collections page', async function (string) {
  await collection.navigateToCollections();
});

Then(
  'user {string} should view the collections table',
  async function (string) {
    await collection.checkForTable();
  }
);
