/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import Circle from '../../../../../lib/components/Circle';
import Button from '../../../../../lib/components/form/Button';
import { useAlertContext } from '../../../../../lib/components/modal/Alert';
import { Form } from '../../../../../lib/components/form/Form';
import { Field } from '../../../../../lib/components/form/Field';
import './Items.scss';
import { Card } from '../../../../cms/components/admin/Card';

function ItemOptions({ options = [] }) {
  if (options.length === 0) { return null; }
  const currency = '';

  return (
    <div className="cart-item-options">
      <ul className="list-unstyled">
        {options.map((o, i) => (
          <li key={i}>
            <span className="option-name">
              <strong>
                {o.option_name}
                {' '}
                :
                {' '}
              </strong>
            </span>
            {o.values.map((v, k) => {
              const formatedExtraPrice = new Intl.NumberFormat('en', { style: 'currency', currency }).format(v.extra_price);
              return (
                <span key={k}>
                  <i className="value-text">{v.value_text}</i>
                  <span className="extra-price">
                    (
                    {formatedExtraPrice}
                    )
                  </span>
                  {' '}
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

ItemOptions.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    option_name: PropTypes.string,
    values: PropTypes.arrayOf(PropTypes.shape({
      value_text: PropTypes.string,
      extra_price: PropTypes.number
    }))
  })).isRequired
};

function Thumbnail({ imageUrl, qty }) {
  return (
    <td>
      <div className="product-thumbnail">
        <div className="thumbnail">
          {imageUrl && <img src={imageUrl} alt="" />}
          {!imageUrl && <svg style={{ width: '2rem' }} fill="currentcolor" viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path fillRule="evenodd" d="M6 11h8V9H6v2zm0 4h8v-2H6v2zm0-8h4V5H6v2zm6-5H5.5A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V6l-4-4z" /></svg>}
        </div>
        <span className="qty">{qty}</span>
      </div>
    </td>
  );
}

Thumbnail.propTypes = {
  imageUrl: PropTypes.string,
  qty: PropTypes.number.isRequired
};

Thumbnail.defaultProps = {
  imageUrl: undefined
};

function Price({ price, qty }) {
  return (
    <td>
      <div className="product-price">
        <span>
          {price}
          {' '}
          x
          {' '}
          {qty}
        </span>
      </div>
    </td>
  );
}

Price.propTypes = {
  price: PropTypes.string.isRequired,
  qty: PropTypes.number.isRequired
};

function Name({ name, options = [] }) {
  return (
    <td>
      <div className="product-column">
        <div><span className="font-semibold">{name}</span></div>
        <ItemOptions options={options} />
      </div>
    </td>
  );
}

Name.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    option_name: PropTypes.string,
    values: PropTypes.arrayOf(PropTypes.shape({
      value_text: PropTypes.string,
      extra_price: PropTypes.number
    }))
  }))
};

Name.defaultProps = {
  options: undefined
};

function FullfillButton({ shipment, createShipmentUrl }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  if (shipment) return null;
  else {
    return (
      <Button
        title="Fullfill items"
        variant="primary"
        onAction={() => {
          openAlert({
            heading: 'Fullfill items',
            content: <div>
              <Form
                id="fullfill-items"
                method="POST"
                action={createShipmentUrl}
                submitBtn={false}
                onSuccess={() => {
                  location.reload();
                }}
                onValidationError={() => {
                  dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: false } } });
                }}
              >
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Field
                      formId="fullfill-items"
                      type="text"
                      name="tracking_number"
                      label="Tracking number"
                      placeHolder="Tracking number"
                      value=""
                      validationRules={['notEmpty']}
                    />
                  </div>
                  <div>
                    <Field
                      formId="fullfill-items"
                      type="select"
                      name="carrier_name"
                      label="Carrier"
                      value=""
                      options={[
                        { value: 'Fedex', text: 'Fedex' },
                        { value: 'USPS', text: 'USPS' },
                        { value: 'UPS', text: 'UPS' }
                      ]}// TODO: List of carrier should be configurable
                      validationRules={['notEmpty']}
                    />
                  </div>
                </div>
              </Form>
            </div>,
            primaryAction: {
              title: 'Cancel',
              onAction: closeAlert,
              variant: ''

            },
            secondaryAction: {
              title: 'Fullfill',
              onAction: () => {
                dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
                document.getElementById('fullfill-items').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              },
              variant: 'primary',
              isLoading: false
            }
          });
        }}
      />
    );
  }
}

