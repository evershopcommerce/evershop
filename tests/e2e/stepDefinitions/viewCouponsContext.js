const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('playwright/test');
const { ViewCouponsPage } = require('../pageObjects/ViewCouponsPage');

const viewCouponsPage = new ViewCouponsPage();

When('user {string} navigates to coupons page', async function (string) {
  await viewCouponsPage.navigateToCouponsPage();
});

Then('user {string} should view the coupons table', async function (string) {
  await expect(
    page.locator(viewCouponsPage.couponsTableSelector)
  ).toBeVisible();
});
