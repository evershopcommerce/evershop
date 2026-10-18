/** A SHA-256 that takes its input in pieces, for a file that is never held whole. */
export interface IncrementalHash {
  update(chunk: Uint8Array): void;
  /** The digest as 64 hexadecimal digits. Call it once, at the end. */
  digestHex(): string;
}

/**
 * Port: the stages cannot import `crypto` (§ 4.5). The real one is
 * `adapters/nodeSha256.ts`.
 */
export type Sha256 = () => IncrementalHash;
