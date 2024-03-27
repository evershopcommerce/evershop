# SendGrid emailing for EverShop

A SendGrid extension for EverShop. This extension is used to send email to customers.

> **Note**: This extension requires EverShop version 1.0.0-rc.6 or higher.

## Installation

### Step 1: Install the extension package

```javascript
npm install @evershop/sendgrid
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
          "name": "sendGrid",
          "resolve": "node_modules/@evershop/sendgrid",
          "enabled": true,
          "priority": 10
        }
    ]
  ]
}
```

### Step 3: Configure the extension

```javascript
// config/config.json
{
  ...,
  "sendgrid": {
    "from": "Customer Service <Your email>",
    "fromName": "Evershop",
    "events": {
      "order_placed": {
        "enabled": true,
        "templateId": "d-4c5e08f0c69d45f6994b93372f68d4" // Your email template ID
      },
      "reset_password": {
        "enabled": true,
        "templateId": "d-4f34caba1e184273c7f3d5568f3c21"// Your email template ID
      },
      "customer_registered": {
        "enabled": true,
        "templateId": "d-98b1cdc4896c4e7595e04dcf4a4560"// Your email template ID
      }
    }
  }
}
```

### Step 4: Add the API key to the environment variables

```javascript
// .env
SENDGRID_API_KEY=your_api_key
```

This extension now supports 3 events:
1. order_placed: This event is fired when a customer places an order. Send an email to confirm the order.
2. reset_password: This event is fired when a customer requests to reset password. Send an email with a link to reset password.
3. customer_registered: This event is fired when a customer registers an account. Send a customer welcome email.

## Email template data

### Order confirmation

Below is the data you can use in your email template

```json
{
  "order_id": 2072,
  "uuid": "5fede624-66b9-4d8d-9e4e-73d3800d9960",
  "integration_order_id": null,
  "sid": "d991f3b4-a403-46cd-84fe-59e11a83560a",
  "order_number": "12072",
  "cart_id": 26274,
  "currency": "CAD",
  "customer_id": 12684,
  "customer_email": "evetwo@yopmail.com",
  "customer_full_name": "David",
  "user_ip": null,
  "user_agent": null,
  "coupon": null,
  "shipping_fee_excl_tax": "9.0000",
  "shipping_fee_incl_tax": "9.0000",
  "discount_amount": "0.0000",
  "sub_total": "250.0000",
  "total_qty": 1,
  "total_weight": "3.1000",
  "tax_amount": "0.0000",
  "shipping_note": null,
  "grand_total": "259.0000",
  "shipping_method": "7d0aba1a-fa8a-4b37-8b0c-5162cb34997e",
  "shipping_method_name": "Standard Delivery",
  "shipping_address_id": 4145,
  "payment_method": "cod",
  "payment_method_name": "Cash On Delivery",
  "billing_address_id": 4146,
  "shipment_status": "unfullfilled",
  "payment_status": "pending",
  "created_at": 2023-07-06T06:17:53.560Z,
  "updated_at": 2023-07-06T06:17:53.560Z,
  "items": [
    {
    "order_item_id": 3127,
    "uuid": "ec293ae6-2877-4260-8cb3-ec22994e8af3",
    "order_item_order_id": 2072,
    "product_id": 81,
    "referer": null,
    "product_sku": "NJC11368-Black-XL",
    "product_name": "Geography class chuck taylor all star",
    "thumbnail": "/assets/theme/frontStore/default/image/placeholder.png",
    "product_weight": "3.1000",
    "product_price": "250.0000",
    "product_price_incl_tax": "250.0000",
    "qty": 1,
    "final_price": "250.0000",
    "final_price_incl_tax": "250.0000",
    "tax_percent": "0.0000",
    "tax_amount": "0.0000",
    "discount_amount": "0.0000",
    "total": "250.0000",
    "variant_group_id": 82,
    "variant_options": "[{"attribute_code":"color","attribute_name":"Color","attribute_id":3,"option_id":14,"option_text":"Black"},{"attribute_code":"size","attribute_name":"Size","attribute_id":2,"option_id":26,"option_text":"XL"}]",
    "product_custom_options": null,
    "requested_data": null
    }
  ],
  "shipping_address": {
    "order_address_id": 4145,
    "uuid": "ceb7598c-fc8e-4a6b-bf22-0dce57b8d733",
    "full_name": "David",
    "postcode": "70000",
    "telephone": "1231434535",
    "country": "US",
    "province": "US_CA",
    "city": "Englewood",
    "address_1": "12 street",
    "address_2": null,
    "country_name": "United States",
    "province_name": "California"
  },
  "billing_address": {
    "order_address_id": 4146,
    "uuid": "ceb7598c-fc8e-4a6b-bf22-0dce57b8d733",
    "full_name": "David",
    "postcode": "70000",
    "telephone": "1231434535",
    "country": "US",
    "province": "US_CA",
    "city": "Englewood",
    "address_1": "12 street",
    "address_2": null,
    "country_name": "United States",
    "province_name": "California"
  }
}
```

### Reset password

Below is the data you can use in your email template

```json
{
  "reset_password_url": "https://demo.evershop.io/reset-password?token=3NedZnEvEMCuLU1x1IHT684B"
}
```

### Customer registered

Below is the data you can use in your email template

```json
{
  "full_name": "David",
  "email": "david@evershop.io"
}
```

