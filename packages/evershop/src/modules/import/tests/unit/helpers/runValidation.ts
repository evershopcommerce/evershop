import { createHash } from 'crypto';
import { categoryValidator } from '../../../services/entities/category/categoryValidator.js';
import { customerValidator } from '../../../services/entities/customer/customerValidator.js';
import { customerAddressValidator } from '../../../services/entities/customerAddress/customerAddressValidator.js';
import { productValidator } from '../../../services/entities/product/productValidator.js';
import type { ImportIssue, ImportMode } from '../../../services/types.js';
import type { StoreFixture } from '../../../services/ports/lookup.js';
import type { CsvLimits } from '../../../services/reader/readCsv.js';
import { validateFile } from '../../../services/validate/validateFile.js';
import type {
  ValidateFileArgs,
  ValidationSummary
} from '../../../services/validate/validateFile.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { chunked } from './readAll.js';

export interface Validated {
  summary: ValidationSummary;
  issues: ImportIssue[];
  /** The natural key given with each issue, in the same order. */
  keys: Array<string | null>;
  lookup: MemoryLookup;
  /** How many times the file was opened. */
  opened: number;
}

export interface RunOptions {
  mode?: ImportMode;
  store?: StoreFixture;
  limits?: Partial<CsvLimits>;
  batchSize?: number;
  signal?: AbortSignal;
  /** Cuts the file into chunks of this size (a boundary must change nothing). */
  chunkSize?: number;
  now?: number;
}

/** Validates a category file against a store described as data. */
export function validateCategories(
  file: string | Uint8Array,
  options: RunOptions = {}
): Promise<Validated> {
  return validateEntity('category', file, options);
}

/** Validates a product file against a store described as data. */
export function validateProducts(
  file: string | Uint8Array,
  options: RunOptions = {}
): Promise<Validated> {
  return validateEntity('product', file, options);
}

/** Validates a customer addresses file against a store described as data. */
export function validateAddresses(
  file: string | Uint8Array,
  options: RunOptions = {}
): Promise<Validated> {
  return validateEntity('customerAddress', file, options);
}

/** Validates a customers file against a store described as data. */
export function validateCustomers(
  file: string | Uint8Array,
  options: RunOptions = {}
): Promise<Validated> {
  return validateEntity('customer', file, options);
}

const VALIDATORS = {
  category: categoryValidator,
  product: productValidator,
  customer: customerValidator,
  customerAddress: customerAddressValidator
} as const;

export async function validateEntity(
  entity: keyof typeof VALIDATORS,
  file: string | Uint8Array,
  options: RunOptions = {}
): Promise<Validated> {
  const lookup = new MemoryLookup(options.store);
  const result: Validated = {
    summary: undefined as unknown as ValidationSummary,
    issues: [],
    keys: [],
    lookup,
    opened: 0
  };
  const args: ValidateFileArgs = {
    validator: VALIDATORS[entity] as never,
    context: {
      lookup,
      mode: options.mode ?? 'upsert',
      now: () => options.now ?? 1_760_000_000_000,
      sha256Hex: (text) => createHash('sha256').update(text).digest('hex')
    },
    open: () => {
      result.opened += 1;
      return chunked(
        typeof file === 'string' ? file : Buffer.from(file),
        options.chunkSize
      );
    },
    limits: options.limits,
    batchSize: options.batchSize,
    signal: options.signal,
    onIssue: (issue, key) => {
      result.issues.push(issue);
      result.keys.push(key);
    }
  };
  result.summary = await validateFile(args);
  return result;
}
