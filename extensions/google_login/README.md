# Google authentication extension for EverShop

This extension allows customer to login to EverShop using your Google account.

> **Breaking Changes**: From version 1.2.0 All the configuration options are moved to `.env` file.

## Installation guide

### Step 1: Install the extension using npm:

```bash
npm install @evershop/google_login
```

### Step 2: Enable the extension

Edit the `config/default.json` file in the root directory of your EverShop installation and add the following line to the `extensions` section:

```json
{
  ...,
  "system": {
    ...,
    "extensions": [
      ...,
      {
        "name": "google_login",
        "resolve": "node_modules/@evershop/google_login",
        "enabled": true,
        "priority": 10
      }
    ]
  }
}
```

### Step 3: Add the Google client ID, secret and some other configuration options

Edit the `.env` file:

```bash
  GOOGLE_LOGIN_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
  GOOGLE_LOGIN_CLIENT_SECRET="YOUR_GOOGLE CLIENT_SECRET"
  GOOGLE_LOGIN_SUCCESS_REDIRECT_URL="https://example.com"
  GOOGLE_LOGIN_FAILURE_REDIRECT_URL="https://example.com/account/login"
```

### Step 4: Run the build command

```bash
npm run build
```

> **Note**: You can get the Google client ID and secret from the [Google API Console](https://console.developers.google.com/apis/credentials).
