type Piece = Uint8Array | string;

const asBuffer = (piece: Piece): Buffer =>
  typeof piece === 'string' ? Buffer.from(piece) : Buffer.from(piece);

/**
 * Passes the pieces on and throws `exceeded()` as soon as more than `max` bytes
 * have arrived, before the next piece is read, so a file that is too large is
 * stopped while it streams and never held.
 */
export async function* limitBytes(
  source: AsyncIterable<Piece>,
  max: number,
  exceeded: () => Error
): AsyncGenerator<Buffer, void, undefined> {
  let total = 0;
  for await (const piece of source) {
    const buffer = asBuffer(piece);
    total += buffer.length;
    if (total > max) {
      throw exceeded();
    }
    yield buffer;
  }
}

/**
 * Cuts a stream of pieces of any size into chunks of exactly `size` bytes; only
 * the last may be smaller, and an empty stream gives no chunk. At most `size`
 * bytes and the piece in hand are held at a time.
 */
export async function* rechunk(
  source: AsyncIterable<Piece>,
  size: number
): AsyncGenerator<Buffer, void, undefined> {
  let pending: Buffer[] = [];
  let held = 0;
  for await (const piece of source) {
    const buffer = asBuffer(piece);
    if (buffer.length === 0) continue;
    pending.push(buffer);
    held += buffer.length;
    if (held >= size) {
      const all = Buffer.concat(pending, held);
      let at = 0;
      while (held - at >= size) {
        yield all.subarray(at, at + size);
        at += size;
      }
      pending = at < held ? [all.subarray(at)] : [];
      held -= at;
    }
  }
  if (held > 0) {
    yield Buffer.concat(pending, held);
  }
}
