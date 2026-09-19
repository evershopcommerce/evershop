import { hasUrnSchema } from './UrnRegistry.js';

/**
 * UrnService — builder, parser, and validator for EverShop URNs.
 *
 * Format: `urn:evershop:<service>:<type>:<uuid>`
 *
 * Both `build` and `parse` consult the `UrnRegistry`. Building or parsing a
 * URN whose `(service, type)` pair has not been registered throws — there
 * are no quietly-accepted unknown types.
 */

const SCHEME = 'urn';
const PLATFORM = 'evershop';
const EXPECTED_SEGMENT_COUNT = 5;

export interface UrnParts {
  raw: string;
  scheme: string;
  platform: string;
  service: string;
  type: string;
  uuid: string;
}

export class UrnService {
  /**
   * Build a URN string from its parts.
   * Throws if `(service, type)` is not registered with `registerUrnSchema()`.
   */
  static build(service: string, type: string, uuid: string): string {
    if (!hasUrnSchema(service, type)) {
      throw new Error(
        `Cannot build URN: (service="${service}", type="${type}") is not registered. ` +
          `Call registerUrnSchema() in your module bootstrap.`
      );
    }
    return [SCHEME, PLATFORM, service, type, uuid].join(':');
  }

  /**
   * Parse a URN string into structured parts.
   * Throws on syntactic errors or when `(service, type)` is unknown.
   */
  static parse(raw: string): UrnParts {
    const parts = raw.split(':');
    if (parts.length !== EXPECTED_SEGMENT_COUNT) {
      throw new Error(
        `Invalid URN "${raw}": expected ${EXPECTED_SEGMENT_COUNT} segments, got ${parts.length}`
      );
    }
    const [scheme, platform, service, type, uuid] = parts;
    if (scheme !== SCHEME) {
      throw new Error(`Invalid URN scheme: "${scheme}" (expected "${SCHEME}")`);
    }
    if (platform !== PLATFORM) {
      throw new Error(
        `Invalid URN platform: "${platform}" (expected "${PLATFORM}")`
      );
    }
    if (!hasUrnSchema(service, type)) {
      throw new Error(
        `Unknown URN type: "${service}:${type}". Not registered in UrnRegistry.`
      );
    }
    return { raw, scheme, platform, service, type, uuid };
  }

  /** Returns true if the input is a valid, registered URN. */
  static isValid(raw: string): boolean {
    try {
      this.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  /** Extract the UUID portion of a URN. */
  static extractUuid(raw: string): string {
    return this.parse(raw).uuid;
  }
}
