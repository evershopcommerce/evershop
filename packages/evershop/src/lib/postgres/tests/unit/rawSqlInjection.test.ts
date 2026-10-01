import { describe, it, expect } from '@jest/globals';
import { select, sql } from '@evershop/postgres-query-builder';

/**
 * Regression test for the pre-authentication SQL injection via the `isSQL`
 * escape hatch.
 *
 * A request body passed straight into a `.where()` value used to be able to set
 * `isSQL: true` on a plain object and have its `value` inlined as raw, unbound
 * SQL. Raw SQL is now emitted only for values carrying the internal marker,
 * which `sql(...)` sets and a JSON object cannot.
 */

const flat = (s: string) => s.replace(/\s+/g, ' ');

describe('query builder — isSQL is not forgeable from request data', () => {
  it('binds a forged { isSQL:true } object instead of inlining it', async () => {
    const forged = {
      isSQL: true,
      length: 2,
      value: "1=1 OR 'x'='x'"
    } as any;
    const query = select().from('attribute');
    query.where('attribute_code', '=', forged);
    const rendered = flat(await query.sql());

    // The payload must be a bound parameter, never inlined into the statement.
    expect(rendered).not.toContain("1=1 OR 'x'='x'");
    expect(rendered).toMatch(/"attribute_code" = :/);
  });

  it('throws rather than inline a forged object in an IN (...) clause', async () => {
    const forged = {
      isSQL: true,
      length: 2,
      value: '(SELECT password FROM admin_user)'
    } as any;
    const query = select().from('attribute');
    // Non-array value for IN is rejected; it is never treated as raw SQL.
    expect(() => query.where('attribute_code', 'in', forged)).toThrow();
  });

  it('still inlines genuine raw SQL created with sql(...)', async () => {
    const query = select().from('order');
    query.where('created_at', '<', sql('NOW()'));
    const rendered = flat(await query.sql());
    expect(rendered).toContain('NOW()');
    expect(rendered).not.toMatch(/"created_at" < :/);
  });

  it('still renders JOIN on-clause columns as raw SQL (not bound)', async () => {
    const query = select().from('product');
    query
      .innerJoin('product_inventory')
      .on(
        'product_inventory.product_inventory_product_id',
        '=',
        'product.product_id'
      );
    const rendered = flat(await query.sql());
    expect(rendered).toContain('product.product_id');
  });

  it('still binds a normal array passed to IN', async () => {
    const query = select().from('attribute');
    query.where('attribute_code', 'in', ['color', 'size']);
    const rendered = flat(await query.sql());
    expect(rendered).not.toContain("'color'");
    expect(rendered).toMatch(/IN \(:/);
  });
});
