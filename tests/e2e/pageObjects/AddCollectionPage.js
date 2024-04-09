const { expect } = require('playwright/test');

class AddCollectionPage {
  constructor() {
    //locators
    this.newCollectionBtnSelector = "//a[@href='/admin/collections/new']";
    this.nameInputSelector = "//input[@name='name']";
    this.uniqueIdInputSelector = "//input[@name='code']";
    this.descInputSelector = "//div[@contenteditable='true']";
    this.saveButtonSelector = "//button[@class ='button primary']";
    this.addProductSelector = "//a[@class='text-interactive']";
  }

  async fillCollectionInputData(inputData) {
    await page.click(this.newCollectionBtnSelector);
    await page.fill(this.nameInputSelector, inputData[0].name);
    await page.fill(this.uniqueIdInputSelector, inputData[0].uniqueID);
    await page.fill(this.descInputSelector, inputData[0].description);
    await page.click(this.saveButtonSelector);
  }
}
module.exports = { AddCollectionPage };
