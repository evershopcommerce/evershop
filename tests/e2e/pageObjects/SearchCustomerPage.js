const { expect } = require('playwright/test');

class SearchCustomerPage {
  constructor() {
    //locators
    this.inputNameSelector = "//input[@placeholder='Full Name']";
    this.inputEmailSelector = "//input[@placeholder='Email']";
    this.customerNameSelector1 = "//a[text()='Larry']";
    this.customerNameSelector2 = "//a[text()='harry']";
  }

  async searchByName(name) {
    await page.fill(this.inputNameSelector, name);
  }

  async searchByEmail(email) {
    await page.fill(this.inputEmailSelector, email);
  }
  async pressEnter() {
    await page.keyboard.press('Enter');
  }

}
module.exports = { SearchCustomerPage };
