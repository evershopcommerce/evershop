const config = require('../config.js');
class LoginPage {
  constructor() {
    this.adminPanelUrl = `${config.baseUrl}/admin`;
    this.adminLoginUrl = `${config.baseUrl}/admin/login`;
    this.emailSelector = "//input[@name='email']";
    this.passwordSelector = "//input[@name='password']";
    this.loginBtnSelector = "//button[@class='button primary']";
    this.dashboardSeletor = "//div[@class='self-center']/h1";
  }

  async navigateToLoginPage() {
    await page.goto(this.adminLoginUrl);
  }
  async login(inputData) {
    await page.fill(this.emailSelector, inputData[0].email);
    await page.fill(this.passwordSelector, inputData[0].password);
    await page.click(this.loginBtnSelector);
  }
}
module.exports = { LoginPage };
