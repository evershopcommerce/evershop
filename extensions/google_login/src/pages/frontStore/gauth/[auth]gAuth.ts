import { EvershopRequest, EvershopResponse } from "@evershop/evershop";
import { buildUrl } from "@evershop/evershop/lib/router";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { getGoogleAuthUrl } from "../../../services/getGoogleAuthUrl.js";

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  // Check if customer is already logged in
  if (request.isCustomerLoggedIn()) {
    response.redirect("/");
    return;
  }
  const client_id = getEnv("GOOGLE_LOGIN_CLIENT_ID");
  const homeUrl = getConfig("shop.homeUrl", "http://localhost:3000");
  const redirect_uri = `${homeUrl}${buildUrl("gcallback")}`;
  const googleAuthUrl = getGoogleAuthUrl(client_id, redirect_uri);
  response.redirect(googleAuthUrl);
};
