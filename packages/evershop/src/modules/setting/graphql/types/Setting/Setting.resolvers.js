import { select } from '@evershop/postgres-query-builder';

export default {
  Query: {
    setting: async (root, _, { pool }) => {
      const setting = await select().from('setting').execute(pool);
      return setting;
    }
  },
  Setting: {
    storeName: (setting) => {
      const storeName = setting.find((s) => s.name === 'storeName');
      if (storeName) {
        return storeName.value;
      } else {
        return 'EverShop Store';
      }
    }
  }
};
