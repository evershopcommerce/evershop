import { Card } from '@components/admin/cms/Card';
import PageName from '@components/admin/cms/cmsPageGrid/rows/PageName';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Form } from '@components/common/form/Form';
import SortableHeader from '@components/common/grid/headers/Sortable';
import Pagination from '@components/common/grid/Pagination';
import StatusRow from '@components/common/grid/rows/StatusRow';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

function Actions({ pages = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const updatePages = async (status) => {
    setIsLoading(true);
    const promises = pages
      .filter((page) => selectedIds.includes(page.uuid))
      .map((page) =>
        axios.patch(page.updateApi, {
          status
        })
      );
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const deletePages = async () => {
    setIsLoading(true);
    const promises = pages
      .filter((page) => selectedIds.includes(page.uuid))
      .map((page) => axios.delete(page.deleteApi));
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
          heading: `Disable ${selectedIds.length} pages`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Disable',
            onAction: async () => {
              await updatePages(0);
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
          heading: `Enable ${selectedIds.length} pages`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Enable',
            onAction: async () => {
              await updatePages(1);
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
          heading: `Delete ${selectedIds.length} pages`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deletePages();
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
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      updateApi: PropTypes.string.isRequired,
      deleteApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function CMSPageGrid({
  cmsPages: { items: pages, total, currentFilters = [] }
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
          <Form submitBtn={false} id="pageGridFilter">
            <Area
              id="cmsPageGridFilter"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <Field
                        type="text"
                        id="name"
                        name="name"
                        placeholder="Search"
                        value={
                          currentFilters.find((f) => f.key === 'name')?.value
                        }
                        onKeyPress={(e) => {
                          // If the user press enter, we should submit the form
                          if (e.key === 'Enter') {
                            const url = new URL(document.location);
                            const name = document.getElementById('name')?.value;
                            if (name) {
                              url.searchParams.set('name[operation]', 'like');
                              url.searchParams.set('name[value]', name);
                            } else {
                              url.searchParams.delete('name[operation]');
                              url.searchParams.delete('name[value]');
                            }
                            window.location.href = url;
                          }
                        }}
                      />
                    )
                  },
                  sortOrder: 10
                }
              ]}
            />
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
              <Checkbox
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows(pages.map((p) => p.uuid));
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>
            <Area
              className=""
              id="pageGridHeader"
              noOuter
              coreComponents={[
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
                        title="Status"
                        name="status"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 20
                }
              ]}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            pages={pages}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {pages.map((p, i) => (
            <tr key={i}>
              <td style={{ width: '2rem' }}>
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
                className=""
                id="pageGridRow"
                row={p}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => <PageName url={p.editUrl} name={p.name} />
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: ({ areaProps }) => (
                        <StatusRow id="status" areaProps={areaProps} />
                      )
                    },
                    sortOrder: 20
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length === 0 && (
        <div className="flex w-full justify-center">
          There is no page to display
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

CMSPageGrid.propTypes = {
  cmsPages: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        uuid: PropTypes.string.isRequired,
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
    )
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    cmsPages (filters: $filters) {
      items {
        cmsPageId
        uuid
        name
        status
        content
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
