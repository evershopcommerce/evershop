import Area from '@components/common/Area.js';
import React from 'react';
import './GeneralInfo.scss';
import { Name } from '../../../components/product/single/Name.js';
import { Price } from '../../../components/product/single/Price.js';
import { Sku } from '../../../components/product/single/Sku.js';

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
          component: { default: Name },
          props: {
            name: product.name
          },
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
    product (id: getContextValue('productId')) {
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
