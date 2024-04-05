const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { CollectionPage } = require('../pageObjects/CollectionsPage');
const { DeleteCollectionPage } = require('../pageObjects/DeleteCollectionPage');

const collection = new CollectionPage();
const deleteCollection = new DeleteCollectionPage();

When('user {string} deletes a collection', async function (string) {
  await deleteCollection.deleteCollection();
});

Then(
  'user {string} should view list of remaining collections',
  async function (string) {
    await collection.checkForTable();
  }
);
