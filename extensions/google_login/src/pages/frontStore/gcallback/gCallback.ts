import { buildUrl } from "@evershop/evershop/lib/router";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { select } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/lib/postgres";
import { createCustomer } from "@evershop/evershop/customer/services";
import { error } from "@evershop/evershop/lib/log";
import { getGoogleAuthToken } from "../../../services/getGoogleAuthToken.js";
import { getGoogleUserInfo } from "../../../services/getGoogleUserInfo.js";

export default async (request, response, next) => {
  const { code } = request.query;
  const client_id = getEnv("GOOGLE_LOGIN_CLIENT_ID");
  const client_secret = getEnv("GOOGLE_LOGIN_CLIENT_SECRET");
  const homeUrl = getConfig("shop.homeUrl", "http://localhost:3000");
  const redirect_uri = `${homeUrl}${buildUrl("gcallback")}`;
  const successUrl = getEnv("GOOGLE_LOGIN_SUCCESS_REDIRECT_URL", homeUrl);
  const failureUrl = getEnv(
    "GOOGLE_LOGIN_FAILURE_REDIRECT_URL",
    `${homeUrl}${buildUrl("login")}`
  );

  try {
    // Get the access token from google using the code
    const { id_token, access_token } = await getGoogleAuthToken(
      code,
      client_id,
      client_secret,
      redirect_uri
    );

    // Get the user info from google using the access token
    const userInfo = await getGoogleUserInfo(access_token, id_token);

    // Check if the email exists in the database
    let customer = await select()
      .from("customer")
      .where("email", "=", userInfo.email)
      .load(pool);

    if (customer && customer.is_google_login === false) {
      throw new Error("This email is already registered");
    }
    if (customer && customer.status !== 1) {
      throw new Error("This account is disabled");
    }

    // Create a fake strong password
    const password = Math.random().toString(36).substring(2, 15);
    if (!customer) {
      // If the email does not exist, create a new customer
      customer = await createCustomer(
        {
          email: userInfo.email,
          full_name: userInfo.name,
          status: 1,
          is_google_login: true,
          password,
        },
        {
          googleLogin: true,
        }
      );
    }
    // Delete the password field
    delete customer.password;
    // Login the customer
    request.session.customerID = customer.customer_id;

    // Save the customer in the request
    request.locals.customer = customer;
    request.session.save((e) => {
      if (e) {
        error(e);
        response.redirect(failureUrl);
      } else {
        response.redirect(successUrl);
      }
    });
  } catch (err) {
    error(err);
    response.redirect(failureUrl);
  }
};
