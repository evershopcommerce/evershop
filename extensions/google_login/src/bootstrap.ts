import { merge } from "@evershop/evershop/lib/util/merge";
import { addProcessor } from "@evershop/evershop/lib/util/registry";

export default () => {
  addProcessor("configuratonSchema", (schema) => {
    merge(
      schema as any,
      {
        properties: {
          google_login: {
            type: "object",
            properties: {
              client_id: {
                type: "string",
              },
              client_secret: {
                type: "string",
              },
              success_redirect_url: {
                type: "string",
                format: "uri",
              },
              failure_redirect_url: {
                type: "string",
                format: "uri",
              },
            },
          },
        },
      },
      100
    );
    return schema;
  });
};
