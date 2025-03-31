import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';

let setting;

export async function getSetting(name, defaultValue) {
  if (!setting) {
    setting = await select().from('setting').execute(pool);
  }
  const row = setting.find((s) => s.name === name);
  if (row) {
    return row.value;
  } else {
    return defaultValue;
  }
}

export async function refreshSetting() {
  setting = await select().from('setting').execute(pool);
}
