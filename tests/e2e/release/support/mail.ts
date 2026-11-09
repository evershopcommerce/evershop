// Emails the store sent, as written by the release-check-mail extension.
import fs from 'node:fs';
import path from 'node:path';
import { releaseStore } from './store';

export interface CapturedMail {
  to: string;
  from: string;
  subject: string;
  template: string;
  body: string;
  sentAt: string;
}

export function allMail(): CapturedMail[] {
  const dir = releaseStore().mailDir;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map(
      (f) =>
        JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as CapturedMail
    );
}

/** Wait for an email to `to` whose subject matches. The event process sends
 *  emails, so this also proves the background process works. */
export async function waitForMail(
  to: string,
  subject: RegExp,
  timeoutMs = 60_000
): Promise<CapturedMail> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const mail = allMail().find(
      (m) => m.to.toLowerCase() === to.toLowerCase() && subject.test(m.subject)
    );
    if (mail) return mail;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const seen = allMail().map((m) => `${m.to}: ${m.subject}`);
  throw new Error(
    `No email to ${to} matching ${subject} within ${timeoutMs / 1000}s. Sent: ${
      seen.join(' | ') || 'none'
    }`
  );
}
