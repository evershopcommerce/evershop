const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");

var setting;

module.exports.getSetting = async (name, defaultValue) => {
  if (!setting) {
    setting = await select()
      .from('setting')
      .execute(pool);
  }
  if (setting[name]) {
    return setting[name];
  } else {
    return defaultValue;
  }
}

module.exports.refreshSetting = async () => {
  setting = await select()
    .from('setting')
    .execute(pool);
}