import config from "config";

export default () => {
  const sendgridConfig = {
    from: "Customer Service <hello@evershop.io>",
    fromName: "Evershop",
    events: {
      order_placed: {
        subject: "Order Confirmation",
        enabled: true,
        templateId: "d-4c5e08f0c69d45f699467ebb93372f68d4",
      },
      reset_password: {
        subject: "Reset Password",
        enabled: true,
        templateId: "d-4f34caba1e1842739767c7f3d5568f3c21",
      },
      customer_registered: {
        subject: "Welcome to Evershop",
        enabled: true,
        templateId: "d-98b1cdc4896c4e759596e6704dcf4a4560",
      },
    },
  };
  config.util.setModuleDefaults("sendgrid", sendgridConfig);
  // Getting config value like this: config.get('sendgrid.apiKey');
};
