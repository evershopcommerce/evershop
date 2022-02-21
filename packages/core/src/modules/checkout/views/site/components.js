const { useSiteComponent } = require('../../../../lib/componee/useSiteComponent');
const { buildUrl } = require('../../../../lib/router/buildUrl');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  '*': [
    {
      id: 'miniCart',
      areaId: 'iconWrapper',
      source: useSiteComponent('checkout/views/site/MiniCart.js'),
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
      source: useSiteComponent('checkout/views/site/cart/Layout.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'emptyCart',
      areaId: 'shoppingCartTop',
      source: useSiteComponent('checkout/views/site/cart/Empty.js'),
      props: {
        homeUrl: buildUrl('homepage')
      },
      sortOrder: 10
    },
    {
      id: 'cartItems',
      areaId: 'shoppingCartLeft',
      source: useSiteComponent('checkout/views/site/cart/items/Items.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'cartSummary',
      areaId: 'shoppingCartRight',
      source: useSiteComponent('checkout/views/site/cart/Summary.js'),
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
      source: useSiteComponent('checkout/views/site/checkout/CustomerInfoStep.js'),
      props: {
        setContactInfoUrl: buildUrl('checkoutSetContactInfo')
        // loginUrl: buildUrl("customerLoginPost")
      },
      sortOrder: 5
    },
    {
      id: 'checkoutPaymentStep',
      areaId: 'checkoutSteps',
      source: useSiteComponent('checkout/views/site/checkout/payment/PaymentStep.js'),
      props: {},
      sortOrder: 15
    },
    {
      id: 'checkoutShipmentStep',
      areaId: 'checkoutSteps',
      source: useSiteComponent('checkout/views/site/checkout/shipment/ShipmentStep.js'),
      props: {},
      sortOrder: 10
    },
    {
      id: 'checkoutPage',
      areaId: 'content',
      source: useSiteComponent('checkout/views/site/checkout/Checkout.js'),
      props: {},
      sortOrder: 0
    },
    {
      id: 'checkoutShippingMethods',
      areaId: 'checkoutShippingAddressForm',
      source: useSiteComponent('checkout/views/site/checkout/shipment/ShippingMethods.js'),
      props: {
        getMethodsAPI: buildUrl('checkoutGetShippingMethods')
      },
      sortOrder: 100
    },
    {
      id: 'checkoutPaymentMethods',
      areaId: 'checkoutBillingAddressForm',
      source: useSiteComponent('checkout/views/site/checkout/payment/PaymentMethods.js'),
      props: {
        getMethodsAPI: buildUrl('checkoutGetPaymentMethods')
      },
      sortOrder: 100
    },
    {
      id: 'cartSummary',
      areaId: 'shoppingCartRight',
      source: useSiteComponent('checkout/views/site/cart/Summary.js'),
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
      source: useSiteComponent('checkout/views/site/checkoutSuccess/CheckoutSuccess.js'),
      props: {
      },
      sortOrder: 10
    }
  ]
};
