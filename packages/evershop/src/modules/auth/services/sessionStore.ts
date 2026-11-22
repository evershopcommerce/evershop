import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '../../../lib/postgres/connection.js';

let store: session.Store | undefined;

/**
 * This process's session store: the sessions are rows of the `session` table.
 *
 * It is made once, on first use, and shared. On its first read, a
 * connect-pg-simple store starts a timer that deletes expired sessions about
 * every 15 minutes, then starts it again. That timer keeps the store in
 * memory for as long as the process runs. A store made for each request was
 * never freed (about 5.6 KB per request), and each one kept running its own
 * delete.
 */
export function getSessionStore(): session.Store {
  if (!store) {
    store = new (sessionStorage(session))({ pool }) as session.Store;
  }
  return store;
}

/**
 * Read a session by its id, for the routes that do not run the session
 * middleware (the API routes). Resolves to `null` when the session does not
 * exist or has expired.
 */
export function loadSession(
  sessionID: string
): Promise<session.SessionData | null> {
  return new Promise((resolve, reject) => {
    getSessionStore().get(sessionID, (e, data) => {
      if (e) {
        reject(e);
      } else {
        resolve(data ?? null);
      }
    });
  });
}
