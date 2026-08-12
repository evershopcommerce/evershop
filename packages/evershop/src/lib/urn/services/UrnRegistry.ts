/**
 * URN schema registry. Holds the catalogue of (service, type) pairs that the
 * `UrnService` will accept when building or parsing URNs.
 *
 * Core schemas are registered centrally in `lib/urn/index.ts`. Third-party
 * extensions register their own types from their `bootstrap.ts` by calling
 * `registerUrnSchema()`.
 */

export interface UrnSchema {
  service: string;
  type: string;
  description: string;
}

const schemas = new Map<string, UrnSchema>();

function key(service: string, type: string): string {
  return `${service}:${type}`;
}

export function registerUrnSchema(schema: UrnSchema): void {
  const k = key(schema.service, schema.type);
  if (schemas.has(k)) {
    throw new Error(`URN schema already registered: ${k}`);
  }
  schemas.set(k, schema);
}

export function getUrnSchema(
  service: string,
  type: string
): UrnSchema | undefined {
  return schemas.get(key(service, type));
}

export function hasUrnSchema(service: string, type: string): boolean {
  return schemas.has(key(service, type));
}

export function listUrnSchemas(): UrnSchema[] {
  return Array.from(schemas.values());
}
