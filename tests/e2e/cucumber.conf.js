const { Before, BeforeAll, AfterAll, After, setDefaultTimeout } = require("@cucumber/cucumber");
const { chromium } = require("@playwright/test");
require('dotenv').config();

const timeout = process.env.ASYNC_TIMEOUT ? parseInt(process.env.ASYNC_TIMEOUT) : 60000;
setDefaultTimeout(timeout); 

BeforeAll(async function () {
  global.browser = await chromium.launch({
    headless: process.env.HEADLESS === "true",
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  })
});

Before(async function () {
  global.context = await global.browser.newContext();
  global.page = await global.context.newPage();
});

After(async function () {
  await global.page.close();
  await global.context.close();
});

AfterAll(async function() {
  await global.browser.close();
});