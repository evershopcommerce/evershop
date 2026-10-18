import type { Pool } from 'pg';
import createCategory from '../../catalog/services/category/createCategory.js';
import updateCategory from '../../catalog/services/category/updateCategory.js';
import type {
  CategoryWrite,
  EntityServices
} from '../services/ports/services.js';

/**
 * The real `EntityServices` (§ 4.5, point 2): core's own category services, so
 * that an imported category goes through the same checks, hooks and triggers as
 * one made in the admin. Each call is one transaction that the service owns; an
 * error it throws (a validation message, or a PostgreSQL error with its
 * SQLSTATE in `code`) is a failed row, and the writer classifies it.
 *
 * The services take the registry and the hooks as the process has them. The
 * worker boots every module first (`headlessBoot`), so the processors that
 * extensions and core modules register are there.
 */
export function createCoreEntityServices(pool: Pool): EntityServices {
  const data = (input: CategoryWrite) => ({ ...input });
  return {
    async createCategory(input) {
      const row = await createCategory(data(input) as never, {});
      return { id: Number(row.category_id), uuid: String(row.uuid) };
    },

    async updateCategory(uuid, input) {
      // `createCategory` refuses a parent that is not there; `updateCategory`
      // does not, and would store a parent that does not exist (found 2026-10-18,
      // by the contract). The parent was checked with the file, but it can be
      // deleted before the row is written.
      if (input.parent_id !== undefined) {
        const parent = await pool.query(
          'SELECT 1 FROM category WHERE category_id = $1',
          [input.parent_id]
        );
        if (parent.rows.length === 0) {
          throw new Error('Parent category not found');
        }
      }
      await updateCategory(uuid, data(input) as never, {});
    }
  };
}
