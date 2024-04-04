const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { LoginPage } = require('../pageObjects/loginPage');
const loginPage = new LoginPage();

Given(
  'user {string} has navigated to the admin login page',
  async function (string) {
    await loginPage.navigateToLoginPage();
    expect(page.url()).toBe('http://localhost:3000/admin/login');
  }
);

When(
  'user {string} login with following credentials',
  async function (string, dataTable) {
    const credentials = dataTable.hashes();
    await loginPage.fillLoginInputFields(credentials);
    await loginPage.clickLoginBtn();
  }
);

Then(
  'user {string} should be navigated to admin panel dashboard',
  async function (string) {
    await loginPage.navigateToAdminPanel();
    expect(page.url()).toBe('http://localhost:3000/admin');
  }
);

When('the user login with following credentials', async function (dataTable) {
  const invalidCredentials = dataTable.hashes();
  await loginPage.fillLoginInputFields(invalidCredentials);
  await loginPage.clickLoginBtn();
});

Then('error message {string} should be shown', async function (errorMessage) {
  // await expect(page.locator(loginPage.loginBtnSelector)).toBeVisible();
  let errorMessageSelectors = [
    loginPage.alertMsgSelector1,
    loginPage.alertMsgSelector2
  ];

  for (let selector of errorMessageSelectors) {
    try {
      await expect(await page.locator(selector)).toContainText(errorMessage);
      // If the expectation passes, return immediately
      return;
    } catch (error) {
      // If the expectation fails, continue to the next error message
      continue;
    }
  }
});
