import { select, type SelectQuery } from '@evershop/postgres-query-builder';

export const getContactSubmissionsBaseQuery = (): SelectQuery => {
  const query = select().from('contact_submission');
  // Live lookup, not a snapshot: if the sender registers (or their account is
  // deleted) after the message arrives, the admin badge should follow. Emails
  // are stored lowercased by `normalizeEmail`, and `customer.email` is written
  // as entered — so the join lowercases the customer side to stay symmetrical.
  query
    .leftJoin('customer')
    .on('LOWER(customer.email)', '=', 'LOWER(contact_submission.email)');
  query.select('contact_submission.contact_submission_id');
  query.select('contact_submission.uuid');
  query.select('contact_submission.name');
  query.select('contact_submission.email');
  query.select('contact_submission.phone');
  query.select('contact_submission.subject');
  query.select('contact_submission.message');
  query.select('contact_submission.status');
  query.select('contact_submission.email_sent');
  query.select('contact_submission.email_error');
  query.select('contact_submission.created_at');
  query.select('customer.uuid', 'customer_uuid');
  query.select('customer.full_name', 'customer_full_name');
  return query;
};
