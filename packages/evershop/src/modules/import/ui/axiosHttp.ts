import axios from 'axios';
import type { Http } from './importApi.js';

/**
 * Axios as the `Http` of the import pages. Any HTTP status is an answer (the page
 * reads the code in it); only a request that got none throws.
 */
/** The event of axios as (sent, total). A total that is not known is 0: the bar then stays at 0. */
export const progressOf = (event: {
  loaded: number;
  total?: number;
}): [number, number] => [event.loaded, event.total ?? 0];

export const axiosHttp: Http = {
  async send(request) {
    const reply = await axios.request({
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      data: request.body,
      onUploadProgress: request.onUploadProgress
        ? (event) => request.onUploadProgress!(...progressOf(event))
        : undefined,
      signal: request.signal,
      validateStatus: () => true
    });
    const headers: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(reply.headers ?? {})) {
      if (typeof value === 'string') headers[name] = value;
    }
    return { status: reply.status, headers, data: reply.data };
  }
};
