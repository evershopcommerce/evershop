const { expect } = require('playwright/test');

class ViewCustomerPage {
  constructor() {
    //locators
    this.customerBtnSelector = "//a[@href='/admin/customers']";
    this.tableSelector = "//table[@class='listing sticky']";
  }

  async navigateToCustomerPage() {
    await page.click(this.customerBtnSelector);
  }
}
module.exports = { ViewCustomerPage };
