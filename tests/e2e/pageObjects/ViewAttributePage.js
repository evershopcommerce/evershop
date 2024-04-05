const { expect } = require('playwright/test');

class ViewAttributePage {
  constructor() {
    //locators
    this.attributeBtnSelector = "//a[@href='/admin/attributes']";
    this.tableSelector = "//table[@class='listing sticky']";
  }

  async navigateToAttribute(){
    await page.click(this.attributeBtnSelector)
  }

  async checkForTable(){
    await expect(page.locator(this.tableSelector)).toBeVisible()
  }

}
module.exports = { ViewAttributePage };