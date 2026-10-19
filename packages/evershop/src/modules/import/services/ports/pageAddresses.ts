/** The kinds of record that get a page address after they are created. */
export type PageEntity = 'product' | 'category';

/**
 * The page addresses of what an import created (§ 9, IMP-08). A page address is
 * made by a subscriber of the creation event, after the commit. When the event
 * process is restarted while it works, core marks the events it was processing
 * as lost, and the record never gets its `url_rewrite` row. This repairs that.
 *
 * The real one is `PgPageAddresses`; the test double is `MemoryPageAddresses`.
 */
export interface PageAddresses {
  /**
   * Writes the creation event again for each record of this kind created since
   * `since` (ms) that has no page address and no event that is still to be
   * handled. Returns how many it wrote. Writing the event again is safe: the
   * subscribers set the address of a record, so a record that has one gets the
   * same one.
   */
  reemitMissing(entity: PageEntity, since: number): Promise<number>;
}
