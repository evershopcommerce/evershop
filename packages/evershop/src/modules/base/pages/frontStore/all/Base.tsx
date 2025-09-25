import Area from '@components/common/Area.js';
import { LoadingBar } from '@components/common/LoadingBar.js';
import React from 'react';
import './Layout.scss';
import './tailwind.scss';
import {
  CartProvider,
  CartData
} from '@components/frontStore/cart/cartContext.js';
import {
  CustomerProvider,
  Customer
} from '@components/frontStore/customer/customerContext.js';
import { Footer } from '@components/frontStore/Footer.js';
import { Header } from '@components/frontStore/Header.js';

interface BaseProps {
  myCart: CartData;
  customer: Customer;
  setting: {
    priceIncludingTax: boolean;
  };
  themeConfig: {
    copyRight: string;
  };
  addMineCartItemApi: string;
  loginApi: string;
  logoutApi: string;
  registerApi: string;
}
export default function Base({
  myCart,
  customer,
  setting,
  themeConfig,
  addMineCartItemApi,
  loginApi,
  logoutApi,
  registerApi
}: BaseProps) {
  return (
    <CustomerProvider
      initialCustomer={customer}
      loginAPI={loginApi}
      logoutAPI={logoutApi}
      registerAPI={registerApi}
    >
      <CartProvider
        cart={myCart}
        setting={setting}
        query={query}
        addMineCartItemApi={addMineCartItemApi}
      >
        <LoadingBar />
        <Header />
        <main className="content">
          <Area id="content" noOuter />
        </main>
        <Footer copyRight={themeConfig.copyRight} />
      </CartProvider>
    </CustomerProvider>
  );
}

export const layout = {
  areaId: 'body',
  sortOrder: 1
};

export const query = `
  query Query {
    myCart {
      uuid
      totalQty
      customerId
      customerGroupId
      customerEmail
      customerFullName
      coupon
      shippingMethod
      shippingMethodName
      paymentMethod
      paymentMethodName
      currency
      shippingNote
      addItemApi
      addPaymentMethodApi
      addShippingMethodApi
      addContactInfoApi
      addAddressApi
      addNoteApi
      checkoutApi
      applyCouponApi
      removeCouponApi
      taxAmount {
        value
        text
      } 
      discountAmount {
        value
        text
      }
      shippingFeeExclTax {
        value
        text
      }
      shippingFeeInclTax {
        value
        text
      }
      subTotal {
        value
        text
      }
      subTotalInclTax {
        value
        text
      }
      grandTotal {
        value
        text
      }
      availableShippingMethods {
        code
        name
        cost {
          value
          text
        }
      }
      availablePaymentMethods {
        code
        name
      }
      billingAddress {
        fullName
        telephone
        address1
        address2
        city
        province {
          name
          code
        }
        country {
          name
          code
        }
        postcode
      }
      shippingAddress {
        fullName
        telephone
        address1
        address2
        city
        province {
          name
          code
        }
        country {
          name
          code
        }
        postcode
      }
      items {
        cartItemId
        thumbnail
        qty
        productName
        productSku
        variantOptions {
          attributeCode
          attributeName
          attributeId
          optionId
          optionText
        }
        productUrl
        productPrice {
          value
          text
        }
        productPriceInclTax {
          value
          text
        }
        finalPrice {
          value
          text
        }
        finalPriceInclTax {
          value
          text
        }
        lineTotal {
          value
          text
        }
        lineTotalInclTax {
          value
          text
        }
        removeApi
        updateQtyApi
        errors
      }
    }
    customer: currentCustomer {
      customerId
      uuid
      email
      fullName
      groupId
      addAddressApi
      addresses {
        addressId
        uuid
        fullName
        telephone 
        address1
        address2
        city
        province {
          code
          name
        }
        country {
          code
          name
        }
        postcode
        isDefault
        updateApi
        deleteApi
      }
      orders {
        orderId
        orderNumber
        createdAt {
          value
          text
        }
        shipmentStatus {
          name
          code
          badge
        }
        paymentStatus {
          name
          code
          badge
        }
        grandTotal {
          value
          text
        }
        items {
          productName
          thumbnail
          productPrice {
            value
            text
          }
          productSku
          qty
        }
      }
    }
    setting {
      priceIncludingTax
    }
    themeConfig {
      copyRight
    }
    addMineCartItemApi: url(routeId: "addMineCartItem")
    loginApi: url(routeId: "customerLoginJson")
    registerApi: url(routeId: "createCustomer")
    logoutApi: url(routeId: "customerLogoutJson")
  }
`;
