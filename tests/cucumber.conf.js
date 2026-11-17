const { Before, BeforeAll, AfterAll, After, setDefaultTimeout } = require("@cucumber/cucumber");
const { chromium } = require("playwright");
require('dotenv').config();

const timeout = process.env.TIME_OUT ? parseInt(process.env.TIME_OUT) : 60000;
setDefaultTimeout(timeout); 

BeforeAll(async function () {
  global.browser = await chromium.launch({
    headless: process.env.HEADLESS === "false" ? false : true,
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