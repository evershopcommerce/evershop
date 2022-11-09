<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p align="center">
  <h1 align="center">A Full Stack React Ecommerce Template For Developers</h1>
</p>
<p align="center">
    <a href="https://evershop.io/docs/development/getting-started/introduction">Documentation</a>
</p>
<p align="center">
  <img src="https://github.com/nodeonline/nodejscart/actions/workflows/build.yml/badge.svg" alt="Github Action">
  <a href="https://discord.gg/GSzt7dt7RM">
    <img src="https://img.shields.io/discord/757179260417867879?label=discord" alt="Discord">
  </a>
  <a href="https://opensource.org/licenses/GPL-3.0">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License">
  </a>
</p>

## Component-Level Data Fetching (Server Side Props)

```javascript
import React from 'react';
import Products from './components/Products';

export default function NewArrival({ products }) {
    return <div>
      <h2>New Arrival</h2>
      <Products products={products}/>
    </div>
}

// The GraphQL query result will be passed to the page component as props
export const query = `
  query NewArrival {
    products {
      name
      price
      image {
        alt
        url
      }
      url
    }
}
`
```

## Demo

Explore our demo store.

<p align="center">
<img alt="EverShop Admin Demo" width="950" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-backend-demo.png"/>
</p>
<p align="center">
  <a href="https://demo.evershop.io/admin" target="_blank">
    <img alt="evershop-backend-demo" height="35" alt="EverShop Admin Demo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-admin-demo.png"/>
  </a>
</p>
<p align="center">
<img alt="EverShop Store Demo" width="950" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-product-detail.png"/>
</p>
<p align="center">
  <a href="https://demo.evershop.io/" target="_blank">
    <img alt="evershop-store-demo" height="35" alt="EverShop Store Demo" src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/evershop-store-front-demo.png"/>
  </a>
</p>

## Quick Start

You can get started with EverShop in minutes by running the following command:

```bash
npx create-evershop-app my-app --playAround
```

- [Installation guide](https://evershop.io/docs/development/getting-started/installation-guide).

- [Extension development](https://evershop.io/docs/development/module/create-your-first-extension).

- [Theme development](https://evershop.io/docs/development/theme/theme-overview).

## Features
- Catalog management(with product attribute, custom option and variants)
- Order management
- Customer management
- Coupon management
- Tax
- Online payment (For now using Stripe)
- Basic CMS pages management
- Easy to customize by developing extensions

## Support

If you like my work, feel free to:

- ⭐ this repository. It is a big motivation for me to continue working on this project.
- [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)][tweet] about EverShop

[tweet]: https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fevershopcommerce%2Fevershop&text=Awesome%20React%20Ecommerce%20Project&hashtags=react,ecommerce,expressjs,graphql
### Ask a question about EverShop

You can ask questions, and participate in discussions about EverShop-related topics in the EverShop Discord channel.

<a href="https://discord.gg/GSzt7dt7RM"><img src="https://raw.githubusercontent.com/evershopcommerce/evershop/dev/.github/images/discord_banner_github.svg" /></a>

### Create a bug report

If you see an error message or run into an issue, please [create bug report](https://github.com/evershopcommerce/evershop/issues/new). This effort is valued and it will help all EverShop users.


### Submit a feature request

If you have an idea, or you're missing a capability that would make development easier and more robust, please [Submit feature request](https://github.com/evershopcommerce/evershop/issues/new).

If a similar feature request already exists, don't forget to leave a "+1".
If you add some more information such as your thoughts and vision about the feature, your comments will be embraced warmly :)

## Contributing

EverShop is an open-source project. We are committed to a fully transparent development process and appreciate highly any contributions. Whether you are helping us fix bugs, proposing new features, improving our documentation or spreading the word - we would love to have you as part of the EverShop community.

Please refer to our [Contribution Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[GPL-3.0 License](https://github.com/evershopcommerce/evershop/blob/main/LICENSE)
