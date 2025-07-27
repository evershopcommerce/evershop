// 001-create-roles-perms.ts
import { PoolClient } from 'pg';

export default async (connection) => {
  // Create Roles table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );
  `);

  // Create Permissions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );
  `);

  // Many-to-many Role_Permissions
  await connection.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL REFERENCES roles(id),
      permission_id INT NOT NULL REFERENCES permissions(id),
      UNIQUE(role_id, permission_id)
    );
  `);

  // User_Roles linking table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INT NOT NULL REFERENCES users(id),
      role_id INT NOT NULL REFERENCES roles(id),
      UNIQUE(user_id, role_id)
    );
  `);

  // Add vendorId column to Products
  await connection.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS vendor_id INT REFERENCES users(id);
  `);
};
