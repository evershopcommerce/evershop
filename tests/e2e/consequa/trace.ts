import { inflateRawSync } from 'node:zlib';

/** At most this many requests per Test Execution, as Verification accepts; the rest are left out. */
export const MAX_REQUESTS = 500;

/** A request a Test made to its own application: only its method and path (ADR-0041). */
export interface TracedRequest {
  method: string;
  path: string;
}

/**
 * The requests a test made to its own application, read from its Playwright trace: each method and path once, in the
 * order first made. Its own application is any origin the test navigated to, or its `baseURL`. Requests to any other
 * origin are left out, as are query strings, fragments, hosts, headers and bodies, so nothing the request carried
 * leaves the customer side (ADR-0018). A trace with no navigation and no `baseURL` has no own origin, so no requests.
 */
export function tracedRequests(zip: Buffer): TracedRequest[] {
  const files = unzip(zip);
  const origins = new Set<string>();
  const requests: { method: string; url: string }[] = [];
  for (const [name, content] of files) {
    if (name.endsWith('.trace')) {
      for (const event of lines(content)) ownOrigins(event, origins);
    } else if (name.endsWith('.network')) {
      for (const event of lines(content)) {
        const request = field(field(event, 'snapshot'), 'request');
        const method = field(request, 'method');
        const url = field(request, 'url');
        if (typeof method === 'string' && typeof url === 'string') requests.push({ method, url });
      }
    }
  }

  const seen = new Map<string, TracedRequest>();
  for (const { method, url } of requests) {
    const parsed = parse(url);
    if (!parsed || !origins.has(parsed.origin)) continue;
    const request = { method: method.toUpperCase(), path: parsed.pathname };
    if (!/^[A-Z]{3,7}$/.test(request.method) || request.path.length > 2000) continue;
    seen.set(`${request.method} ${request.path}`, request);
    if (seen.size === MAX_REQUESTS) break;
  }
  return [...seen.values()];
}

/**
 * The field `name` of a trace event, or of something inside one, when it is an object that has it; undefined
 * otherwise. Playwright's trace format isn't a published contract, so each line is read as `unknown` and narrowed here,
 * and a line of any other shape, even `null`, is passed over rather than trusted. (Not zod, as elsewhere: the Runner
 * Service mounts only this package's sources into the tests' container, with no dependencies beside them.)
 */
function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Object.getOwnPropertyDescriptor(value, name)?.value : undefined;
}

/** Adds the origin a `context-options` event's `baseURL`, or a `goto`, names. */
function ownOrigins(event: unknown, origins: Set<string>): void {
  const type = field(event, 'type');
  const url =
    type === 'context-options'
      ? field(field(event, 'options'), 'baseURL')
      : type === 'before' && field(event, 'method') === 'goto'
        ? field(field(event, 'params'), 'url')
        : undefined;
  const origin = typeof url === 'string' ? parse(url)?.origin : undefined;
  if (origin && origin !== 'null') origins.add(origin);
}

function parse(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function* lines(content: Buffer): Generator<unknown> {
  for (const line of content.toString('utf8').split('\n')) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // A line Playwright cut short, such as when a worker stopped mid-write.
    }
  }
}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE = 0x02014b50;
const LOCAL_FILE = 0x04034b50;

/** The files in a zip that are stored or deflated, by name. Enough for the traces Playwright writes. */
export function unzip(zip: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) end -= 1;
  if (end < 0) return files;
  const entries = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  for (let i = 0; i < entries && zip.readUInt32LE(at) === CENTRAL_FILE; i++) {
    const method = zip.readUInt16LE(at + 10);
    const compressedSize = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (zip.readUInt32LE(local) !== LOCAL_FILE) continue;
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + compressedSize);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, inflateRawSync(data));
  }
  return files;
}
