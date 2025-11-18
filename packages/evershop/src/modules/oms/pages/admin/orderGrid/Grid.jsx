import { Card } from '@components/admin/Card';
import { Filter } from '@components/admin/grid/Filter';
import { SortableHeader } from '@components/admin/grid/header/Sortable';
import { Pagination } from '@components/admin/grid/Pagination';
import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { OrderNumber } from './rows/OrderNumber.js';
import { PaymentStatus } from './rows/PaymentStatus.js';
import { ShipmentStatus } from './rows/ShipmentStatus.js';

function Actions({ orders = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const fullFillOrders = async () => {
    setIsLoading(true);
    const promises = orders
      .filter((order) => selectedIds.includes(order.uuid))
      .map((order) => axios.post(order.createShipmentApi));

    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const actions = [
    {
      name: 'Mark as shipped',
      onAction: () => {
        openAlert({
          heading: `Fullfill ${selectedIds.length} orders`,
          content: (
            <div className="form-field mb-0">
              <input
                type="checkbox"
                name="notify_customer"
                label="Send notification to the customer"
                onChange={() => {}}
              />
            </div>
          ),
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'default'
          },
          secondaryAction: {
            title: 'Mark as shipped',
            onAction: async () => {
              await fullFillOrders();
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
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan="100">
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-2 pb-2 pl-4 pr-4">
              {selectedIds.length} selected
            </a>
            {actions.map((action, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.onAction();
                }}
                className="font-semibold pt-2 pb-2 pl-4 pr-4 block border-l border-divider self-center"
              >
                <span>{action.name}</span>
              </a>
            ))}
          </div>
        </td>
      )}
    </tr>
  );
}

Actions.propTypes = {
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  orders: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      createShipmentApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function OrderGrid({
  orders: { items: orders, total, currentFilters = [] },
  paymentStatusList,
  shipmentStatusList
}) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(currentFilters.find((filter) => filter.key === 'page').value, 10)
    : 1;

  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit').value,
        10
      )
    : 20;

  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <Card.Session
        title={
          <Form submitBtn={false} id="orderGridFilter">
            <div className="flex gap-5 justify-center items-center">
              <Area
                id="orderGridFilter"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <InputField
                          name="keyword"
                          placeholder="Search"
                          defaultValue={
                            currentFilters.find((f) => f.key === 'keyword')
                              ?.value
                          }
                          onKeyPress={(e) => {
                            // If the user press enter, we should submit the form
                            if (e.key === 'Enter') {
                              const url = new URL(document.location);
                              const keyword = e.target?.value;
                              if (keyword) {
                                url.searchParams.set('keyword', keyword);
                              } else {
                                url.searchParams.delete('keyword');
                              }
                              window.location.href = url;
                            }
                          }}
                        />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => (
                        <Filter
                          options={paymentStatusList.map((status) => ({
                            label: status.name,
                            value: status.code,
                            onSelect: () => {
                              const url = new URL(document.location);
                              url.searchParams.set(
                                'payment_status',
                                status.code
                              );
                              window.location.href = url;
                            }
                          }))}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'payment_status'
                            )
                              ? currentFilters.find(
                                  (f) => f.key === 'payment_status'
                                ).value
                              : undefined
                          }
                          title="Payment status"
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => (
                        <Filter
                          options={shipmentStatusList.map((status) => ({
                            label: status.name,
                            value: status.code,
                            onSelect: () => {
                              const url = new URL(document.location);
                              url.searchParams.set(
                                'shipment_status',
                                status.code
                              );
                              window.location.href = url;
                            }
                          }))}
                          selectedOption={
                            currentFilters.find(
                              (f) => f.key === 'shipment_status'
                            )
                              ? currentFilters.find(
                                  (f) => f.key === 'shipment_status'
                                ).value
                              : undefined
                          }
                          title="Shipment status"
                        />
                      )
                    },
                    sortOrder: 15
                  }
                ]}
                currentFilters={currentFilters}
              />
            </div>
          </Form>
        }
        actions={[
          {
            variant: 'interactive',
            name: 'Clear filter',
            onAction: () => {
              // Just get the url and remove all query params
              const url = new URL(document.location);
              url.search = '';
              window.location.href = url.href;
            }
          }
        ]}
      />
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <div className="form-field mb-0">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(orders.map((o) => o.uuid));
                    } else {
                      setSelectedRows([]);
                    }
                  }}
                />
              </div>
            </th>
            <Area
              className=""
              id="orderGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Order Number"
                        name="number"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 5
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Date"
                        name="created_at"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Customer Email"
                        name="email"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Shipment Status"
                        name="shipment_status"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Payment Status"
                        name="payment_status"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 25
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Total"
                        name="total"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 30
                }
              ]}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            orders={orders}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {orders.map((o) => (
            <tr key={o.orderId}>
              <td>
                <div className="form-field mb-0">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(o.uuid)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(selectedRows.concat([o.uuid]));
                      } else {
                        setSelectedRows(
                          selectedRows.filter((row) => row !== o.uuid)
                        );
                      }
                    }}
                  />
                </div>
              </td>
              <Area
                className=""
                id="orderGridRow"
                row={o}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <OrderNumber
                          number={o.orderNumber}
                          editUrl={o.editUrl}
                        />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => <td>{o.createdAt.text}</td>
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: ({ areaProps }) => <td>{o.customerEmail}</td>
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: () => (
                        <ShipmentStatus status={o.shipmentStatus} />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => <PaymentStatus status={o.paymentStatus} />
                    },
                    sortOrder: 25
                  },
                  {
                    component: {
                      default: () => <td>{o.grandTotal.text}</td>
                    },
                    sortOrder: 30
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="flex w-full justify-center">
          There is no order to display
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

OrderGrid.propTypes = {
  orders: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        orderId: PropTypes.string.isRequired,
        uuid: PropTypes.string.isRequired,
        orderNumber: PropTypes.string.isRequired,
        createdAt: PropTypes.shape({
          value: PropTypes.string.isRequired,
          text: PropTypes.string.isRequired
        }).isRequired,
        customerEmail: PropTypes.string.isRequired,
        shipmentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired,
          progress: PropTypes.string.isRequired
        }).isRequired,
        paymentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired,
          progress: PropTypes.string.isRequired
        }).isRequired,
        grandTotal: PropTypes.shape({
          value: PropTypes.number.isRequired,
          text: PropTypes.string.isRequired
        }).isRequired,
        editUrl: PropTypes.string.isRequired,
        createShipmentApi: PropTypes.string.isRequired
      })
    ).isRequired,
    total: PropTypes.number.isRequired,
    currentFilters: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        operation: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired,
  paymentStatusList: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired,
  shipmentStatusList: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    orders (filters: $filters) {
      items {
        orderId
        uuid
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
        createShipmentApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
    paymentStatusList {
      code
      name
    }
    shipmentStatusList {
      code
      name
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
