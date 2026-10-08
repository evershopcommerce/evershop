import { insert, update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { getAjv } from '../../../base/services/getAjv.js';
import contactSubmissionDataSchema from './contactSubmissionDataSchema.json' with { type: 'json' };
import {
  normalizeEmail,
  toPlainMultiline,
  toPlainText
} from './sanitizeContactText.js';
import { sendContactFormEmail } from './sendContactFormEmail.js';

export interface SubmitContactFormInput {
  widget_instance_id?: number | null;
  name: unknown;
  email: unknown;
  phone?: unknown;
  subject?: unknown;
  message: unknown;
  /** Honeypot — a hidden field humans never see. */
  website?: unknown;
}

export interface SubmitContactFormResult {
  uuid: string;
  status: 'unread' | 'spam';
  /**
   * Whether the store notification went out. The storefront does NOT surface
   * this — a visitor should not be told about the store's mail configuration —
   * but the admin grid does.
   */
  emailSent: boolean;
}

/**
 * Persist first, email second.
 *
 * The row is committed before any mail is attempted, so no delivery problem —
 * a missing email service, an unset store email, a dead SMTP host — can ever
 * destroy a visitor's message after the form has told them it was received.
 * The send outcome is written back to `email_sent` / `email_error` so a broken
 * setup is visible in the admin instead of silent.
 */
export async function submitContactForm(
  data: SubmitContactFormInput
): Promise<SubmitContactFormResult> {
  // Bots fill the hidden `website` field. Store the row (so it can be reviewed)
  // but mark it spam, and never tell the caller it was treated differently.
  const honeypotTripped = !!(data.website && String(data.website).trim());

  const name = toPlainText(data.name, 120);
  // Lowercased at the door so the admin's "is this an existing customer?"
  // lookup is a plain equality join rather than a per-read LOWER().
  const email = normalizeEmail(data.email);
  const phone = data.phone ? toPlainText(data.phone, 40) : null;
  const subject = data.subject ? toPlainText(data.subject, 200) : null;
  const message = toPlainMultiline(data.message, 5000);

  const ajv = getAjv();
  const validate = ajv.compile(contactSubmissionDataSchema as any);
  const candidate = { name, email, phone, subject, message };
  if (!validate(candidate)) {
    throw new Error(validate.errors[0].message);
  }

  // A message that is mostly links is the other classic spam signature.
  const linkCount = (message.match(/https?:\/\//g) || []).length;
  const status: 'unread' | 'spam' =
    honeypotTripped || linkCount > 3 ? 'spam' : 'unread';

  const inserted = await insert('contact_submission')
    .given({
      widget_instance_id: data.widget_instance_id ?? null,
      name,
      email,
      phone,
      subject,
      message,
      status
    })
    .execute(pool);

  // Past this point nothing may throw: the message is already safely stored and
  // the visitor is about to be told it was received.
  if (status === 'spam') {
    return { uuid: inserted.uuid, status, emailSent: false };
  }

  let emailSent = false;
  let emailError: string | null = null;
  try {
    const result = await sendContactFormEmail({
      name,
      email,
      phone,
      subject,
      message
    });
    emailSent = result.sent;
    emailError = result.sent ? null : result.reason ?? null;
  } catch (e) {
    emailError = e instanceof Error ? e.message : String(e);
  }

  try {
    await update('contact_submission')
      .given({ email_sent: emailSent, email_error: emailError })
      .where('uuid', '=', inserted.uuid)
      .execute(pool);
  } catch {
    // Recording the outcome is diagnostics, not the contract. The submission
    // itself is already committed; never fail the request over this.
  }

  return { uuid: inserted.uuid, status, emailSent };
}
