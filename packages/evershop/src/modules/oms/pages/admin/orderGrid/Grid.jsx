import { GridPagination } from '@components/admin/grid/GridPagination';
import { SortableHeader } from '@components/admin/grid/header/Sortable';
import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardAction
} from '@components/common/ui/Card.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
      name: _('Mark as shipped'),
      onAction: () => {
        openAlert({
          heading: _('Fulfill ${count} orders', { count: selectedIds.length }),
          content: (
            <div className="form-field mb-0">
              {_(
                'Are you sure you want to mark the selected orders as shipped?'
              )}
            </div>
          ),
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Mark as shipped'),
            onAction: async () => {
              await fullFillOrders();
            },
            variant: 'default',
            isLoading
          }
        });
      }
    }
  ];

  return (
    <TableRow>
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <TableCell style={{ borderTop: 0 }} colSpan="100">
          <ButtonGroup>
            {actions.map((action, i) => (
              <Button
                key={i}
                variant={'outline'}
                onClick={(e) => {
                  e.preventDefault();
                  action.onAction();
                }}
              >
                {action.name}
              </Button>
            ))}
          </ButtonGroup>
        </TableCell>
      )}
    </TableRow>
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
      <CardHeader className="flex justify-between">
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
                        placeholder={_('Search')}
                        defaultValue={
                          currentFilters.find((f) => f.key === 'keyword')?.value
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
                      <>
                        <Select
                          value={
                            currentFilters.find(
                              (f) => f.key === 'payment_status'
                            )
                              ? currentFilters.find(
                                  (f) => f.key === 'payment_status'
                                ).value
                              : undefined
                          }
                          onValueChange={(value) => {
                            const url = new URL(document.location);
                            url.searchParams.set('payment_status', value);
                            window.location.href = url;
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>{_('Payment Status')}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>{_('Payment Status')}</SelectLabel>
                              {paymentStatusList.map((status, index) => (
                                <SelectItem key={index} value={status.code}>
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </>
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <Select
                        value={
                          currentFilters.find(
                            (f) => f.key === 'shipment_status'
                          )
                            ? currentFilters.find(
                                (f) => f.key === 'shipment_status'
                              ).value
                            : undefined
                        }
                        onValueChange={(value) => {
                          const url = new URL(document.location);
                          url.searchParams.set('shipment_status', value);
                          window.location.href = url;
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>{_('Shipment Status')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>{_('Shipment Status')}</SelectLabel>
                            {shipmentStatusList.map((status, index) => (
                              <SelectItem key={index} value={status.code}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )
                  },
                  sortOrder: 15
                }
              ]}
              currentFilters={currentFilters}
            />
          </div>
        </Form>
        <CardAction>
          <Button
            variant="link"
            className={'hover:cursor-pointer'}
            onClick={() => {
              const url = new URL(document.location);
              url.search = '';
              window.location.href = url.href;
            }}
          >
            {_('Clear Filters')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <div className="form-field mb-0">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(orders.map((o) => o.uuid));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                  />
                </div>
              </TableHead>
              <Area
                className=""
                id="orderGridHeader"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title={_('Order Number')}
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
                          title={_('Date')}
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
                          title={_('Customer Email')}
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
                          title={_('Shipment Status')}
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
                          title={_('Payment Status')}
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
                          title={_('Total')}
                          name="total"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 30
                  }
                ]}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions
              orders={orders}
              selectedIds={selectedRows}
              setSelectedRows={setSelectedRows}
            />
            {orders.map((o) => (
              <TableRow key={o.orderId}>
                <TableCell>
                  <div className="form-field mb-0">
                    <Checkbox
                      checked={selectedRows.includes(o.uuid)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRows(selectedRows.concat([o.uuid]));
                        } else {
                          setSelectedRows(
                            selectedRows.filter((row) => row !== o.uuid)
                          );
                        }
                      }}
                    />
                  </div>
                </TableCell>
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
                        default: () => <TableCell>{o.createdAt.text}</TableCell>
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <TableCell>{o.customerEmail}</TableCell>
                        )
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
                        default: () => (
                          <PaymentStatus status={o.paymentStatus} />
                        )
                      },
                      sortOrder: 25
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>{o.grandTotal.text}</TableCell>
                        )
                      },
                      sortOrder: 30
                    }
                  ]}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && (
          <div className="flex w-full justify-center">
            {_('There is no order to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
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
          badge: PropTypes.string.isRequired
        }).isRequired,
        paymentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired
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
