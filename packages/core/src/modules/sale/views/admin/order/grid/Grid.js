import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import Pagination from '../../../../../../lib/components/grid/Pagination';
import { get } from '../../../../../../lib/util/get';
import { Checkbox } from '../../../../../../lib/components/form/fields/Checkbox';
import { Card } from '../../../../../cms/views/admin/Card';
import { useAlertContext } from '../../../../../../lib/components/modal/Alert';

function Actions({ selectedIds = [], setSelectedRows }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const context = useAppState();
  const orders = get(context, 'grid.orders', []);
  const actions = [
    {
      name: 'Mark as fullfilled',
      onAction: (ids) => {
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
              const selectedOrders = orders.filter((o) => selectedIds.includes(parseInt(o.order_id)));
              await Promise.all(selectedOrders.map(async (order) => {
                await axios.post(order.createShipmentUrl);
              }));
              window.location.href = context.currentUrl;
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

export default function ProductGrid() {
  const orders = get(useAppState(), 'grid.orders', []);
  const total = get(useAppState(), 'grid.total', 0);
  const limit = get(useAppState(), 'grid.limit', 20);
  const page = get(useAppState(), 'grid.page', 1);
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox onChange={(e) => {
                if (e.target.checked) setSelectedRows(orders.map((o) => o.product_id));
                else setSelectedRows([]);
              }}
              />
            </th>
            <Area
              className=""
              id="orderGridHeader"
              noOuter
            />
          </tr>
        </thead>
        <tbody>
          <Actions ids={orders.map(() => orders.order_id)} selectedIds={selectedRows} setSelectedRows={setSelectedRows} />
          {orders.map((o, i) => (
            <tr key={i}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(o.order_id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRows(selectedRows.concat([o.order_id]));
                    else setSelectedRows(selectedRows.filter((e) => e !== o.order_id));
                  }}
                />
              </td>
              <Area
                className=""
                id="orderGridRow"
                row={o}
                noOuter
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
