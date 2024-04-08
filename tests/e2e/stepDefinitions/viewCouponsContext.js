const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('playwright/test');
const couponsUrl = "http://localhost:3000/admin/coupons"
const couponsTableSelector = "//table[@class='listing sticky']"

When('user {string} navigates to coupons page', async function (string) {
  await page.goto(couponsUrl)
});

Then('user {string} should view the coupons table', async function (string) {
  await expect(page.locator(couponsTableSelector)).toBeVisible()
});
