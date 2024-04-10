const { expect } = require('playwright/test');

class AddCouponPage {
  constructor() {
    //locators
    this.newCouponBtnSelector = "//span[text()='New Coupon']";
    this.inputCouponSelector = "//input[@name='coupon']";
    this.inputDescSelector = "//textarea[@id='description']";
    this.inputDiscountAmountSelector = "//input[@name='discount_amount']";
    this.inputStartDateSelector = "//input[@id='start_date']";
    // this.startDateValueSelector = "//span[@aria-label='April 1, 2024']";
    this.inputEndDateSelector = "//input[@id='end_date']";
    // this.endDateValueSelector = "//span[@aria-label='May 1, 2024']";
    this.discountTypeSelector =
      "//span[text()='Fixed discount to entire order']";
    this.inputMinPurchaseAmt = "//input[@name='condition[order_total]']";
    this.inputMinPurchaseQty = "//input[@name='condition[order_qty]']";
    this.saveBtnSelector = "//span[text()='Save']";
    this.addedCouponSelector = "//a[text()='coupon123']";
  }

  async addCoupon(dataTable) {
    const dataToFill = dataTable.hashes();
    await page.click(this.newCouponBtnSelector);
    await page.fill(this.inputCouponSelector, dataToFill[0].couponCode);
    await page.fill(this.inputDescSelector, dataToFill[0].description);
    await page.fill(
      this.inputDiscountAmountSelector,
      dataToFill[0].discountAmount
    );

    await page.click(this.discountTypeSelector);
    await page.fill(this.inputMinPurchaseAmt, dataToFill[0].minPurchaseAmount);
    await page.fill(this.inputMinPurchaseQty, dataToFill[0].minPurchaseQty);
    await page.click(this.saveBtnSelector);
  }
}
module.exports = { AddCouponPage };
