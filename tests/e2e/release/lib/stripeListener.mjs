// Stripe webhooks for a scratch store. Stripe cannot reach localhost, so the
// Stripe CLI (`stripe listen`) opens a session to the test account and forwards
// its events to the store. Each session has its own signing secret (whsec_…),
// which the payment spec saves as the store's "Webhook Secret Key".
//
// The API key goes through the environment (STRIPE_API_KEY), never on the
// command line (`ps` and the run logs would show it), and the signing secret
// is masked in the log.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

/** The events the store's webhook handles (StripePayment.tsx helper text). */
export const STRIPE_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.amount_capturable_updated',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'charge.refunded'
];

const mask = (text) => text.replace(/whsec_[A-Za-z0-9]+/g, 'whsec_…');

/**
 * Start `stripe listen` forwarding to `forwardTo`. Resolves when the CLI says
 * it is ready, with the session's signing secret and a `stop()`.
 */
export function startStripeListener({
  apiKey,
  forwardTo,
  logFile,
  timeoutMs = 60_000
}) {
  return new Promise((resolve, reject) => {
    const log = fs.openSync(logFile, 'a');
    fs.writeSync(log, `\n$ stripe listen --forward-to ${forwardTo}\n`);
    const child = spawn(
      'stripe',
      ['listen', '--forward-to', forwardTo, '--events', STRIPE_EVENTS.join(',')],
      {
        env: {
          ...process.env,
          STRIPE_API_KEY: apiKey,
          STRIPE_CLI_TELEMETRY_OPTOUT: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    let settled = false;
    let seen = '';
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(
        new Error(
          `stripe listen was not ready within ${timeoutMs / 1000}s:\n${mask(
            seen
          ).slice(-1500)}`
        )
      );
    }, timeoutMs);
    const stop = () =>
      new Promise((done) => {
        if (child.exitCode !== null) return done();
        child.once('close', () => done());
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      });
    const onData = (chunk) => {
      const text = chunk.toString();
      fs.writeSync(log, mask(text));
      if (settled) return;
      seen += text;
      const secret = seen.match(/(whsec_[A-Za-z0-9]+)/);
      if (/Ready!/.test(seen) && secret) {
        settled = true;
        clearTimeout(timer);
        resolve({ secret: secret[1], stop });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `Could not start the Stripe CLI (${e.message}). Install it: brew install stripe/stripe-cli/stripe`
        )
      );
    });
    child.on('close', (code) => {
      fs.closeSync(log);
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `stripe listen exited with ${code} before it was ready:\n${mask(
            seen
          ).slice(-1500)}`
        )
      );
    });
  });
}
