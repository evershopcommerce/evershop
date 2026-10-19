import type {
  PageAddresses,
  PageEntity
} from '../services/ports/pageAddresses.js';

/**
 * TEST-ONLY. The records that lack a page address, by kind, as a test sets them.
 * `reemitMissing` records what it was asked and gives back (and forgets) the
 * records it "wrote the event for". It can be made to fail.
 */
export class MemoryPageAddresses implements PageAddresses {
  /** The number of records of each kind that are missing their address. */
  readonly missing: Record<PageEntity, number> = { product: 0, category: 0 };

  /** Every call: the kind, and the time it was given. */
  readonly calls: Array<{ entity: PageEntity; since: number }> = [];

  /** Makes the next call(s) throw this. */
  failWith: Error | null = null;

  async reemitMissing(entity: PageEntity, since: number): Promise<number> {
    this.calls.push({ entity, since });
    if (this.failWith) {
      throw this.failWith;
    }
    const n = this.missing[entity];
    this.missing[entity] = 0;
    return n;
  }
}
