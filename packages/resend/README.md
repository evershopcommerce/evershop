# Resend extension for EverShop

A Resend extension for EverShop. This extension is used to send email to customers.

> **Note**: This extension requires EverShop version 1.0.0 or higher.

## Installation

### Step 1: Install the extension package

```javascript
npm install @evershop/resend
```
### Step 2: Register the extension by adding it to the config file

```javascript
// config/default.json
{
  ...,
  "system": [
    ...,
    "extensions": [
        ...,
        {
          "name": "resend",
          "resolve": "node_modules/@evershop/resend",
          "enabled": true,
          "priority": 10
        }
    ]
  ]
}
```

### Step 3: Configure the extension

#### 1. Add your Resend API key to the `.env` file

```env
RESEND_API_KEY=your_api_key
```

#### 2. Add the following configuration to the `config/config.json` file

```javascript
// config/config.json
{
  ...,
  "resend": {
    "from": "Customer Service <Your email>",
    "events": {
      "order_placed": {
        "subject": "Order Confirmation",
        "enabled": true,
        "templatePath": "config/emails/order_confirmation.html" // The path to your email template. Starting from the root of your project
      },
      "reset_password": {
        "subject": "Reset Password",
        "enabled": true,
        "templatePath": "config/emails/reset_password.html" // The path to your email template. Starting from the root of your project
      },
      "customer_registered": {
        "subject": "Welcome to EverShop",
        "enabled": true,
        "templatePath": "config/emails/welcome.html" // The path to your email template. Starting from the root of your project
      }
    }
  }
}
```

This extension now supports 3 events:
1. order_placed: This event is fired when a customer places an order. Send an email to confirm the order.
2. reset_password: This event is fired when a customer requests to reset password. Send an email with a link to reset password.
3. customer_registered: This event is fired when a customer registers an account. Send a customer welcome email.

## Email templates

You can customize the email templates by creating your own HTML files. You can keep the HTML files anywhere in your project. Just make sure to provide the correct path in the `config/config.json` file.

For example if you store your email templates in the `config/emails` directory, you can provide the path as `config/emails/order_confirmation.html`.

```javascript
// The folder structure
config
  └── emails
      ├── order_confirmation.html
      ├── reset_password.html
      └── welcome.html

// The config file
{
  ...,
  "resend": {
    "from": "Customer Service <Your email>",
    "events": {
      "order_placed": {
        "subject": "Order Confirmation",
        "enabled": true,
        "templatePath": "config/emails/order_confirmation.html"
      },
      "reset_password": {
        "subject": "Reset Password",
        "enabled": true,
        "templatePath": "config/emails/reset_password.html"
      },
      "customer_registered": {
        "subject": "Welcome to EverShop",
        "enabled": true,
        "templatePath": "config/emails/welcome.html"
      }
    }
  }
}
```

> **Note**: You can check the example email templates [here](https://github.com/evershopcommerce/evershop/tree/main/packages/resend/email_template_examples).