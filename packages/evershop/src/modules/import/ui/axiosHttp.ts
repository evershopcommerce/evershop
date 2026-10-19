import axios from 'axios';
import type { Http } from './importApi.js';

/**
 * Axios as the `Http` of the import pages. Any HTTP status is an answer (the page
 * reads the code in it); only a request that got none throws.
 */
export const axiosHttp: Http = {
  async send(request) {
    const reply = await axios.request({
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
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
