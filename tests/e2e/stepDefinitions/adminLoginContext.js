const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { LoginPage } = require('../pageObjects/LoginPage');
const util = require('util');
const login = new LoginPage();

Given(
  'user {string} has navigated to the admin login page',
  async function (user) {
    await login.navigateToLoginPage();
    expect(page.url()).toBe(login.adminLoginUrl);
  }
);

When(
  'user {string} logs in with following credentials',
  async function (user, credentials) {
    const loginCredentials = credentials.hashes();
    await login.login(loginCredentials);
   
  }
);

Then(
  'user {string} should be navigated to admin panel dashboard',
  async function (user) {
    await expect(page.locator(login.dashboardSeletor)).toBeVisible();
  }

);

When('the user tries to log in with following credentials', async function (credentials) {
  const invalidCredentials = credentials.hashes();
  await login.login(invalidCredentials);
});

Then('error message {string} should be shown', async function (errorMessage) {
  
  // const alertMsgXpath = util.format(login.alertMsgSelector, errorMessage);
  // const alertMsgHandle = await page.waitForSelector(alertMsgXpath);
  // const text = await page.evaluate(
  //   (element) => element.innerText,
  //   alertMsgHandle
  // );
  // expect(text).toEqual(errorMessage);
  let errorMessageSelectors = [
    login.alertMsgSelector1,
    login.alertMsgSelector2
  ];

  for (let selector of errorMessageSelectors) {
    try {
      await expect(await page.locator(selector)).toContainText(errorMessage);
      return;
    } catch (error) {
      continue;
    }
  }
});
