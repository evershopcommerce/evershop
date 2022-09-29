import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../lib/components/Area';
import Pagination from '../../../../../lib/components/grid/Pagination';
import { Checkbox } from '../../../../../lib/components/form/fields/Checkbox';
import { useAlertContext } from '../../../../../lib/components/modal/Alert';
import formData from '../../../../../lib/util/formData';
import BasicColumnHeader from '../../../../../lib/components/grid/headers/Basic';
import FromToColumnHeader from '../../../../../lib/components/grid/headers/FromTo';
import StatusColumnHeader from '../../../../../lib/components/grid/headers/Status';
import CouponName from './rows/CouponName';
import BasicRow from '../../../../../lib/components/grid/rows/BasicRow';
import StatusRow from '../../../../../lib/components/grid/rows/StatusRow';
import { Card } from '../../../../cms/components/admin/Card';

function Actions({ selectedIds = [], enableCouponsUrl, disableCouponUrl, deleteCouponsUrl }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const actions = [
    {
      name: 'Disable',
      onAction: () => {
        openAlert({
          heading: `Disable ${selectedIds.length} coupons`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Disable',
            onAction: async () => {
              setIsLoading(true);
              dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
              const response = await axios.post(disableCouponUrl, formData().append('ids', selectedIds).build());
              // setIsLoading(false);
              if (response.data.success === true) {
                location.reload();
                // TODO: Should display a message and delay for 1 - 2 second
              }
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    },
    {
      name: 'Enable',
      onAction: () => {
        openAlert({
          heading: `Enable ${selectedIds.length} coupons`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Enable',
            onAction: async () => {
              setIsLoading(true);
              dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
              const response = await axios.post(enableCouponsUrl, formData().append('ids', selectedIds).build());
              // setIsLoading(false);
              if (response.data.success === true) {
                location.reload();
                // TODO: Should display a message and delay for 1 - 2 second
              }
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    },
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} coupons`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              setIsLoading(true);
              dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
              const response = await axios.post(deleteCouponsUrl, formData().append('ids', selectedIds).build());
              // setIsLoading(false);
              if (response.data.success === true) {
                location.reload();
                // TODO: Should display a message and delay for 1 - 2 second
              }
            },
            variant: 'critical',
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

export default function CouponGrid({ coupons: { items: coupons, total, currentFilters = [] }, disableCouponUrl, enableCouponsUrl, deleteCouponsUrl }) {
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
                if (e.target.checked) setSelectedRows(coupons.map((c) => c.couponId));
                else setSelectedRows([]);
              }}
              />
            </th>
            <Area
              id="couponGridHeader"
              noOuter
              coreComponents={[
                {
                  component: { default: () => <BasicColumnHeader title='Coupon Code' id='coupon' currentFilter={currentFilters.find(f => f.key === 'coupon')} /> },
                  sortOrder: 10
                },
                {
                  component: { default: () => <FromToColumnHeader title='State Date' id='startDate' currentFilter={currentFilters.find(f => f.key === 'startDate')} /> },
                  sortOrder: 20
                },
                {
                  component: { default: () => <FromToColumnHeader title='End Date' id='endDate' currentFilter={currentFilters.find(f => f.key === 'endDate')} /> },
                  sortOrder: 30
                },
                {
                  component: { default: () => <StatusColumnHeader title='Status' id='status' currentFilter={currentFilters.find(f => f.key === 'status')} /> },
                  sortOrder: 40
                },
                {
                  component: { default: () => <FromToColumnHeader title='Used Times' id='usedTime' currentFilter={currentFilters.find(f => f.key === 'usedTime')} /> },
                  sortOrder: 50
                }
              ]}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            ids={coupons.map((c) => c.couponId)}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
            disableCouponUrl={disableCouponUrl}
            enableCouponsUrl={enableCouponsUrl}
            deleteCouponsUrl={deleteCouponsUrl}
          />
          {coupons.map((c) => (
            <tr key={c.couponId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(c.couponId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([c.couponId]));
                    } else {
                      setSelectedRows(selectedRows.filter((row) => row !== c.couponId));
                    }
                  }}
                />
              </td>
              <Area
                id="couponGridRow"
                row={c}
                noOuter
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                coreComponents={[
                  {
                    component: { default: () => <CouponName url={c.editUrl} name={c.name} /> },
                    sortOrder: 10
                  },
                  {
                    component: { default: ({ areaProps }) => <BasicRow id='startDate' areaProps={areaProps} /> },
                    sortOrder: 20
                  },
                  {
                    component: { default: ({ areaProps }) => <BasicRow id='endDate' areaProps={areaProps} /> },
                    sortOrder: 30
                  },
                  {
                    component: { default: ({ areaProps }) => <StatusRow title='Status' id='status' areaProps={areaProps} /> },
                    sortOrder: 40
                  },
                  {
                    component: { default: ({ areaProps }) => <BasicRow id='usedTime' areaProps={areaProps} /> },
                    sortOrder: 50
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {coupons.length === 0
        && <div className="flex w-full justify-center">There is no coupon to display</div>}
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
    coupons (filters: getContextValue("filtersFromUrl")) {
      items {
        couponId
        coupon
        status
        usedTime
        startDate
        endDate
        editUrl
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
    disableCouponUrl: url(routeId: "couponBulkDisable")
    enableCouponsUrl: url(routeId: "couponBulkEnable")
    deleteCouponsUrl: url(routeId: "couponBulkDelete")
  }
`;