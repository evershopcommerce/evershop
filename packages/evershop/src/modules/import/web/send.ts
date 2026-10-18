import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { EvershopResponse } from '../../../types/response.js';
import type { HttpResult, ImportWeb } from './ImportWeb.js';

/**
 * Writes what a handler answered. A JSON answer is sent as it is. A stream is
 * piped to the response, and when it fails after the first byte the connection
 * is destroyed, so the browser reports a failed download and does not save a cut
 * file that looks whole (§ 7.3).
 */
export async function send(
  web: ImportWeb,
  response: EvershopResponse,
  result: HttpResult
): Promise<void> {
  if (result.kind === 'json') {
    response.status(result.status);
    response.json(result.body);
    return;
  }
  response.status(result.status);
  for (const [name, value] of Object.entries(result.headers)) {
    response.setHeader(name, value);
  }
  try {
    await pipeline(Readable.from(result.body, { objectMode: false }), response);
  } catch (e) {
    web.logger.error('The file with errors could not be sent', {
      error: e instanceof Error ? e.message : String(e)
    });
    // `pipeline` has destroyed the response, and the connection with it.
  }
}
