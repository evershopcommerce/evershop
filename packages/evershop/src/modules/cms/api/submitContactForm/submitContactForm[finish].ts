import { pool } from '../../../../lib/postgres/connection.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { asUuidOrNull } from '../../services/contact/sanitizeContactText.js';
import { submitContactForm } from '../../services/contact/submitContactForm.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const body = (request.body || {}) as Record<string, any>;

  // The widget instance is resolved server-side and only used to attribute the
  // submission. Nothing about the recipient comes from the client — that is
  // read from the store email setting inside the service — so a forged or
  // missing widget_uuid cannot turn this endpoint into an open relay.
  //
  // The value must be shape-checked before it reaches the query: it is compared
  // against a UUID column, and PostgreSQL raises `invalid input syntax for type
  // uuid` on anything malformed. Without the guard, an anonymous request with
  // `{"widget_uuid":"x"}` 500s this public route.
  let widgetInstanceId: number | null = null;
  const widgetUuid = asUuidOrNull(body.widget_uuid);
  if (widgetUuid) {
    const widgetRow = await pool.query(
      `SELECT widget_instance_id FROM widget_instance WHERE uuid = $1`,
      [widgetUuid]
    );
    widgetInstanceId = widgetRow.rows[0]?.widget_instance_id ?? null;
  }

  return await submitContactForm({
    widget_instance_id: widgetInstanceId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    subject: body.subject,
    message: body.message,
    website: body.website
  });
};
