const { expect } = require('playwright/test');

class DeleteCollectionPage {
  constructor() {
    //locators
    this.checkboxSelector = '//tbody/tr/td[1]';
    this.deleteSelector = "//span[text()='Delete']";
    this.criticalDeleteSelector = "//button[@class='button critical']";
    this.tableSelector = "//table[@class='listing sticky']";
  }

  async deleteCollection() {
    await page.click(this.checkboxSelector);
    await page.click(this.deleteSelector);
    await page.click(this.criticalDeleteSelector);
  }
}
module.exports = { DeleteCollectionPage };
