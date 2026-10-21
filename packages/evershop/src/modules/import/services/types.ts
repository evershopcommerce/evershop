import type { ImportIssueCode } from './issues.js';
import type { SayData } from './say.js';

/**
 * The things the engine imports (v1), with the file name each one has and the
 * value the template route uses. One list, used everywhere.
 */
export const IMPORT_ENTITIES = {
  category: { fileName: 'categories.csv', routeValue: 'categories' },
  product: { fileName: 'products.csv', routeValue: 'products' },
  customer: { fileName: 'customers.csv', routeValue: 'customers' },
  customerAddress: {
    fileName: 'customer-addresses.csv',
    routeValue: 'customer-addresses'
  }
} as const;

export type ImportEntity = keyof typeof IMPORT_ENTITIES;

/**
 * What a reader produces and the later stages work on. It is derived from what
 * EverShop's services accept, not from any foreign format.
 */
export interface ImportRecord<T = Record<string, unknown>> {
  entity: ImportEntity;
  /** 1-based, the header is row 1; for reports. */
  rowNumber: number;
  /** The natural key as written (sku, url_key, email). */
  key: string;
  /** Already typed; the shape depends on the entity. */
  data: T;
}

/**
 * What a job does with a record that exists or does not (ALL-16): `upsert`
 * creates or updates, `create` refuses a record that exists, `update` refuses
 * one that does not.
 */
export type ImportMode = 'upsert' | 'create' | 'update';

/** `error` fails the row, `warning` lets it through and shows in the report. */
export type ImportSeverity = 'error' | 'warning';

export interface ImportIssue {
  /** Absent: an issue with the file or its header, not with a row. */
  rowNumber?: number;
  column?: string;
  /** Stable and machine-readable. */
  code: ImportIssueCode;
  severity: ImportSeverity;
  /** What the message is built from. Must be plain JSON. */
  params: Record<string, unknown>;
  /** The sentence in English, as it was made. */
  message: string;
  /**
   * The same sentence as a template and its values (`say`), so that it can be
   * said in the admin's language when it is read. Absent for a sentence that
   * has no translation (it stays as `message` says it).
   */
  say?: SayData;
  /** The offending cell, truncated. Never set for a password column. */
  value?: string;
}
