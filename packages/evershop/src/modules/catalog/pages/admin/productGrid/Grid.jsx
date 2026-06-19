import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { DummyColumnHeader } from '@components/admin/grid/header/Dummy';
import { SortableHeader } from '@components/admin/grid/header/Sortable.js';
import { Thumbnail } from '@components/admin/grid/Thumbnail.js';
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
import { Check } from 'lucide-react';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { ProductNameRow } from './rows/ProductName.js';

function Actions({ products = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const updateProducts = async (status) => {
    setIsLoading(true);
    const promises = products
      .filter((product) => selectedIds.includes(product.uuid))
      .map((product) =>
        axios.patch(product.updateApi, {
          status
        })
      );
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const deleteProducts = async () => {
    setIsLoading(true);
    const promises = products
      .filter((product) => selectedIds.includes(product.uuid))
      .map((product) => axios.delete(product.deleteApi));
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
          heading: _('Disable ${count} products', {
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
              await updateProducts(0);
            },
            variant: 'default',
            isLoading: false
          }
        });
      }
    },
    {
      name: _('Enable'),
      onAction: () => {
        openAlert({
          heading: _('Enable ${count} products', {
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
              await updateProducts(1);
            },
            variant: 'default',
            isLoading: false
          }
        });
      }
    },
    {
      name: _('Delete'),
      onAction: () => {
        openAlert({
          heading: _('Delete ${count} products', {
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
              await deleteProducts();
            },
            variant: 'destructive',
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
  products: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      updateApi: PropTypes.string.isRequired,
      deleteApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function ProductGrid({
  products: { items: products, total, currentFilters = [] }
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
        <Form submitBtn={false} id="productGridFilter">
          <div className="flex gap-5 justify-center items-center">
            <Area
              id="productGridFilter"
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
                },
                {
                  component: {
                    default: () => (
                      <Select
                        value={
                          currentFilters.find((f) => f.key === 'type')?.value
                        }
                        onValueChange={(value) => {
                          const url = new URL(document.location);
                          url.searchParams.set('type', value);
                          window.location.href = url.href;
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>{_('Product type')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>{_('Product type')}</SelectLabel>
                            <SelectItem value="simple">{_('Simple')}</SelectItem>
                            <SelectItem value="configurable">
                              {_('Configurable')}
                            </SelectItem>
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
                <Checkbox
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRows(products.map((p) => p.uuid));
                    } else {
                      setSelectedRows([]);
                    }
                  }}
                />
              </TableHead>
              <Area
                id="productGridHeader"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <TableHead>
                          <div className="table-header id-header">
                            <div className="font-medium uppercase text-xs">
                              <span>{_('Thumbnail')}</span>
                            </div>
                          </div>
                        </TableHead>
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title={_('Name')}
                          name="name"
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
                          title={_('Price')}
                          name="price"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: () => <DummyColumnHeader title={_('SKU')} />
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          title={_('Stock')}
                          name="qty"
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
                          title={_('Status')}
                          name="status"
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
              products={products}
              selectedIds={selectedRows}
              setSelectedRows={setSelectedRows}
            />
            {products.map((p) => (
              <TableRow key={p.uuid}>
                <TableCell>
                  <div className="form-field mb-0">
                    <Checkbox
                      checked={selectedRows.includes(p.uuid)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRows(selectedRows.concat([p.uuid]));
                        } else {
                          setSelectedRows(
                            selectedRows.filter((row) => row !== p.uuid)
                          );
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <Area
                  id="productGridRow"
                  row={p}
                  noOuter
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <Thumbnail src={p.image?.url} name={p.name} />
                        )
                      },
                      sortOrder: 5
                    },
                    {
                      component: {
                        default: () => (
                          <ProductNameRow
                            id="name"
                            name={p.name}
                            url={p.editUrl}
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>{p.price?.regular.text}</TableCell>
                        )
                      },
                      sortOrder: 15
                    },
                    {
                      component: {
                        default: () => <TableCell>{p.sku}</TableCell>
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: () => <TableCell>{p.inventory?.qty}</TableCell>
                      },
                      sortOrder: 25
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <Status id="status" status={parseInt(p.status, 10)} />
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
        {products.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no product to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

ProductGrid.propTypes = {
  products: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        productId: PropTypes.number,
        uuid: PropTypes.string,
        name: PropTypes.string,
        image: PropTypes.shape({
          thumb: PropTypes.string
        }),
        sku: PropTypes.string,
        status: PropTypes.number,
        inventory: PropTypes.shape({
          qty: PropTypes.number
        }),
        price: PropTypes.shape({
          regular: PropTypes.shape({
            value: PropTypes.number,
            text: PropTypes.string
          })
        }),
        editUrl: PropTypes.string,
        updateApi: PropTypes.string,
        deleteApi: PropTypes.string
      })
    ),
    total: PropTypes.number,
    currentFilters: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        operation: PropTypes.string,
        value: PropTypes.string
      })
    )
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    products (filters: $filters) {
      items {
        productId
        uuid
        name
        image {
          url
          alt
        }
        sku
        status
        inventory {
          qty
        }
        price {
          regular {
            value
            text
          }
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
    newProductUrl: url(routeId: "productNew")
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
