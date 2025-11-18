import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Drop the layout column in the cms_page table
  await execute(connection, `ALTER TABLE cms_page DROP COLUMN layout`);
};
