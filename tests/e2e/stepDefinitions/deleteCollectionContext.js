const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { CollectionPage } = require('../pageObjects/collectionsPage');
const { DeleteCollectionPage } = require('../pageObjects/deleteCollectionPage');

const collectionPage = new CollectionPage();
const deleteCollectionPage = new DeleteCollectionPage();

When('user {string} deletes a collection', async function (string) {
  await deleteCollectionPage.deleteCollection();
});

Then(
  'user {string} should view list of remaining collections',
  async function (string) {
    await collectionPage.checkForTable();
  }
);
