import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';

export const getSessionConfig = (cookieSecret): session.SessionOptions => {
  const sess = {
    store: new (sessionStorage(session))({
      pool
    }),
    secret: cookieSecret,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000
    },
    resave: getConfig('system.session.resave', false),
    saveUninitialized: getConfig('system.session.saveUninitialized', false),
    // Auto-extend the session cookie on every request. Required for the
    // page builder, where merchandisers may edit for hours between
    // explicit auth events. See spec 03 § 7 prerequisite.
    rolling: getConfig('system.session.rolling', true)
  };

  return sess;
};
