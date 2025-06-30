<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p align="center">
<img width="60" height="68" alt="EverShop Logo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/logo-green.png"/>
</p>
<p align="center">
  <h1 align="center">EverShop</h1>
</p>
<h4 align="center">
    <a href="https://evershop.io/docs/development/getting-started/introduction">Documentation</a> |
    <a href="https://demo.evershop.io/">Demo</a>
</h4>

<p align="center">
  <img src="https://github.com/evershopcommerce/evershop/actions/workflows/build_test.yml/badge.svg" alt="Github Action">
  <a href="https://twitter.com/evershopjs">
    <img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/evershopjs?style=social">
  </a>
  <a href="https://discord.gg/GSzt7dt7RM">
    <img src="https://img.shields.io/discord/757179260417867879?label=discord" alt="Discord">
  </a>
  <a href="https://opensource.org/licenses/GPL-3.0">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License">
  </a>
</p>

<p align="center">
<img alt="EverShop" width="950" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/banner.png"/>
</p>

## Introduction

EverShop is a modern, TypeScript-first eCommerce platform built with GraphQL and React. Designed for developers, it offers essential commerce features in a modular, fully customizable architecture—perfect for building tailored shopping experiences with confidence and speed.

## Installation Using Docker

You can get started with EverShop in minutes by using the Docker image. The Docker image is a great way to get started with EverShop without having to worry about installing dependencies or configuring your environment.

```bash
curl -sSL https://raw.githubusercontent.com/evershopcommerce/evershop/main/docker-compose.yml > docker-compose.yml
docker-compose up -d
```

For the full installation guide, please refer to our [Installation guide](https://evershop.io/docs/development/getting-started/installation-guide).

## Documentation

- [Installation guide](https://evershop.io/docs/development/getting-started/installation-guide).

- [Extension development](https://evershop.io/docs/development/module/create-your-first-extension).

- [Theme development](https://evershop.io/docs/development/theme/theme-overview).

## Demo

Explore our demo store.

<p align="left">
  <a href="https://demo.evershop.io/admin" target="_blank">
    <img alt="evershop-backend-demo" height="35" alt="EverShop Admin Demo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-demo-back.png"/>
  </a>
  <a href="https://demo.evershop.io/" target="_blank">
    <img alt="evershop-store-demo" height="35" alt="EverShop Store Demo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-demo-front.png"/>
  </a>
</p>
<b>Demo user:</b>

Email: demo@evershop.io<br/>
Password: 123456

## Support

If you like my work, feel free to:

- ⭐ this repository. It helps.
- [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)][tweet] about EverShop. Thank you!

[tweet]: https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fevershopcommerce%2Fevershop&text=Awesome%20React%20Ecommerce%20Project&hashtags=react,ecommerce,expressjs,graphql

### Sponsors

<table style="text-align:center;">
<tr>
<td align="center" valign="middle"><a href="https://www.bountyhub.dev/" target="_blank"><img src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/sponsors/bountyhub.png" width="85" valign="middle" /></a></td>
</tr>
</table>

## Contributing

EverShop is an open-source project. We are committed to a fully transparent development process and appreciate highly any contributions. Whether you are helping us fix bugs, proposing new features, improving our documentation or spreading the word - we would love to have you as part of the EverShop community.

### Ask a question about EverShop

You can ask questions, and participate in discussions about EverShop-related topics in the EverShop Discord channel.

<a href="https://discord.gg/GSzt7dt7RM"><img src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/discord_banner_github.svg" /></a>

### Create a bug report

If you see an error message or run into an issue, please [create bug report](https://github.com/evershopcommerce/evershop/issues/new). This effort is valued and it will help all EverShop users.

### Submit a feature request

If you have an idea, or you're missing a capability that would make development easier and more robust, please [Submit feature request](https://github.com/evershopcommerce/evershop/issues/new).

If a similar feature request already exists, don't forget to leave a "+1".
If you add some more information such as your thoughts and vision about the feature, your comments will be embraced warmly :)

Please refer to our [Contribution Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[GPL-3.0 License](https://github.com/evershopcommerce/evershop/blob/main/LICENSE)

## TypeScript Development

This package uses a hybrid JavaScript/TypeScript approach. All new code should ideally be written in TypeScript, and existing JavaScript code can be gradually migrated.

### TypeScript Configuration

The `tsconfig.json` file is configured for:

- ES modules output (ESM)
- JSX preservation
- Type declaration generation
- Source mapping
- Support for both .js and .ts/.tsx files

### Development Workflow

1. **Running the development server**:

   ```
   npm run dev
   ```

   This uses `tsx` to directly run TypeScript files without pre-compilation.

2. **Type checking**:

   ```
   npm run typecheck
   ```

   Runs TypeScript compiler in check-only mode without emitting files.

3. **Building the package**:

   ```
   npm run build:ts
   ```

   Compiles TypeScript files to JavaScript in the `dist` directory.

4. **Watch mode during development**:
   ```
   npm run build:watch
   ```
   Automatically recompiles when files change.

### Package Exports

The package exports specific modules that can be imported by consumers:

```js
// Main package exports
import { Area, Circle } from '@evershop/evershop';

// Utility functions
import { get, getEnv } from '@evershop/evershop/src/lib/util';

// Common components
import { Area } from '@evershop/evershop/src/components/common';

// Type definitions
import type { Route } from '@evershop/evershop/types';
```

### File Organization

- `/src` - Source code
  - `/components` - React components
  - `/lib` - Utility functions and libraries
  - `/modules` - Application modules
- `/bin` - CLI commands and scripts
- `/types` - TypeScript type definitions

### Adding New TypeScript Files

When adding new TypeScript files:

1. Use `.ts` extension for plain TypeScript files
2. Use `.tsx` extension for files containing JSX
3. Export the file from an appropriate index.ts file if it should be part of the public API
