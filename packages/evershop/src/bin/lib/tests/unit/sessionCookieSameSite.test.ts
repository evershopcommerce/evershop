import http from 'http';
import axios from 'axios';
import config from 'config';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { getSessionConfig } from '../../../../modules/auth/services/getSessionConfig.js';
import { addDefaultMiddlewareFuncs } from '../../addDefaultMiddlewareFuncs.js';

describe('session cookie SameSite defaults and overrides', () => {
  it('defaults sameSite to lax and respects system.session.sameSite overrides', () => {
    const defaultCfg = getSessionConfig('secret');
    expect(defaultCfg.cookie?.sameSite).toBe('lax');

    const prevHas = config.has('system.session.sameSite');
    const prevVal = prevHas ? config.get('system.session.sameSite') : undefined;
    try {
      (config as unknown as { system: { session: Record<string, unknown> } }).system = {
        ...(config.has('system') ? (config.get('system') as object) : {}),
        session: {
          ...(config.has('system.session') ? (config.get('system.session') as object) : {}),
          sameSite: 'strict'
        }
      };
      const overridden = getSessionConfig('secret');
      expect(overridden.cookie?.sameSite).toBe('strict');
    } finally {
      const sys = (config as unknown as { system?: { session?: Record<string, unknown> } }).system;
      if (sys?.session) {
        if (prevHas) {
          sys.session.sameSite = prevVal;
        } else {
          delete sys.session.sameSite;
        }
      }
    }
  });

  describe('HTTP Set-Cookie header emission', () => {
    let server: http.Server;
    let port: number;

    beforeAll(async () => {
      const app = express();
      addDefaultMiddlewareFuncs(app);
      app.get('/admin/ping', (req, res) => {
        (req as unknown as { currentRoute?: { isAdmin?: boolean } }).currentRoute = {
          isAdmin: true
        };
        res.status(200).send('admin-ok');
      });
      app.get('/ping', (_req, res) => {
        res.status(200).send('store-ok');
      });

      server = http.createServer(app);
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          port = (server.address() as { port: number }).port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    });

    it('sets SameSite=Lax on the storefront session cookie', async () => {
      const res = await axios.get(`http://127.0.0.1:${port}/ping`);
      const cookies = res.headers['set-cookie'] ?? [];
      const sid = cookies.find((c) => c.startsWith('sid='));
      expect(sid).toBeDefined();
      expect(sid).toMatch(/;\s*SameSite=Lax/i);
    });

    it('sets SameSite=Lax on the admin session cookie when routed as admin', async () => {
      const app = express();
      app.use((req, _res, next) => {
        (req as unknown as { currentRoute?: { id: string; isAdmin: boolean } }).currentRoute = {
          id: 'adminPing',
          isAdmin: true
        };
        next();
      });
      addDefaultMiddlewareFuncs(app);
      app.get('/admin/ping', (_req, res) => {
        res.status(200).send('ok');
      });

      const adminServer = http.createServer(app);
      const adminPort = await new Promise<number>((resolve) => {
        adminServer.listen(0, '127.0.0.1', () => {
          resolve((adminServer.address() as { port: number }).port);
        });
      });
      try {
        const res = await axios.get(`http://127.0.0.1:${adminPort}/admin/ping`);
        const cookies = res.headers['set-cookie'] ?? [];
        const asid = cookies.find((c) => c.startsWith('asid='));
        expect(asid).toBeDefined();
        expect(asid).toMatch(/;\s*SameSite=Lax/i);
      } finally {
        await new Promise<void>((resolve, reject) => {
          adminServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    });
  });
});
