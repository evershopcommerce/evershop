/* eslint-disable react/no-unstable-nested-components,no-nested-ternary */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '@components/common/Area';
import Pagination from '@components/common/grid/Pagination';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { useAlertContext } from '@components/common/modal/Alert';
import ProductNameRow from '@components/admin/catalog/productGrid/rows/ProductName';
import StatusRow from '@components/common/grid/rows/StatusRow';
import ProductPriceRow from '@components/admin/catalog/productGrid/rows/PriceRow';
import BasicRow from '@components/common/grid/rows/BasicRow';
import ThumbnailRow from '@components/admin/catalog/productGrid/rows/ThumbnailRow';
import { Card } from '@components/admin/cms/Card';
import DummyColumnHeader from '@components/common/grid/headers/Dummy';
import QtyRow from '@components/admin/catalog/productGrid/rows/QtyRow';
import SortableHeader from '@components/common/grid/headers/Sortable';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';
import Filter from '@components/common/list/Filter';

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
      name: 'Disable',
      onAction: () => {
        openAlert({
          heading: `Disable ${selectedIds.length} products`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Disable',
            onAction: async () => {
              await updateProducts(0);
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
          heading: `Enable ${selectedIds.length} products`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Enable',
            onAction: async () => {
              await updateProducts(1);
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
          heading: `Delete ${selectedIds.length} products`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteProducts();
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
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan="100">
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-3 pb-3 pl-6 pr-6">
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
                className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
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
      <Card.Session
        title={
          <Form submitBtn={false} id="productGridFilter">
            <div className="flex gap-8 justify-center items-center">
              <Area
                id="productGridFilter"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <Field
                          name="keyword"
                          type="text"
                          id="keyword"
                          placeholder="Search"
                          value={
                            currentFilters.find((f) => f.key === 'keyword')
                              ?.value
                          }
                          onKeyPress={(e) => {
                            // If the user press enter, we should submit the form
                            if (e.key === 'Enter') {
                              const url = new URL(document.location);
                              const keyword =
                                document.getElementById('keyword')?.value;
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
                          options={[
                            {
                              label: 'Enabled',
                              value: '1',
                              onSelect: () => {
                                const url = new URL(document.location);
                                url.searchParams.set('status', 1);
                                window.location.href = url;
                              }
                            },
                            {
                              label: 'Disabled',
                              value: '0',
                              onSelect: () => {
                                const url = new URL(document.location);
                                url.searchParams.set('status', 0);
                                window.location.href = url;
                              }
                            }
                          ]}
                          selectedOption={
                            currentFilters.find((f) => f.key === 'status')
                              ? currentFilters.find((f) => f.key === 'status')
                                  .value === '1'
                                ? 'Enabled'
                                : 'Disabled'
                              : undefined
                          }
                          title="Status"
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => (
                        <Filter
                          options={[
                            {
                              label: 'Simple',
                              value: '1',
                              onSelect: () => {
                                const url = new URL(document.location);
                                url.searchParams.set('type', 'simple');
                                window.location.href = url;
                              }
                            },
                            {
                              label: 'Configurable',
                              value: '0',
                              onSelect: () => {
                                const url = new URL(document.location);
                                url.searchParams.set('type', 'configurable');
                                window.location.href = url;
                              }
                            }
                          ]}
                          selectedOption={
                            currentFilters.find((f) => f.key === 'type')
                              ? currentFilters.find((f) => f.key === 'type')
                                  .value
                              : undefined
                          }
                          title="Product type"
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
              <Checkbox
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows(products.map((p) => p.uuid));
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>
            <Area
              id="productGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <th className="column">
                        <div className="table-header id-header">
                          <div className="font-medium uppercase text-xl">
                            <span>Thumbnail</span>
                          </div>
                        </div>
                      </th>
                    )
                  },
                  sortOrder: 5
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Name"
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
                        title="Price"
                        name="price"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => <DummyColumnHeader title="SKU" />
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        title="Stock"
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
                        title="Status"
                        name="status"
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
            products={products}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {products.map((p) => (
            <tr key={p.uuid}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(p.uuid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([p.uuid]));
                    } else {
                      setSelectedRows(
                        selectedRows.filter((row) => row !== p.uuid)
                      );
                    }
                  }}
                />
              </td>
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
                        <ThumbnailRow src={p.image?.thumb} name={p.name} />
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
                      default: ({ areaProps }) => (
                        <ProductPriceRow areaProps={areaProps} />
                      )
                    },
                    sortOrder: 15
                  },
                  {
                    // eslint-disable-next-line react/no-unstable-nested-components
                    component: {
                      default: ({ areaProps }) => (
                        <BasicRow id="sku" areaProps={areaProps} />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    // eslint-disable-next-line react/no-unstable-nested-components
                    component: {
                      default: () => <QtyRow qty={p.inventory?.qty} />
                    },
                    sortOrder: 25
                  },
                  {
                    // eslint-disable-next-line react/no-unstable-nested-components
                    component: {
                      default: ({ areaProps }) => (
                        <StatusRow id="status" areaProps={areaProps} />
                      )
                    },
                    sortOrder: 30
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && (
        <div className="flex w-full justify-center">
          There is no product to display
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
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
          thumb
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
