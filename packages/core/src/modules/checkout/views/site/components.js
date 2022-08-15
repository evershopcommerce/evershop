const { useComponent } = require('../../../../lib/componee/useComponent');
const { buildUrl } = require('../../../../lib/router/buildUrl');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
    {
      id: 'miniCart',
      areaId: 'iconWrapper',
      source: useComponent('MiniCart.js'),
      props: {
        cartUrl: buildUrl('cart'),
        checkoutUrl: buildUrl('checkout')
      },
      sortOrder: 1
    }
  ],
  cart: [
    {
      id: 'shoppingCartLayout',
      areaId: 'content',
      source: useComponent('cart/Layout.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'emptyCart',
      areaId: 'shoppingCartTop',
      source: useComponent('cart/Empty.js'),
      props: {
        homeUrl: buildUrl('homepage')
      },
      sortOrder: 10
    },
    {
      id: 'cartItems',
      areaId: 'shoppingCartLeft',
      source: useComponent('cart/items/Items.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'cartSummary',
      areaId: 'shoppingCartRight',
      source: useComponent('cart/Summary.js'),
      props: {
        checkoutUrl: buildUrl('checkout')
      },
      sortOrder: 10
    }
  ],
  checkout: [
    {
      id: 'customerInfoStep',
      areaId: 'checkoutSteps',
      source: useComponent('checkout/CustomerInfoStep.js'),
      props: {
        setContactInfoUrl: buildUrl('checkoutSetContactInfo')
        // loginUrl: buildUrl("customerLoginPost")
      },
      sortOrder: 5
    },
    {
      id: 'checkoutPaymentStep',
      areaId: 'checkoutSteps',
      source: useComponent('checkout/payment/paymentStep/Index.js'),
      props: {},
      sortOrder: 15
    },
    {
      id: 'checkoutShipmentStep',
      areaId: 'checkoutSteps',
      source: useComponent('checkout/shipment/shipmentStep/Index.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'checkoutPage',
      areaId: 'content',
      source: useComponent('checkout/Checkout.js'),
      props: {},
      sortOrder: 0
    },
    {
      id: 'checkoutShippingMethods',
      areaId: 'checkoutShippingAddressForm',
      source: useComponent('checkout/shipment/ShippingMethods.js'),
      props: {
        getMethodsAPI: buildUrl('checkoutGetShippingMethods')
      },
      sortOrder: 100
    },
    {
      id: 'checkoutPaymentMethods',
      areaId: 'checkoutBillingAddressForm',
      source: useComponent('checkout/payment/paymentMethods/Index.js'),
      props: {
        getMethodsAPI: buildUrl('checkoutGetPaymentMethods')
      },
      sortOrder: 100
    },
    {
      id: 'cartSummary',
      areaId: 'shoppingCartRight',
      source: useComponent('cart/Summary.js'),
      props: {
        checkoutUrl: buildUrl('checkout')
      },
      sortOrder: 10
    }
  ],
  checkoutSuccess: [
    {
      id: 'checkoutSuccess',
      areaId: 'content',
      source: useComponent('checkoutSuccess/CheckoutSuccess.js'),
      props: {
      },
      sortOrder: 10
    }
  ]
};
