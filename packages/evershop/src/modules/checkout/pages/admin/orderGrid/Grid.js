import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../lib/components/Area';
import Pagination from '../../../../../lib/components/grid/Pagination';
import { Checkbox } from '../../../../../lib/components/form/fields/Checkbox';
import { useAlertContext } from '../../../../../lib/components/modal/Alert';
import { Card } from '../../../../cms/components/admin/Card';
import BasicColumnHeader from '../../../../../lib/components/grid/headers/Basic';
import FromToColumnHeader from '../../../../../lib/components/grid/headers/FromTo';
import ShipmentStatusColumnHeader from './headers/ShipmentStatusColumnHeader';
import PaymentStatusColumnHeader from './headers/PaymentStatusColumnHeader';
import OrderNumberRow from './rows/OrderNumberRow';
import DateRow from '../../../../../lib/components/grid/rows/DateRow';
import BasicRow from '../../../../../lib/components/grid/rows/BasicRow';
import ShipmentStatusRow from './rows/ShipmentStatus';
import PaymentStatusRow from './rows/PaymentStatus';
import TotalRow from './rows/TotalRow';
import CreateAt from '../../../../customer/pages/admin/customerGrid/rows/CreateAt';

function Actions({ selectedIds = [] }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const actions = [
    {
      name: 'Mark as fullfilled',
      onAction: () => {
        openAlert({
          heading: `Fullfill ${selectedIds.length} orders`,
          content: <Checkbox name="notify_customer" label="Send notification to the customer" />,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'default'
          },
          secondaryAction: {
            title: 'Mark as fullfilled',
            onAction: async () => {
              setIsLoading(true);
              dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
              await axios.post(orderBulkFullFillUrl, { ids: selectedIds });
              location.reload();
            },
            variant: 'primary',
            isLoading
          }
        });
      }
    }
  ];

  return (
    <tr>
      {selectedIds.length === 0 && (null)}
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan="100">
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-075 pb-075 pl-15 pr-15">
              {selectedIds.length}
              {' '}
              selected
            </a>
            {actions.map((action) => <a href="#" onClick={(e) => { e.preventDefault(); action.onAction(); }} className="font-semibold pt-075 pb-075 pl-15 pr-15 block border-l border-divider self-center"><span>{action.name}</span></a>)}
          </div>
        </td>
      )}
    </tr>
  );
}

Actions.propTypes = {
  selectedIds: PropTypes.arrayOf(PropTypes.number).isRequired
};

export default function OrderGrid({ orders: { items: orders, total, currentFilters = [] }, shipmentStatusList, paymentStatusList, orderBulkFullFillUrl }) {
  const page = currentFilters.find((filter) => filter.key === 'page') ? currentFilters.find((filter) => filter.key === 'page')['value'] : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit') ? currentFilters.find((filter) => filter.key === 'limit')['value'] : 20;
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox onChange={(e) => {
                if (e.target.checked) setSelectedRows(orders.map((o) => o.orderId));
                else setSelectedRows([]);
              }}
              />
            </th>
            <Area
              className=""
              id="orderGridHeader"
              noOuter
              coreComponents={
                [
                  {
                    component: { default: () => <BasicColumnHeader title="Order Number" id='orderNumber' currentFilters={currentFilters} /> },
                    sortOrder: 5
                  },
                  {
                    component: { default: () => <FromToColumnHeader title='Date' id='createdAt' currentFilters={currentFilters} /> },
                    sortOrder: 10
                  },
                  {
                    component: { default: () => <BasicColumnHeader title="Customer Email" id='customerEmail' currentFilters={currentFilters} /> },
                    sortOrder: 15
                  },
                  {
                    component: { default: () => <ShipmentStatusColumnHeader title="Shipment Status" id='shipmentStatus' shipmentStatusList={shipmentStatusList} currentFilters={currentFilters} /> },
                    sortOrder: 20
                  },
                  {
                    component: { default: () => <PaymentStatusColumnHeader title="Payment Status" id='paymentStatus' paymentStatusList={paymentStatusList} currentFilters={currentFilters} /> },
                    sortOrder: 25
                  },
                  {
                    component: { default: () => <FromToColumnHeader title='Total' id='grandTotal' currentFilters={currentFilters} /> },
                    sortOrder: 30
                  }
                ]
              }
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            ids={orders.map(() => orders.orderId)}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
            orderBulkFullFillUrl={orderBulkFullFillUrl}
          />
          {orders.map((o) => (
            <tr key={o.orderId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(o.orderId)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRows(selectedRows.concat([o.orderId]));
                    else setSelectedRows(selectedRows.filter((row) => row !== o.orderId));
                  }}
                />
              </td>
              <Area
                className=""
                id="orderGridRow"
                row={o}
                noOuter
                coreComponents={
                  [
                    {
                      component: { default: () => <OrderNumberRow name={o.orderNumber} editUrl={o.editUrl} /> },
                      sortOrder: 5
                    },
                    {
                      component: { default: ({ areaProps }) => <CreateAt time={o.createdAt.text} /> },
                      sortOrder: 10
                    },
                    {
                      component: { default: ({ areaProps }) => <BasicRow id='customerEmail' areaProps={areaProps} /> },
                      sortOrder: 15
                    },
                    {
                      component: { default: () => <ShipmentStatusRow status={o.shipmentStatus} /> },
                      sortOrder: 20
                    },
                    {
                      component: { default: () => <PaymentStatusRow status={o.paymentStatus} /> },
                      sortOrder: 25
                    },
                    {
                      component: { default: ({ areaProps }) => <TotalRow total={o.grandTotal.text} /> },
                      sortOrder: 30
                    }
                  ]
                }
              />
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0
        && <div className="flex w-full justify-center">There is no order to display</div>}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
}

export const query = `
  query Query {
    orders (filters: getContextValue("filtersFromUrl")) {
      items {
        orderId
        orderNumber
        createdAt {
          value
          text
        }
        customerEmail
        shipmentStatus {
          name
          code
          badge
          progress
        }
        paymentStatus {
          name
          code
          badge
          progress
        }
        grandTotal {
          value
          text
        }
        editUrl
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
    orderBulkFullFillUrl: url(routeId: "orderBulkFullFill")
    shipmentStatusList {
      text: name
      value: code
      badge
      progress
    }
    paymentStatusList {
      text: name
      value: code
      badge
      progress
    }
  }
`;