const { When, Then } = require('@cucumber/cucumber');
const { AddAttributePage } = require('../pageObjects/AddAttributePage');

const addAttributePage = new AddAttributePage();
When(
  'user {string} creates new attribute with following details',
  async function (string, dataTable) {
    await addAttributePage.addAttributes(dataTable);
  }
);

Then(
  'user {string} should be able to view all attributes',
  async function (string) {
    await addAttributePage.gotoAttributesPage();
    await addAttributePage.checkForAddedAttributes();
  }
);
