// Release check only. Registers an email service that writes each email to
// RELEASE_CHECK_MAIL_DIR as JSON, so the specs can assert on what the store
// sent (order confirmation, password reset, …). Plain JavaScript in dist/
// because a production store loads only dist/ of a local extension.
import fs from 'node:fs';
import path from 'node:path';
import { registerEmailService } from '@evershop/evershop/lib/mail/emailHelper';

export default function bootstrap() {
  const dir = process.env.RELEASE_CHECK_MAIL_DIR;
  if (!dir) {
    return;
  }
  registerEmailService({
    async sendEmail(args) {
      fs.mkdirSync(dir, { recursive: true });
      const name = `${Date.now()}-${process.pid}-${Math.random()
        .toString(36)
        .slice(2, 8)}.json`;
      fs.writeFileSync(
        path.join(dir, name),
        JSON.stringify(
          {
            to: args.to,
            from: args.from,
            subject: args.subject,
            template: args.template,
            body: args.body,
            sentAt: new Date().toISOString()
          },
          null,
          2
        )
      );
    }
  });
}
