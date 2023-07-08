const config = require('config');

module.exports = () => {
  const catalogConfig = {
    product: {
      image: {
        thumbnail: {
          width: 100,
          height: 100
        },
        listing: {
          width: 300,
          height: 300
        },
        single: {
          width: 500,
          height: 500
        },
        placeHolder: '/default/image/placeholder.png'
      }
    },
    showOutOfStockProduct: false
  };
  config.util.setModuleDefaults('catalog', catalogConfig);

  // Pricing configuration
  const pricingConfig = {
    rounding: 'round',
    precision: 2
  };
  config.util.setModuleDefaults('pricing', pricingConfig);
  // Getting config value like this: config.get('catalog.product.image.thumbnail.width');
};
