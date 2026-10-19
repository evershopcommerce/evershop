import type { Readable } from 'stream';
import { addressIssues } from '../entities/customerAddress/addressIssues.js';
import {
  addressOf,
  customerAddressValidator,
  type AddressRow,
  type AddressState
} from '../entities/customerAddress/customerAddressValidator.js';
import { sameAddress } from '../entities/customerAddress/sameAddress.js';
import type { HeaderInfo, ValidationContext } from '../entities/definition.js';
import type { AddressPlan } from '../plan/customerAddressPlan.js';
import type { Clock } from '../ports/clock.js';
import type {
  AddressProblem,
  AddressRules,
  StoredAddress,
  StoredCustomer
} from '../ports/lookup.js';
import type { AddressWrite, EntityServices } from '../ports/services.js';
import { readCsv } from '../reader/readCsv.js';
import type { CsvLimits } from '../reader/readCsv.js';
import { isTransientDatabaseError, withRetries } from '../retry.js';
import { ALL_21 } from '../rules/allRules.js';
import { ADR_01 } from '../rules/customerAddressRules.js';
import { IMP_01 } from '../rules/importPhaseRules.js';
import type { ImportIssue } from '../types.js';
import type { WriteOutcome, WriteResult } from './categoryWriter.js';

export interface AddressWriterArgs {
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  header: HeaderInfo;
  state: AddressState;
  plan: AddressPlan;
  /** The reading context: the store to ask, the mode, the time, the hash. */
  context: ValidationContext;
  services: EntityServices;
  clock: Pick<Clock, 'sleep'>;
  /**
   * The job is a resumed one (IMP-07). An address is only ever added, so the
   * worker that died may have added the ones after the last place it saved: an
   * address that is already stored, the same in every column, is not added again.
   */
  resumed?: boolean;
  include?: (unit: { unit: number; rowNumber: number; key: string }) => boolean;
  signal?: AbortSignal;
  /** Rows whose customers are asked of the store together. */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1000;

// What core throws when the validation refuses an address (`AddressValidationError`):
// recognised by its shape, as the stages may not load core.
function validationErrors(error: unknown): AddressProblem[] | null {
  const e = error as { name?: unknown; errors?: unknown } | null;
  return e?.name === 'AddressValidationError' && Array.isArray(e.errors)
    ? (e.errors as AddressProblem[])
    : null;
}

/**
 * Writes the addresses of a file that has been checked, in the order of the file
 * (they depend on nothing). Each is added to the customer with that e-mail,
 * through the services that the account page uses, so the seam, the validation
 * and the default flag are core's. A row is never matched with an address that
 * exists (D-18); the one exception is a resumed job (see `resumed`).
 */
export async function* writeCustomerAddresses(
  args: AddressWriterArgs
): AsyncGenerator<WriteOutcome, void, undefined> {
  const { context, services, clock, signal } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
  let rules: AddressRules | null = null;
  let unit = 0;

  async function* readRows(): AsyncGenerator<AddressRow, void, undefined> {
    for await (const event of readCsv(args.open(), args.limits)) {
      if (event.type !== 'row') continue;
      const row = customerAddressValidator.convert(
        event.row,
        args.header,
        context
      );
      if (row.key !== null && !row.example && !row.broken) {
        yield row;
      }
    }
  }

  async function* writeBatch(
    batch: AddressRow[]
  ): AsyncGenerator<WriteOutcome, void, undefined> {
    const customers = await context.lookup.customers([
      ...new Set(batch.map((row) => row.key as string))
    ]);
    let stored = new Map<number, StoredAddress[]>();
    if (args.resumed) {
      const ids = [...customers.values()].flatMap((list) =>
        list.length === 1 ? [list[0].id] : []
      );
      stored = await context.lookup.customerAddresses(ids);
    }
    for (const row of batch) {
      unit += 1;
      const key = row.key as string;
      if (
        args.include &&
        !args.include({ unit, rowNumber: row.rowNumber, key })
      ) {
        continue;
      }
      if (signal?.aborted) return;
      yield await writeOne(row, unit, customers.get(key) ?? [], stored);
    }
  }

  async function* all(): AsyncGenerator<WriteOutcome, void, undefined> {
    let batch: AddressRow[] = [];
    for await (const row of readRows()) {
      batch.push(row);
      if (batch.length >= batchSize) {
        yield* writeBatch(batch);
        batch = [];
        if (signal?.aborted) return;
      }
    }
    yield* writeBatch(batch);
  }

  async function writeOne(
    row: AddressRow,
    unitNumber: number,
    matches: StoredCustomer[],
    storedAddresses: Map<number, StoredAddress[]>
  ): Promise<WriteOutcome> {
    const key = row.key as string;
    const { rowNumber, data } = row;
    const email = data.email as string;
    let retries = 0;
    const onRetry = () => {
      retries += 1;
    };
    const outcome = (
      result: WriteResult,
      ...issues: ImportIssue[]
    ): WriteOutcome => ({
      unit: unitNumber,
      rowNumber,
      key,
      result,
      issues,
      retries
    });

    if (matches.length === 0) {
      return outcome(
        'failed',
        ADR_01.issue({
          rowNumber,
          column: 'email',
          params: { reference: 'customer', value: email },
          message: `There is no customer with the e-mail "${email}" any more.`,
          value: email
        })
      );
    }
    if (matches.length > 1) {
      return outcome(
        'failed',
        ALL_21.issue({
          rowNumber,
          column: 'email',
          params: { reference: 'email', value: email, matches: matches.length },
          message: `The e-mail "${email}" matches ${matches.length} customers of the store that differ only in letter case, so it is not clear which is meant.`,
          value: email
        })
      );
    }
    const [customer] = matches;
    const input: AddressWrite = { ...addressOf(data) };
    if (data.isDefault !== undefined) input.is_default = data.isDefault;

    try {
      if (args.resumed) {
        rules ??= await context.lookup.addressRules();
        const normalized = await rules.normalize(addressOf(data));
        const there = storedAddresses.get(customer.id) ?? [];
        if (there.some((address) => sameAddress(address, normalized))) {
          return outcome('created');
        }
      }
      await withRetries(
        () => services.createCustomerAddress(customer.uuid, input),
        {
          isTransient: isTransientDatabaseError,
          sleep: clock.sleep,
          onRetry,
          signal
        }
      );
      return outcome('created');
    } catch (error) {
      const problems = validationErrors(error);
      if (problems !== null && problems.length > 0) {
        return outcome('failed', ...addressIssues(problems, rowNumber));
      }
      const e = error as { message?: unknown; code?: unknown };
      return outcome(
        'failed',
        IMP_01.issue({
          rowNumber,
          params: typeof e?.code === 'string' ? { sqlState: e.code } : {},
          message: `The address of "${email}" could not be saved: ${String(
            e?.message ?? error
          )}`
        })
      );
    }
  }

  yield* all();
}
