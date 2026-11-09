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

  /** The records (by id) that have no page address yet; every other has one. */
  readonly withoutAddress: Record<PageEntity, Set<number>> = {
    product: new Set(),
    category: new Set()
  };

  /** Every look for page addresses: the kind and the ids asked about. */
  readonly looks: Array<{ entity: PageEntity; ids: number[] }> = [];

  /** The next looks that find no address at all, whatever was asked: the event is still to be handled. */
  holdBack = 0;

  /** Runs at each look, before it answers: a test makes an address appear here. */
  onLook: (() => void) | null = null;

  async withAddress(
    entity: PageEntity,
    ids: readonly number[]
  ): Promise<Set<number>> {
    this.looks.push({ entity, ids: [...ids] });
    this.onLook?.();
    if (this.holdBack > 0) {
      this.holdBack -= 1;
      return new Set();
    }
    return new Set(ids.filter((id) => !this.withoutAddress[entity].has(id)));
  }

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
