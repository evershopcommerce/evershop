import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { merge } from "@evershop/evershop/lib/util/merge";
import { addProcessor } from "@evershop/evershop/lib/util/registry";
import config from "config";

export default () => {
  addProcessor("configuratonSchema", (schema) => {
    merge(
      schema as any,
      {
        properties: {
          resend: {
            type: "object",
            properties: {
              from: {
                type: "string",
              },
              events: {
                type: "object",
                patternProperties: {
                  "^[a-zA-Z_]+$": {
                    type: "object",
                    properties: {
                      subject: {
                        type: "string",
                      },
                      templatePath: {
                        type: "string",
                        format: "uri-reference",
                      },
                      enabled: {
                        type: "boolean",
                      },
                    },
                    required: ["subject", "templatePath", "enabled"],
                  },
                },
                additionalProperties: false,
              },
            },
          },
        },
      },
      100
    );
    return schema;
  });
  const defaultResendConfig = {
    from: "Customer Service <hello@resend.dev>",
    events: {
      order_placed: {
        subject: "Order Confirmation",
        enabled: true,
        templatePath: undefined, // This is the path to the email template. Starting from the root of the project.
      },
      reset_password: {
        subject: "Reset Password",
        enabled: true,
        templatePath: undefined, // This is the path to the email template. Starting from the root of the project.
      },
      customer_registered: {
        subject: "Welcome to Evershop",
        enabled: true,
        templatePath: undefined, // This is the path to the email template. Starting from the root of the project.
      },
    },
  };
  config.util.setModuleDefaults("resend", defaultResendConfig);
  // Add a processor to proceed the email data before sending
  addProcessor(
    "resend_order_confirmation_email_data",
    (order: {
      created_at: string;
      grand_total: string;
      currency: string;
      customer_name: string;
      grand_total_text: string;
    }) => {
      // Convert the order.created_at to a human readable date
      const locale = getConfig<string>("shop.language", "en");
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };

      order.created_at = new Date(order.created_at).toLocaleDateString(
        locale,
        options
      );

      // Add the order total text including the currency
      order.grand_total_text = Number(order.grand_total).toLocaleString(
        locale,
        {
          style: "currency",
          currency: order.currency,
        }
      );

      return order;
    }
  );
};
