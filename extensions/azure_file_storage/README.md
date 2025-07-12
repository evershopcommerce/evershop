# Azure storage extension for EverShop

This extension allows you to store your EverShop files including product images, banners on Azure Blob Storage.

> **Note**: This extension requires EverShop version 1.0.0-rc.9 or higher.

## Installation guide

### Step 1: Install the extension using npm:

```bash
npm install @evershop/azure_file_storage
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
        "name": "azure_file_storage",
        "resolve": "node_modules/@evershop/azure_file_storage",
        "enabled": true,
        "priority": 10
      }
    ]
  }
}
```

### Step 3: Add the Azure storage connection string to the environment variables

Edit the `.env` file:

```bash
AZURE_STORAGE_CONNECTION_STRING="<Your connection string>"
AZURE_STORAGE_CONTAINER_NAME="<Your container name>"
```

Example:

```bash
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=myevershop;AccountKey=+b1/nrwkpOF5DZCybDqSDFDdfGCQSbx8eua3y7sadgfdgdfAdNNbns6xMNh+EeE0b10uc0ZJ+AStvBx8pg==;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER_NAME="images"
```

### Step 4: Activate the Azure file storage

Edit the `config/default.json` file in the root directory of your EverShop installation and add the following line to the `file_storage` section:

```json
{
  ...,
  "system": {
    ...,
    "file_storage": "azure"
  }
}
```

### Step 4: Run the build command

```bash
npm run build
```

> **Note**: You can get the connection string from the Azure portal.
