import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../lib/components/Area';
import Pagination from '../../../../../lib/components/grid/Pagination';
import { Checkbox } from '../../../../../lib/components/form/fields/Checkbox';
import { useAlertContext } from '../../../../../lib/components/modal/Alert';
import StatusRow from '../../../../../lib/components/grid/rows/StatusRow';
import BasicRow from '../../../../../lib/components/grid/rows/BasicRow';
import BasicColumnHeader from '../../../../../lib/components/grid/headers/Basic';
import DropdownColumnHeader from '../../../../../lib/components/grid/headers/Dropdown';
import { Card } from '../../../../cms/components/admin/Card';
import CustomerNameRow from './rows/CustomerName';
import CreateAt from './rows/CreateAt';

function Actions({ selectedIds = [], disableCustomersUrl, enableCustomersUrl }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const actions = [
    {
      name: 'Disable',
      onAction: () => {
        openAlert({
          heading: `Disable ${selectedIds.length} customers`,
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
              const response = await axios.post(disableCustomersUrl, { ids: selectedIds });
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
          heading: `Enable ${selectedIds.length} customers`,
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
              const response = await axios.post(enableCustomersUrl, { ids: selectedIds });
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

export default function CustomerGrid({ customers: { items: customers, total, currentFilters = [] }, disableCustomersUrl, enableCustomersUrl }) {
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
                if (e.target.checked) setSelectedRows(customers.map((c) => c.customerId));
                else setSelectedRows([]);
              }}
              />
            </th>
            <Area
              id="customerGridHeader"
              noOuter
              coreComponents={
                [
                  {
                    component: { default: () => <BasicColumnHeader title="Full Name" id='full_name' currentFilters={currentFilters} /> },
                    sortOrder: 10
                  },
                  {
                    component: { default: () => <BasicColumnHeader title="Email" id='email' currentFilters={currentFilters} /> },
                    sortOrder: 15
                  },
                  {
                    component: { default: () => <DropdownColumnHeader title='Status' id='status' currentFilters={currentFilters} options={[{ value: 1, text: 'Enabled' }, { value: 0, text: 'Disabled' }]} /> },
                    sortOrder: 20
                  },
                  {
                    component: { default: () => <BasicColumnHeader title="Created At" id='created_at' currentFilters={currentFilters} /> },
                    sortOrder: 25
                  }
                ]
              }
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            ids={customers.map(() => customers.customerId)}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
            disableCustomersUrl={disableCustomersUrl}
            enableCustomersUrl={enableCustomersUrl}
          />
          {customers.map((c) => (
            <tr key={c.customerId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(c.customerId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([c.customerId]));
                    } else {
                      setSelectedRows(selectedRows.filter((row) => row !== c.customerId));
                    }
                  }}
                />
              </td>
              <Area
                id="customerGridRow"
                row={c}
                noOuter
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                coreComponents={[
                  {
                    component: { default: ({ areaProps }) => <CustomerNameRow id='name' name={c.fullName} url={c.editUrl} /> },
                    sortOrder: 10
                  },
                  {
                    component: { default: ({ areaProps }) => <BasicRow id='email' areaProps={areaProps} /> },
                    sortOrder: 15
                  },
                  {
                    component: { default: ({ areaProps }) => <StatusRow id='status' areaProps={areaProps} /> },
                    sortOrder: 20
                  },
                  {
                    component: { default: () => <CreateAt time={c.createdAt.text} /> },
                    sortOrder: 25
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {customers.length === 0
        && <div className="flex w-full justify-center">There is no customer to display</div>}
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
    customers (filters: getContextValue("filtersFromUrl")) {
      items {
        customerId
        fullName
        email
        status
        createdAt {
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
    disableCustomersUrl: url(routeId: "disableCustomers")
    enableCustomersUrl: url(routeId: "enableCustomers")
  }
`;