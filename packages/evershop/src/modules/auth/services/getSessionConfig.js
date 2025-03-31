import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';
import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';
import sessionStorage from 'connect-pg-simple';
import session from 'express-session';

export const getSessionConfig = (cookieSecret) => {
  const sess = {
    store: new (sessionStorage(session))({
      pool
    }),
    secret: cookieSecret,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000
    },
    resave: getConfig('system.session.resave', false),
    saveUninitialized: getConfig('system.session.saveUninitialized', false)
  };

  return sess;
};
