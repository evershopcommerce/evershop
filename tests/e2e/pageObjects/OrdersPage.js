const { expect } = require('playwright/test');

class OrdersPage {
  constructor() {
    //locators
    this.ordersBtnSelector = "//a[@href='/admin/orders']";
    this.tableSelector = "//table[@class='listing sticky']";
  }

  async navigateToOrdersPage() {
    await page.click(this.ordersBtnSelector);
  }
}
module.exports = { OrdersPage };
