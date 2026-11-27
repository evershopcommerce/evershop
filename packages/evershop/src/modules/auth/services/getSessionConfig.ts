import session from 'express-session';
import { getConfig } from '../../../lib/util/getConfig.js';
import isProductionMode from '../../../lib/util/isProductionMode.js';
import { getSessionStore } from './sessionStore.js';

export type SessionSameSite = boolean | 'lax' | 'strict' | 'none';

/**
 * Builds fresh session middleware options so storefront and admin session
 * middlewares share the same cookie security and persistence defaults without
 * aliasing their nested `cookie` objects.
 */
export const getSessionConfig = (
  cookieSecret: string
): session.SessionOptions => {
  const sess: session.SessionOptions = {
    // The store the API routes read sessions from too (sessionStore.ts)
    store: process.env.NODE_ENV === 'test' ? undefined : getSessionStore(),
    secret: cookieSecret,
    cookie: {
      maxAge: getConfig('system.session.maxAge', 24 * 60 * 60 * 1000),
      sameSite: getConfig('system.session.sameSite', 'lax') as SessionSameSite
    },
    resave: getConfig('system.session.resave', false),
    saveUninitialized: getConfig('system.session.saveUninitialized', true)
  };

  if (isProductionMode()) {
    // trust proxy is set centrally from TRUST_PROXY_HOPS in bin/lib/app.js.
    sess.cookie!.secure = false;
  }

  return sess;
};
