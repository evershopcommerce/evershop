/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import Circle from '@components/common/Circle';
import './Items.scss';
import { Card } from '@components/admin/cms/Card';
import { Thumbnail } from '@components/admin/oms/orderEdit/items/Thumbnail';
import { Name } from '@components/admin/oms/orderEdit/items/Name';
import { Price } from '@components/admin/oms/orderEdit/items/Price';

export default function Items({ order: { items, shipmentStatus } }) {
  return (
    <Card
      title={
        <div className="flex space-x-4">
          <Circle variant={shipmentStatus.badge || 'new'} />
          <span className="block self-center">
            {shipmentStatus.name || 'Unknown'}
          </span>
        </div>
      }
    >
      <Card.Session>
        <table className="listing order-items">
          <tbody>
            {items.map((i, k) => (
              <tr key={k}>
                <Area
                  key={k}
                  id={`order_item_row_${i.id}`}
                  noOuter
                  item={i}
                  coreComponents={[
                    {
                      component: { default: Thumbnail },
                      props: { imageUrl: i.thumbnail, qty: i.qty },
                      sortOrder: 10,
                      id: 'productThumbnail'
                    },
                    {
                      component: { default: Name },
                      props: {
                        name: i.productName,
                        productSku: i.productSku,
                        productUrl: i.productUrl,
                        variantOptions: JSON.parse(i.variantOptions || '[]')
                      }, // TODO: Implement custom options
                      sortOrder: 20,
                      id: 'productName'
                    },
                    {
                      component: { default: Price },
                      props: { price: i.productPrice.text, qty: i.qty },
                      sortOrder: 30,
                      id: 'price'
                    },
                    {
                      component: { default: 'td' },
                      props: {
                        children: <span>{i.lineTotal.text}</span>,
                        key: 'lineTotal'
                      },
                      sortOrder: 40,
                      id: 'lineTotal'
                    }
                  ]}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </Card.Session>
      <Card.Session>
        <div className="flex justify-end gap-4">
          <Area id="order_actions" noOuter />
        </div>
      </Card.Session>
    </Card>
  );
}

Items.propTypes = {
  order: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        qty: PropTypes.number,
        productName: PropTypes.string,
        productSku: PropTypes.string,
        productUrl: PropTypes.string,
        thumbnail: PropTypes.string,
        productPrice: PropTypes.shape({
          value: PropTypes.number,
          text: PropTypes.string
        }),
        variantOptions: PropTypes.string,
        finalPrice: PropTypes.shape({
          value: PropTypes.number,
          text: PropTypes.string
        }),
        total: PropTypes.shape({
          value: PropTypes.number,
          text: PropTypes.string
        }),
        lineTotal: PropTypes.shape({
          value: PropTypes.number,
          text: PropTypes.string
        })
      })
    ),
    shipmentStatus: PropTypes.shape({
      code: PropTypes.string,
      badge: PropTypes.string,
      progress: PropTypes.string,
      name: PropTypes.string
    }),
    shipment: PropTypes.shape({
      shipmentId: PropTypes.string,
      carrier: PropTypes.string,
      trackingNumber: PropTypes.string,
      updateShipmentApi: PropTypes.string
    }),
    createShipmentApi: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      currency
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      shipmentStatus {
        code
        badge
        progress
        name
      }
      items {
        id: orderItemId
        qty
        productName
        productSku
        productUrl
        thumbnail
        variantOptions
        productPrice {
          value
          text
        }
        finalPrice {
          value
          text
        }
        total {
          value
          text
        }
        lineTotal {
          value
          text
        }
      }
      createShipmentApi
    },
    carriers {
      label: name
      value: code
    }
  }
`;