function TrackingButton({ shipment }) {
  if (!shipment || !shipment.trackingNumber || !shipment.carrierName) return null;

  let url = null; // TODO: This should let extension to add a carrier with link
  if (shipment.carrierName === 'Fedex') {
    url = `https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}`;
  }
  if (shipment.carrierName === 'USPS') {
    url = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${shipment.trackingNumber}`;
  }
  if (shipment.carrierName === 'Fedex') {
    url = `https://www.ups.com/WebTracking?loc=en_US&requester=ST&trackNums=${shipment.trackingNumber}`;
  }
  return (
    <Button
      title="Track shipment"
      variant="primary"
      onAction={() => { window.open(url, '_blank').focus(); }}
    />
  );
}

function AddTrackingButton({ shipment, updateShipmentUrl }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  if (!shipment || shipment.trackingNumber || shipment.carrierName) return null;

  else {
    return (
      <Button
        title="Add tracking number"
        variant="primary"
        onAction={() => {
          openAlert({
            heading: 'Add tracking information',
            content: <div>
              <Form
                id="add-tracking-items"
                method="POST"
                action={updateShipmentUrl}
                submitBtn={false}
                onSuccess={() => {
                  location.reload();
                }}
                onValidationError={() => {
                  dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: false } } });
                }}
              >
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Field
                      formId="add-tracking-items"
                      type="text"
                      name="tracking_number"
                      label="Tracking number"
                      placeHolder="Tracking number"
                      value=""
                      validationRules={['notEmpty']}
                    />
                  </div>
                  <div>
                    <Field
                      formId="add-tracking-items"
                      type="select"
                      name="carrier_name"
                      label="Carrier"
                      value=""
                      options={[
                        { value: 'Fedex', text: 'Fedex' },
                        { value: 'USPS', text: 'USPS' },
                        { value: 'UPS', text: 'UPS' }
                      ]}// TODO: List of carrier should be configurable
                      validationRules={['notEmpty']}
                    />
                  </div>
                </div>
              </Form>
            </div>,
            primaryAction: {
              title: 'Cancel',
              onAction: closeAlert,
              variant: ''

            },
            secondaryAction: {
              title: 'Update tracking',
              onAction: () => {
                dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
                document.getElementById('add-tracking-items').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              },
              variant: 'primary',
              isLoading: false
            }
          });
        }}
      />
    );
  }
}

export default function Items({ order: { items, shipmentStatus, shipment }, createShipmentUrl, updateShipmentUrl }) {
  return (
    <Card title={(
      <div className="flex space-x-1">
        <Circle variant={shipmentStatus.badge || 'new'} />
        <span className="block self-center">{shipmentStatus.name || 'Unknown'}</span>
      </div>
    )}
    >
      <Card.Session>
        <table className="listing order-items">
          <tbody>
            {items.map((i, k) => {
              return (
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
                        props: { name: i.productName, options: [] }, // TODO: Implement custom options
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
                        props: { children: <span>{i.total.text}</span>, key: 'total' },
                        sortOrder: 40,
                        id: 'total'
                      }
                    ]}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card.Session>
      <Card.Session>
        <div className="flex justify-end">
          <FullfillButton createShipmentUrl={createShipmentUrl} shipment={shipment} />
          <TrackingButton shipment={shipment} />
          <AddTrackingButton updateShipmentUrl={updateShipmentUrl} shipment={shipment} />
        </div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
}

export const query = `
  query Query {
    order(id: getContextValue("orderId")) {
      currency
      shipment {
        shipmentId
        carrierName
        trackingNumber
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
        thumbnail
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
      }
    }
    createShipmentUrl: url(routeId: "createShipment", params: [{key: "orderId", value: getContextValue("orderId", undefined, true)}])
    updateShipmentUrl: url(routeId: "updateShipment", params: [{key: "orderId", value: getContextValue("orderId", undefined, true)}])
  }
`