# AWS S3 storage extension for EverShop

This extension allows you to store your EverShop files including product images, banners on AWS S3.

> **Note**: This extension requires EverShop version 1.0.0-rc.9 or higher.

## Installation guide

### Step 1: Install the extension using npm:

```bash
npm install @evershop/s3_file_storage
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
        "name": "s3_file_storage",
        "resolve": "node_modules/@evershop/s3_file_storage",
        "enabled": true,
        "priority": 10
      }
    ]
  }
}
```

### Step 3: Add the S3 storage connection information to the environment variables

Edit the `.env` file:

```bash
AWS_ACCESS_KEY_ID="<Your access key>"
AWS_SECRET_ACCESS_KEY="<Your secret access key>"
AWS_REGION="<Your region>"
AWS_BUCKET_NAME="<Your bucket name>"
```

### Step 4: Active the AWS S3 storage

Edit the `config/default.json` file in the root directory of your EverShop installation and add the following line to the `file_storage` section:

```json
{
  ...,
  "system": {
    ...,
    "file_storage": "s3"
  }
}
```

### Step 5: Run the build command

```bash
npm run build
```
