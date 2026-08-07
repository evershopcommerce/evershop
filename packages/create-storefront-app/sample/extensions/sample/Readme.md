# Sample Extension

This is a sample extension for Storefront. It demonstrates how to build a simple extension for your Storefront store.

## Enable/Disable the extension

To enable the extension, modify the configuration file `config/default.json` and set the `enabled` property to `true`:

```json
{
  "system": {
    "extensions": [
      {
        "name": "sample",
        "resolve": "extensions/sample",
        "enabled": true
      }
    ]
  }
}
```

> **Warning**
> Enable/disable the extension requires running the command `npm run build` again.
