import type { IssueView, JobView } from '../web/jobView.js';

/** The header that the routes that change an import require (§ 8.3). */
export const IMPORT_REQUEST_HEADER = 'X-Import-Request';

export type HttpMethod = 'GET' | 'POST' | 'DELETE';

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  signal?: AbortSignal;
}

/** What came back: any HTTP status is an answer; only no answer at all is a throw. */
export interface HttpReply {
  status: number;
  headers: Record<string, string | undefined>;
  data: unknown;
}

/** The one thing the page needs from a browser: a request that never rejects on a status. */
export interface Http {
  send(request: HttpRequest): Promise<HttpReply>;
}

/** An answer that is not a success, as the page needs to show and to act on it. */
export interface ApiFailure {
  /** 0 when there was no answer (network down, or the request was aborted). */
  status: number;
  /** The code of § 8.3, when the API sent one. */
  code: string | null;
  message: string;
  details: Record<string, unknown>;
  /** From the `Retry-After` header of a 429, in milliseconds. */
  retryAfterMs: number | null;
  aborted: boolean;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiFailure };

export interface IssuesPage {
  phase: 'validate' | 'import';
  page: number;
  limit: number;
  total: number;
  byCode: Record<string, number>;
  truncated: boolean;
  items: IssueView[];
}

export interface IssuesQuery {
  severity?: 'error' | 'warning';
  code?: string;
  column?: string;
  page?: number;
  limit?: number;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};

/**
 * `Retry-After` is a number of seconds or a date (RFC 9110). A value that is
 * neither, or a date in the past, is no help: the page then uses its own wait.
 */
export function parseRetryAfter(
  value: string | undefined,
  nowMs: number
): number | null {
  if (value === undefined) return null;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  // A date has a name in it ("Mon, 19 Oct 2026 ..."): `Date.parse` would read
  // "-3" or "1.5" as a year or a month, which is not what a server meant.
  if (!/[A-Za-z]/.test(text)) return null;
  const date = Date.parse(text);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - nowMs);
}

/** The reply of a refused request, in the shape of core's error (§ 8.3). */
function failureOf(reply: HttpReply, nowMs: number): ApiFailure {
  const error = asRecord(asRecord(reply.data).error);
  const retryAfter = Object.entries(reply.headers).find(
    ([name]) => name.toLowerCase() === 'retry-after'
  )?.[1];
  return {
    status: reply.status,
    code: typeof error.code === 'string' ? error.code : null,
    message:
      typeof error.message === 'string'
        ? error.message
        : `The request failed (${reply.status}).`,
    details: asRecord(error.details),
    retryAfterMs: parseRetryAfter(retryAfter, nowMs),
    aborted: false
  };
}

/**
 * The calls of the import pages. The addresses come from the page's GraphQL
 * query (`url(routeId: ...)`), so a store that moves its API keeps working. Every
 * call that changes an import carries the header that a form on another site
 * cannot send; the reads do not need it.
 */
export function createImportApi(http: Http, clock: () => number) {
  async function call<T>(
    request: HttpRequest,
    pick: (data: unknown) => T
  ): Promise<ApiResult<T>> {
    let reply: HttpReply;
    try {
      reply = await http.send(request);
    } catch (e) {
      return {
        ok: false,
        error: {
          status: 0,
          code: null,
          message: e instanceof Error ? e.message : 'The request failed.',
          details: {},
          retryAfterMs: null,
          aborted: request.signal?.aborted === true
        }
      };
    }
    if (reply.status >= 200 && reply.status < 300) {
      return { ok: true, data: pick(asRecord(reply.data).data) };
    }
    return { ok: false, error: failureOf(reply, clock()) };
  }

  const changing = (method: HttpMethod, url: string): HttpRequest => ({
    method,
    url,
    headers: { [IMPORT_REQUEST_HEADER]: '1' }
  });

  return {
    getJob: (url: string, signal?: AbortSignal) =>
      call<JobView>({ method: 'GET', url, signal }, (d) => d as JobView),

    /** The open jobs of every entity, and the stopped or interrupted ones (§ 8.3). */
    listOpen: (url: string, signal?: AbortSignal) =>
      call<JobView[]>({ method: 'GET', url, signal }, (d) => d as JobView[]),

    issues: (url: string, query: IssuesQuery, signal?: AbortSignal) => {
      const params: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') params[key] = value;
      }
      return call<IssuesPage>(
        { method: 'GET', url, params, signal },
        (d) => d as IssuesPage
      );
    },

    start: (url: string) =>
      call<JobView>(changing('POST', url), (d) => d as JobView),
    cancel: (url: string) =>
      call<JobView & { cancel?: string }>(
        changing('POST', url),
        (d) => d as JobView & { cancel?: string }
      ),
    resume: (url: string) =>
      call<JobView>(changing('POST', url), (d) => d as JobView),
    recheck: (url: string) =>
      call<JobView>(changing('POST', url), (d) => d as JobView),
    remove: (url: string) =>
      call<JobView>(changing('DELETE', url), (d) => d as JobView)
  };
}

export type ImportApi = ReturnType<typeof createImportApi>;
