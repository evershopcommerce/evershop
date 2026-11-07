import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * `cart_email_added`: an open cart gets an email, or its email changes. This
 * is what an abandoned-cart sender (a Klaviyo extension, a job of your own, a
 * webhook) waits for: from then on the cart can be emailed, with a link from
 * `buildCartRecoveryUrl(cart_id)`.
 *
 * A trigger, so that every way a cart gets an email counts: a guest typing it
 * at checkout (`addCartContactInfo`), a customer signing in with a cart
 * (`[auth]addCustomerToCart`), a signed-in customer's new cart, the API, SQL.
 * `saveCart` writes every column on each save, so the email is compared: the
 * same email again writes nothing. A closed (ordered or restored) cart writes
 * nothing, nor does an import (`evershop.importing`, see Version-1.0.13).
 *
 * The payload names the cart by `cart_id`, not by its uuid, which opens the
 * cart through the public cart APIs: events are stored and sent to webhooks.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_cart_email_added_event() RETURNS TRIGGER AS $$
    BEGIN
      IF current_setting('evershop.importing', true) = 'on' THEN
        RETURN NEW;
      END IF;
      IF NEW."customer_email" IS NULL OR NEW."status" IS NOT TRUE THEN
        RETURN NEW;
      END IF;
      IF TG_OP = 'UPDATE' AND OLD."customer_email" IS NOT DISTINCT FROM NEW."customer_email" THEN
        RETURN NEW;
      END IF;
      INSERT INTO event (name, data)
      VALUES ('cart_email_added', json_build_object(
        'cart_id', NEW."cart_id",
        'customer_email', NEW."customer_email",
        'customer_id', NEW."customer_id"
      ));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );
  await execute(
    connection,
    `DROP TRIGGER IF EXISTS "ADD_CART_EMAIL_ADDED_EVENT_TRIGGER" ON "cart"`
  );
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CART_EMAIL_ADDED_EVENT_TRIGGER"
    AFTER INSERT OR UPDATE OF "customer_email" ON "cart"
    FOR EACH ROW
    EXECUTE PROCEDURE add_cart_email_added_event();`
  );
};
