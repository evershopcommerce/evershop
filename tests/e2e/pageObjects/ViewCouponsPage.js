const { expect } = require('playwright/test');

class ViewCouponsPage {
  constructor() {
    //locators
    this.couponsBtnSelector = "//a[@href='/admin/coupons']";
    this.couponsTableSelector = "//table[@class='listing sticky']";
  }

  async navigateToCouponsPage() {
    await page.click(this.couponsBtnSelector);
  }
  async checkForTable() {
    await expect(page.locator(this.couponsTableSelector)).toBeVisible();
  }
}
module.exports = { ViewCouponsPage };
