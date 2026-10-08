import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from '@jest/globals';
import { Ajv } from 'ajv';

/**
 * `is_default` reaches the address APIs as a boolean, a number, a string — or
 * `null`, which is what the storefront posted for an address whose stored flag
 * was never set (customer_address.is_default is a nullable boolean with no
 * default) and what any client echoing a fetched address sends back. Rejecting
 * null made every non-default saved address impossible to edit (PR6 live run,
 * 2026-10-02). The four schemas must stay aligned on this.
 */
// dist/modules/customer/tests/unit → dist/modules/customer/api
const API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'api'
);
const SCHEMAS = [
  'createCustomerAddress',
  'updateCustomerAddress',
  'createMyAddress',
  'updateMyAddress'
];
const load = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(API, name, 'payloadSchema.json'), 'utf8')
  );
const errorsOn = (schema: object, body: object, field: string) => {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  validate(body);
  return (validate.errors ?? []).filter((e) => e.instancePath === `/${field}`);
};

describe('address payload schemas: is_default', () => {
  it.each(SCHEMAS)('%s accepts null, false and "1" for is_default', (name) => {
    const schema = load(name);
    for (const value of [null, false, true, 0, '1']) {
      expect({
        name,
        value,
        errors: errorsOn(schema, { is_default: value }, 'is_default')
      }).toEqual({ name, value, errors: [] });
    }
  });

  it.each(SCHEMAS)('%s still rejects an object for is_default', (name) => {
    expect(errorsOn(load(name), { is_default: {} }, 'is_default')).not.toEqual(
      []
    );
  });
});
