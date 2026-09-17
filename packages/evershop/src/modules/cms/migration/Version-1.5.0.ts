import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * `contact_submission` — durable storage for the `contact_form` widget.
 *
 * The row is the source of truth; the notification email is best-effort. The
 * submit service commits this row BEFORE attempting to send, so a missing email
 * service, an unset store email, or an SMTP failure can never destroy a
 * visitor's message after the form has already told them it was received.
 * `email_sent` / `email_error` carry the outcome so a broken mail setup is
 * visible in the admin grid rather than silent.
 *
 * `widget_instance_id` is ON DELETE SET NULL on purpose: removing the widget
 * from a page must not delete the history of what people sent through it. The
 * FK is safe here because `widget_instance` is a cms table — same module, so
 * migration order is guaranteed (blog omits cross-module FKs for that reason).
 *
 * `status` is a string enum (`unread` | `read` | `spam`) following the
 * `blog_comment` convention rather than the older `smallint 0|1` one, because
 * these are named states rather than an on/off flag.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE "contact_submission" (
      "contact_submission_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "widget_instance_id" INT DEFAULT NULL,
      "name" varchar NOT NULL,
      "email" varchar NOT NULL,
      "phone" varchar DEFAULT NULL,
      "subject" varchar DEFAULT NULL,
      "message" text NOT NULL,
      "status" varchar NOT NULL DEFAULT 'unread',
      "email_sent" boolean NOT NULL DEFAULT FALSE,
      "email_error" text DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CONTACT_SUBMISSION_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FK_CONTACT_SUBMISSION_WIDGET" FOREIGN KEY ("widget_instance_id")
        REFERENCES "widget_instance" ("widget_instance_id") ON DELETE SET NULL
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "CONTACT_SUBMISSION_STATUS_IDX" ON "contact_submission" ("status", "created_at" DESC)`
  );
};
