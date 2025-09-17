import Area from '@components/common/Area.js';
import React from 'react';
import './GeneralInfo.scss';
import { _ } from '../../../../../lib/locale/translate/_.js';

export function Name({ name }: { name: string }) {
  return (
    <>
      <Area id="productNameBefore" noOuter />
      <h1 className="product-single-name">{name}</h1>
      <Area id="productNameAfter" noOuter />
    </>
  );
}

interface PriceProps {
  regular: {
    value: number;
    text: string;
  };
  special: {
    value: number;
    text: string;
  };
}
export function Price({ regular, special }: PriceProps) {
  return (
    <>
      <Area id="productPriceBefore" noOuter />
      <h4 className="product-single-price">
        {special.value === regular.value && (
          <div>
            <span className="sale-price">{regular.text}</span>
          </div>
        )}
        {special.value < regular.value && (
          <div>
            <span className="sale-price">{special.text}</span>{' '}
            <span className="regular-price">{regular.text}</span>
          </div>
        )}
      </h4>
      <Area id="productPriceAfter" noOuter />
    </>
  );
}

export function Sku({ sku }: { sku: string }) {
  return (
    <>
      <Area id="productSkuBefore" noOuter />
      <div className="product-single-sku text-textSubdued">
        <span className="sku-label">{_('Sku')}</span>
        <span className="sku-separator">: </span>
        <span className="sku-value">{sku}</span>
      </div>
      <Area id="productSkuAfter" noOuter />
    </>
  );
}

interface GeneralInfoProps {
  product: {
    name: string;
    sku: string;
    price: {
      regular: {
        value: number;
        text: string;
      };
      special: {
        value: number;
        text: string;
      };
    };
  };
}
export default function GeneralInfo({ product }: GeneralInfoProps) {
  return (
    <Area
      id="productViewGeneralInfo"
      className="flex flex-col gap-2"
      coreComponents={[
        {
          component: { default: <Name name={product.name} /> },
          sortOrder: 10,
          id: 'productSingleName'
        },
        {
          component: { default: Price },
          props: {
            regular: product.price.regular,
            special: product.price.special
          },
          sortOrder: 10,
          id: 'productSinglePrice'
        },
        {
          component: { default: Sku },
          props: {
            sku: product.sku
          },
          sortOrder: 20,
          id: 'productSingleSku'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 10
};

export const query = `
  query Query {
    product: currentProduct {
      name
      sku
      price {
        regular {
          value
          text
        }
        special {
          value
          text
        }
      }
    }
  }`;
