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

interface BaseProps {
  myCart: CartData;
  customer: Customer;
  setting: {
    priceIncludingTax: boolean;
  };
  addMineCartItemApi: string;
  loginApi: string;
  logoutApi: string;
  loginUrl: string;
}
export default function Base({
  myCart,
  customer,
  setting,
  addMineCartItemApi,
  loginApi,
  logoutApi,
  loginUrl
}: BaseProps) {
  return (
    <CustomerProvider
      initialCustomer={customer}
      loginAPI={loginApi}
      logoutAPI={logoutApi}
      loginUrl={loginUrl}
    >
      <CartProvider
        cart={myCart}
        setting={setting}
        query={query}
        addMineCartItemApi={addMineCartItemApi}
      >
        <LoadingBar />
        <div className="header">
          <Area id="header" noOuter />
        </div>
        <main className="content">
          <Area id="content" noOuter />
        </main>
        <div className="footer">
          <Area id="footer" noOuter />
        </div>
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
    }
    setting {
      priceIncludingTax
    }
    addMineCartItemApi: url(routeId: "addMineCartItem")
    loginApi: url(routeId: "customerLoginJson")
    logoutApi: url(routeId: "customerLogoutJson")
    loginUrl: url(routeId: "login")
  }
`;
