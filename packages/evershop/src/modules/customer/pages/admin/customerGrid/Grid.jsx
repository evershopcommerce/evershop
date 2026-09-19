import { GridPagination } from '@components/admin/grid/GridPagination';
import { SortableHeader } from '@components/admin/grid/header/Sortable';
import { Status } from '@components/admin/Status.js';
import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
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
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { CustomerName } from './rows/CustomerName.js';

function Actions({ customers = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();

  const updateCustomers = async (status) => {
    const promises = customers
      .filter((customer) => selectedIds.includes(customer.uuid))
      .map((customer) =>
        axios.patch(customer.updateApi, {
          status
        })
      );
    await Promise.all(promises);
    // Refresh the page
    window.location.reload();
  };

  const actions = [
    {
      name: _('Disable'),
      onAction: () => {
        openAlert({
          heading: _('Disable ${count} customers', {
            count: selectedIds.length
          }),
          content: _('Are you sure?'),
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Disable'),
            onAction: async () => {
              await updateCustomers(0);
            },
            variant: 'destructive'
          }
        });
      }
    },
    {
      name: _('Enable'),
      onAction: () => {
        openAlert({
          heading: _('Enable ${count} customers', {
            count: selectedIds.length
          }),
          content: _('Are you sure?'),
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Enable'),
            onAction: async () => {
              await updateCustomers(1);
            },
            variant: 'destructive'
          }
        });
      }
    }
  ];

  return (
    <TableRow>
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <TableCell colSpan="100">
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
  customers: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      updateApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function CustomerGrid({
  customers: { items: customers, total, currentFilters = [] }
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
        <Form submitBtn={false} id="customerGridFilter">
          <div className="flex gap-5 justify-center items-center">
            <Area
              id="customerGridFilter"
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
                      <Select
                        value={
                          currentFilters.find((f) => f.key === 'status')?.value
                        }
                        onValueChange={(value) => {
                          const url = new URL(document.location);
                          url.searchParams.set('status', value);
                          window.location.href = url.href;
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>{_('Status')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>{_('Status')}</SelectLabel>
                            <SelectItem value="1">{_('Enabled')}</SelectItem>
                            <SelectItem value="0">{_('Disabled')}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )
                  },
                  sortOrder: 10
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
            {_('Clear filter')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="align-bottom">
                <div className="form-field mb-0">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      if (checked)
                        setSelectedRows(customers.map((c) => c.uuid));
                      else setSelectedRows([]);
                    }}
                  />
                </div>
              </TableCell>
              <Area
                id="customerGridHeader"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title={_('Full Name')}
                          name="full_name"
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
                          title={_('Email')}
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
                          title={_('Status')}
                          name="status"
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
                          title={_('Created At')}
                          name="created_at"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 25
                  }
                ]}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions
              customers={customers}
              selectedIds={selectedRows}
              setSelectedRows={setSelectedRows}
            />
            {customers.map((c) => (
              <TableRow key={c.customerId}>
                <TableCell>
                  <div className="form-field mb-0">
                    <Checkbox
                      checked={selectedRows.includes(c.uuid)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRows(selectedRows.concat([c.uuid]));
                        } else {
                          setSelectedRows(
                            selectedRows.filter((row) => row !== c.uuid)
                          );
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <Area
                  id="customerGridRow"
                  row={c}
                  noOuter
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <CustomerName name={c.fullName} url={c.editUrl} />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <TableCell>{c.email}</TableCell>
                        )
                      },
                      sortOrder: 15
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <Status status={parseInt(c.status, 10)} />
                        )
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: () => <TableCell>{c.createdAt.text}</TableCell>
                      },
                      sortOrder: 25
                    }
                  ]}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {customers.length === 0 && (
          <div className="flex w-full justify-center mt-3">
            {_('There is no customer to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

CustomerGrid.propTypes = {
  customers: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        customerId: PropTypes.number.isRequired,
        uuid: PropTypes.string.isRequired,
        fullName: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
        status: PropTypes.number.isRequired,
        createdAt: PropTypes.shape({
          value: PropTypes.string.isRequired,
          text: PropTypes.string.isRequired
        }).isRequired,
        editUrl: PropTypes.string.isRequired,
        updateApi: PropTypes.string.isRequired
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
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    customers (filters: $filters) {
      items {
        customerId
        uuid
        fullName
        email
        status
        createdAt {
          value
          text
        }
        editUrl
        updateApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
