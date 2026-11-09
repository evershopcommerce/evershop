import type { Readable } from 'stream';
import {
  customerValidator,
  type CustomerRow,
  type CustomerState
} from '../entities/customer/customerValidator.js';
import type { HeaderInfo, ValidationContext } from '../entities/definition.js';
import {
  mergeMetaData,
  missingRequired,
  readMetafields
} from '../entities/metafields.js';
import type { CustomerPlan } from '../plan/customerPlan.js';
import type { Clock } from '../ports/clock.js';
import type {
  NamedRecord,
  StoredCustomer,
  StoredMetafield
} from '../ports/lookup.js';
import type { CustomerWrite, EntityServices } from '../ports/services.js';
import { readCsv } from '../reader/readCsv.js';
import type { CsvLimits } from '../reader/readCsv.js';
import { isTransientDatabaseError, withRetries } from '../retry.js';
import { ALL_16, ALL_21 } from '../rules/allRules.js';
import { CUS_04, CUS_07, CUS_10 } from '../rules/customerRules.js';
import { IMP_01, IMP_02 } from '../rules/importPhaseRules.js';
import { say } from '../say.js';
import type { ImportIssue } from '../types.js';
import type { WriteOutcome, WriteResult } from './categoryWriter.js';

export interface CustomerWriterArgs {
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  header: HeaderInfo;
  state: CustomerState;
  plan: CustomerPlan;
  /** The reading context: the store to ask, the mode, the time, the hash. */
  context: ValidationContext;
  services: EntityServices;
  clock: Pick<Clock, 'sleep'>;
  /** The job is a resumed one (IMP-07): a customer that exists is updated even in mode `create`. */
  resumed?: boolean;
  include?: (unit: { unit: number; rowNumber: number; key: string }) => boolean;
  signal?: AbortSignal;
  /** Rows whose current state is asked of the store together. */
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 1000;

// The unique index of the e-mail and the column it is about.
const CONSTRAINT_COLUMNS: Record<string, string> = {
  EMAIL_UNIQUE: 'email'
};

function failure(error: unknown, row: CustomerRow): ImportIssue {
  const { rowNumber } = row;
  const email = row.data.email as string;
  const e = error as {
    message?: unknown;
    code?: unknown;
    constraint?: unknown;
  };
  if (e?.code === '23505') {
    const constraint =
      typeof e.constraint === 'string' ? e.constraint : undefined;
    const column = constraint ? CONSTRAINT_COLUMNS[constraint] : undefined;
    return IMP_02.issue({
      rowNumber,
      column,
      params: { constraint, sqlState: '23505' },
      message: column
        ? say`The ${column} "${email}" is already used by another customer.`
        : say`A value of the customer "${email}" is already used by another record.`,
      value: column === 'email' ? email : undefined
    });
  }
  return IMP_01.issue({
    rowNumber,
    params: typeof e?.code === 'string' ? { sqlState: e.code } : {},
    message: say`The customer "${email}" could not be saved: ${String(
      e?.message ?? error
    )}`
  });
}

/**
 * Writes the customers of a file that has been checked, in the order of the file
 * (§ 4.3: they depend on nothing). A customer is created without the welcome
 * e-mail, with the password the file gives (a hash as it is, a plain one, or one
 * that nobody knows, D-27); a customer that exists is updated, and the password
 * columns are not read (CUS-09). The custom fields are saved after the customer,
 * with a call of their own, because core has no create-time path (CUS-10): when
 * that call fails the row is failed with the customer saved, and a re-run
 * completes it.
 */
export async function* writeCustomers(
  args: CustomerWriterArgs
): AsyncGenerator<WriteOutcome, void, undefined> {
  const { context, services, clock, signal } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
  let definitions: ReadonlyMap<string, StoredMetafield> | null = null;
  const groups = new Map<string, NamedRecord[]>();
  let unit = 0;

  async function* readRows(): AsyncGenerator<CustomerRow, void, undefined> {
    for await (const event of readCsv(args.open(), args.limits)) {
      if (event.type !== 'row') continue;
      const row = customerValidator.convert(event.row, args.header, context);
      // The rows that were indexed, and only those (see categoryRowsAtLevel).
      if (
        row.key === null ||
        args.state.firstRow.get(row.key) !== row.rowNumber
      ) {
        continue;
      }
      yield row;
    }
  }

  async function* writeBatch(
    batch: CustomerRow[]
  ): AsyncGenerator<WriteOutcome, void, undefined> {
    const stored = await context.lookup.customers(
      batch.map((row) => row.key as string)
    );
    const names = [
      ...new Set(
        batch.flatMap((row) =>
          row.data.group ? [row.data.group.trim().toLowerCase()] : []
        )
      )
    ].filter((name) => !groups.has(name));
    if (names.length > 0) {
      const found = await context.lookup.customerGroups(names);
      for (const name of names) groups.set(name, found.get(name) ?? []);
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
      yield await writeOne(row, unit, stored.get(key) ?? []);
    }
  }

  async function* all(): AsyncGenerator<WriteOutcome, void, undefined> {
    let batch: CustomerRow[] = [];
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
    row: CustomerRow,
    unitNumber: number,
    matches: StoredCustomer[]
  ): Promise<WriteOutcome> {
    const key = row.key as string;
    const { rowNumber, data } = row;
    const email = data.email as string;
    let retries = 0;
    const onRetry = () => {
      retries += 1;
    };
    const retry = <T>(call: () => Promise<T>) =>
      withRetries(call, {
        isTransient: isTransientDatabaseError,
        sleep: clock.sleep,
        onRetry,
        signal
      });
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

    if (matches.length > 1) {
      return outcome(
        'failed',
        ALL_21.issue({
          rowNumber,
          column: 'email',
          params: { reference: 'email', value: email, matches: matches.length },
          message: say`The e-mail "${email}" matches ${matches.length} customers of the store that differ only in letter case, so it is not clear which is meant.`,
          value: email
        })
      );
    }
    const existing = matches[0] ?? null;
    if (args.context.mode === 'create' && existing && !args.resumed) {
      return outcome(
        'failed',
        ALL_16.issue({
          code: 'ALREADY_EXISTS',
          rowNumber,
          column: 'email',
          params: { key: email },
          message: say`The customer "${email}" already exists, and this import only creates new ones.`,
          value: email
        })
      );
    }
    if (args.context.mode === 'update' && !existing) {
      return outcome(
        'failed',
        ALL_16.issue({
          code: 'NOT_FOUND',
          rowNumber,
          column: 'email',
          params: { key: email },
          message: say`The customer "${email}" does not exist, and this import only updates existing ones.`,
          value: email
        })
      );
    }

    // The group, by name, as the store has it now.
    let groupId: number | undefined;
    if (data.group !== undefined) {
      const found = groups.get(data.group.trim().toLowerCase()) ?? [];
      if (found.length === 0) {
        return outcome(
          'failed',
          CUS_04.issue({
            rowNumber,
            column: 'group',
            params: { reference: 'customer group', value: data.group },
            message: say`The customer group "${data.group}" is no longer a group of the store.`,
            value: data.group
          })
        );
      }
      if (found.length > 1) {
        return outcome(
          'failed',
          ALL_21.issue({
            rowNumber,
            column: 'group',
            params: {
              reference: 'customer group',
              value: data.group,
              matches: found.length
            },
            message: say`The customer group "${data.group}" matches ${found.length} groups, so it is not clear which is meant.`,
            value: data.group
          })
        );
      }
      groupId = found[0].id;
    }

    // The custom fields: read and checked again, as the definitions may have
    // changed since the check; the stored set is kept, key by key (§ 5.9).
    definitions ??= await context.lookup.metafields('customer');
    const read = readMetafields({
      rowNumber,
      cells: data.metafields,
      definitions,
      deps: { now: context.now(), sha256Hex: context.sha256Hex }
    });
    const lacking = missingRequired({
      rowNumber,
      key: email,
      creates: !existing,
      cells: data.metafields,
      stored: existing?.metaData ?? null,
      definitions
    });
    if (read.issues.length + lacking.length > 0) {
      return outcome('failed', ...read.issues, ...lacking);
    }
    const hasCells = Object.keys(read.values).length > 0;
    const metafields =
      hasCells || (!existing && definitions.size > 0)
        ? mergeMetaData(existing?.metaData, read.values)
        : undefined;

    let id: number;
    try {
      if (existing) {
        // The e-mail is the identity of the row, so it is not sent; the password
        // columns are not read (CUS-09).
        const input: CustomerWrite = {};
        if (data.full_name !== undefined) input.full_name = data.full_name;
        if (data.status !== undefined) input.status = data.status;
        if (groupId !== undefined) input.group_id = groupId;
        if (Object.keys(input).length > 0) {
          await retry(() => services.updateCustomer(existing.uuid, input));
        }
        id = existing.id;
      } else {
        if (data.password !== undefined && data.password_hash !== undefined) {
          return outcome(
            'failed',
            CUS_07.issue({
              rowNumber,
              column: 'password',
              params: { reason: 'both' },
              message: say`Give either a password or a password_hash, not both.`
            })
          );
        }
        const input: CustomerWrite = {
          email,
          full_name: data.full_name as string
        };
        if (data.status !== undefined) input.status = data.status;
        if (groupId !== undefined) input.group_id = groupId;
        if (data.password !== undefined) input.password = data.password;
        else if (data.password_hash !== undefined)
          input.passwordHash = data.password_hash;
        else input.noPassword = true;
        id = (await retry(() => services.createCustomer(input))).id;
      }
    } catch (error) {
      return outcome('failed', failure(error, row));
    }

    if (metafields !== undefined) {
      try {
        await retry(() => services.setCustomerMetafields(id, metafields));
      } catch (error) {
        return outcome(
          'failed',
          CUS_10.issue({
            rowNumber,
            params: {},
            message: existing
              ? say`The customer "${email}" was updated, but the custom fields could not be saved: ${String(
                  (error as { message?: unknown })?.message ?? error
                )}. Importing the file again completes it.`
              : say`The customer "${email}" was created, but the custom fields could not be saved: ${String(
                  (error as { message?: unknown })?.message ?? error
                )}. Importing the file again completes it.`
          })
        );
      }
    }
    return outcome(existing ? 'updated' : 'created');
  }

  yield* all();
}
