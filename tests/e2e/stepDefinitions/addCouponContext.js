const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('playwright/test');
const { ViewCouponsPage } = require('../pageObjects/ViewCouponsPage');
const { AddCouponPage } = require('../pageObjects/AddCouponPage');

const viewCouponsPage = new ViewCouponsPage();
const addCouponPage = new AddCouponPage();
When(
  'user {string} creates new coupon with following details',
  async function (string, dataTable) {
    await addCouponPage.addCoupon(dataTable);
  }
);

Then(
  'user {string} should be able to view the added coupon',
  async function (string) {
    await viewCouponsPage.navigateToCouponsPage();
    await expect(page.locator(addCouponPage.addedCouponSelector)).toBeVisible();
  }
);
