import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';

export type Setting = {
  name: string;
  value: any;
};

let setting: Setting[] | undefined;

export async function getSetting<T>(name: string, defaultValue: T): Promise<T> {
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

export async function refreshSetting(): Promise<void> {
  setting = await select().from('setting').execute(pool);
}
