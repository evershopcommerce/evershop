const { select } = require("@evershop/mysql-query-builder")

module.exports = {
  Query: {
    setting: async (root, { _ }, { pool }) => {
      const setting = await select()
        .from('setting')
        .execute(pool);
      return setting;
    }
  },
  Setting: {
    storeName: (setting, { _ }, { pool }) => {
      const storeName = setting.find(s => s.name === 'storeName');
      if (storeName) {
        return storeName.value;
      } else {
        return 'EverShop Store';
      }
    }
  }
}