const { expect } = require('playwright/test');

class CustomerStatusPage {
  constructor() {
    //locators
    this.checkboxSelector1 =
      "//td[text()='harry2@gmail.com']/preceding-sibling::td/div/div/label/span";
    this.checkboxSelector2 =
      "//td[text()='example@example.com']/preceding-sibling::td/div/div/label/span";
    this.disableBtnSelector = "//span[text()='Disable']";
    this.enableBtnSelector = "//span[text()='Enable']";
    this.customerSelector1 = "//a[text()='Larry']";
    this.customerSelector2 = "//a[text()='example example']";
    this.disableStatusSelector = "//span[text()='Disabled']";
    this.enabledStatusSelector = "//span[text()='Enabled']";
    this.criticalBtnSelector = "//button[@class='button critical']";
  }

  async disableCustomerStatus() {
    await page.click(this.checkboxSelector1);
    await page.click(this.disableBtnSelector);
    await page.click(this.criticalBtnSelector);
  }

  async enableCustomerStatus() {
    await page.click(this.checkboxSelector2);
    await page.click(this.enableBtnSelector);
    await page.click(this.criticalBtnSelector);
  }

  async disableStatus() {
    await page.click(this.customerSelector1);
    
  }

  async enableStatus() {
    await page.click(this.customerSelector2);
    
  }
}
module.exports = { CustomerStatusPage };
