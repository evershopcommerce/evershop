import { pool } from '@evershop/evershop/src/lib/postgres/connection';
import { hookBefore } from '@evershop/evershop/src/lib/util/hookable';
import { execute } from '@evershop/postgres-query-builder';

hookBefore('bootstrap', async () => {
  await execute(pool, `
      INSERT INTO "roles" (name, description)
      SELECT 'vendor', 'Vendor can manage own products and dashboard'
      WHERE NOT EXISTS (SELECT 1 FROM "Roles" WHERE name='vendor');
    `);

  for (const name of ['product.create.own', 'product.edit.own', 'dashboard.view.own']) {
    await execute(pool, `
        INSERT INTO "permissions" (name, description)
        SELECT '${name}', '${name}'
        WHERE NOT EXISTS (SELECT 1 FROM "Permissions" WHERE name='${name}');
      `);
    await execute(pool, `
        INSERT INTO "role_Permissions" ("roleId","permissionId")
        SELECT r.id, p.id
        FROM "Roles" r, "Permissions" p
        WHERE r.name='vendor' AND p.name='${name}'
          AND NOT EXISTS (
            SELECT 1 FROM "Role_Permissions"
            WHERE "roleId"=r.id AND "permissionId"=p.id
          );
      `);
  }
});

await execute(pool, `
  INSERT INTO user_roles(user_id, role_id)
  SELECT u.id, r.id FROM users u, roles r
  WHERE u.email='vendor@vendor.com' AND r.name='vendor'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id=u.id AND ur.role_id=r.id
    );
`);

