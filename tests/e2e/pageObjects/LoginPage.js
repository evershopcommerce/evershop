class LoginPage {
  constructor() {
    //locators
    this.adminPanelUrl = 'http://localhost:3000/admin';
    this.adminLoginUrl = 'http://localhost:3000/admin/login';
    this.emailSelector = "//input[@name='email']";
    this.passwordSelector = "//input[@name='password']";
    this.loginBtnSelector = "//button[@class='button primary']";
    this.alertMsgSelector1 = "//div[@class='text-critical py-1']";
    this.alertMsgSelector2 = "//div[@class='pt025 flex']";
  }

  async navigateToLoginPage() {
    await page.goto(this.adminLoginUrl);
  }
  async navigateToAdminPanel() {
    await page.goto(this.adminPanelUrl);
  }

  async fillLoginInputFields(inputData) {
    await page.fill(this.emailSelector, inputData[0].email);
    await page.fill(this.passwordSelector, inputData[0].password);
  }

  async clickLoginBtn() {
    await page.click(this.loginBtnSelector);
  }
}
module.exports = { LoginPage };
