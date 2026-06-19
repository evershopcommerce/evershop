import { GridPagination } from '@components/admin/grid/GridPagination';
import { DummyColumnHeader } from '@components/admin/grid/header/Dummy';
import { SortableHeader } from '@components/admin/grid/header/Sortable';
import { Status } from '@components/admin/Status.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import { Card } from '@components/common/ui/Card';
import {
  CardAction,
  CardContent,
  CardHeader
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
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { CouponName } from './rows/CouponName.js';

function Actions({ coupons = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const updateCoupons = async (status) => {
    setIsLoading(true);
    const promises = coupons
      .filter((coupon) => selectedIds.includes(coupon.uuid))
      .map((coupon) =>
        axios.patch(coupon.updateApi, {
          status,
          coupon: coupon.coupon
        })
      );
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const deleteCoupons = async () => {
    setIsLoading(true);
    const promises = coupons
      .filter((coupon) => selectedIds.includes(coupon.uuid))
      .map((coupon) => axios.delete(coupon.deleteApi));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const actions = [
    {
      name: _('Disable'),
      onAction: () => {
        openAlert({
          heading: _('Disable ${count} coupons', {
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
              await updateCoupons(0);
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
          heading: _('Enable ${count} coupons', {
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
              await updateCoupons(1);
            },
            variant: 'destructive'
          }
        });
      }
    },
    {
      name: _('Delete'),
      onAction: () => {
        openAlert({
          heading: _('Delete ${count} coupons', {
            count: selectedIds.length
          }),
          content: <div>{_("Can't be undone")}</div>,
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Delete'),
            onAction: async () => {
              await deleteCoupons();
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
  coupons: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      updateApi: PropTypes.string.isRequired,
      deleteApi: PropTypes.string.isRequired,
      coupon: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function CouponGrid({
  coupons: { items: coupons, total, currentFilters = [] }
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
        <Form submitBtn={false} id="couponGridFilter">
          <div className="flex gap-5 justify-center items-center">
            <Area
              id="couponGridFilter"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <InputField
                        name="coupon"
                        placeholder={_('Search')}
                        defaultValue={
                          currentFilters.find((f) => f.key === 'coupon')?.value
                        }
                        onKeyPress={(e) => {
                          // If the user press enter, we should submit the form
                          if (e.key === 'Enter') {
                            const url = new URL(document.location);
                            const coupon = e.target?.value;
                            if (coupon) {
                              url.searchParams.set('coupon[operation]', 'like');
                              url.searchParams.set('coupon[value]', coupon);
                            } else {
                              url.searchParams.delete('coupon[operation]');
                              url.searchParams.delete('coupon[value]');
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
                },
                {
                  component: {
                    default: () => (
                      <Select
                        value={
                          currentFilters.find((f) => f.key === 'free_shipping')
                            ?.value
                        }
                        onValueChange={(value) => {
                          const url = new URL(document.location);
                          url.searchParams.set('free_shipping', value);
                          window.location.href = url.href;
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>{_('Free shipping ?')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>{_('Free shipping ?')}</SelectLabel>
                            <SelectItem value="1">{_('Free shipping')}</SelectItem>
                            <SelectItem value="0">
                              {_('No free shipping')}
                            </SelectItem>
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
              <TableHead>
                <div className="form-field mb-0">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedRows(coupons.map((c) => c.uuid));
                      else setSelectedRows([]);
                    }}
                  />
                </div>
              </TableHead>
              <Area
                id="couponGridHeader"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title={_('Coupon Code')}
                          name="coupon"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => <DummyColumnHeader title={_('State Date')} />
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => <DummyColumnHeader title={_('End Date')} />
                    },
                    sortOrder: 30
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
                    sortOrder: 40
                  },
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title={_('Used Times')}
                          name="used_time"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 50
                  }
                ]}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions
              coupons={coupons}
              selectedIds={selectedRows}
              setSelectedRows={setSelectedRows}
            />
            {coupons.map((c) => (
              <TableRow key={c.couponId}>
                <TableHead>
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
                </TableHead>
                <Area
                  id="couponGridRow"
                  row={c}
                  noOuter
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <CouponName url={c.editUrl} name={c.coupon} />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>{c.startDate?.text || '--'}</TableCell>
                        )
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>{c.endDate?.text || '--'}</TableCell>
                        )
                      },
                      sortOrder: 30
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <Status status={parseInt(c.status, 10)} />
                        )
                      },
                      sortOrder: 40
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <TableCell>{c.usedTime}</TableCell>
                        )
                      },
                      sortOrder: 50
                    }
                  ]}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {coupons.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no coupon to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

CouponGrid.propTypes = {
  coupons: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        couponId: PropTypes.number.isRequired,
        uuid: PropTypes.string.isRequired,
        coupon: PropTypes.string.isRequired,
        status: PropTypes.number.isRequired,
        usedTime: PropTypes.number.isRequired,
        startDate: PropTypes.shape({
          text: PropTypes.string.isRequired
        }),
        endDate: PropTypes.shape({
          text: PropTypes.string.isRequired
        }),
        editUrl: PropTypes.string.isRequired,
        updateApi: PropTypes.string.isRequired,
        deleteApi: PropTypes.string.isRequired
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
    coupons (filters: $filters) {
      items {
        couponId
        uuid
        coupon
        status
        usedTime
        startDate {
          text
        }
        endDate {
          text
        }
        editUrl
        updateApi
        deleteApi
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
