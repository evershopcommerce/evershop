import { GridPagination } from '@components/admin/grid/GridPagination';
import { SortableHeader } from '@components/admin/grid/header/Sortable';
import { Status } from '@components/admin/Status.js';
import Area from '@components/common/Area';
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
import { PageName } from './rows/PageName.js';

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
      name: _('Disable'),
      onAction: () => {
        openAlert({
          heading: _('Disable ${count} pages', { count: selectedIds.length }),
          content: _('Are you sure?'),
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Disable'),
            onAction: async () => {
              await updatePages(0);
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
          heading: _('Enable ${count} pages', { count: selectedIds.length }),
          content: _('Are you sure?'),
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Enable'),
            onAction: async () => {
              await updatePages(1);
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
          heading: _('Delete ${count} pages', { count: selectedIds.length }),
          content: <div>{_("Can't be undone")}</div>,
          primaryAction: {
            title: _('Cancel'),
            onAction: closeAlert,
            variant: 'secondary'
          },
          secondaryAction: {
            title: _('Delete'),
            onAction: async () => {
              await deletePages();
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
      <CardHeader className="flex justify-between">
        <Form submitBtn={false} id="pageGridFilter">
          <Area
            id="cmsPageGridFilter"
            noOuter
            coreComponents={[
              {
                component: {
                  default: () => (
                    <InputField
                      name="name"
                      placeholder={_('Search')}
                      defaultValue={
                        currentFilters.find((f) => f.key === 'name')?.value
                      }
                      onKeyPress={(e) => {
                        // If the user press enter, we should submit the form
                        if (e.key === 'Enter') {
                          const url = new URL(document.location);
                          const name = e.target?.value;
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
        <CardAction>
          <Button
            variant={'link'}
            onClick={() => {
              // Just get the url and remove all query params
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
              <TableCell>
                <div className="form-field mb-0">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(pages.map((p) => p.uuid));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                  />
                </div>
              </TableCell>
              <Area
                className=""
                id="pageGridHeader"
                noOuter
                coreComponents={[
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
                          title={_('Status')}
                          name="status"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 20
                  }
                ]}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions
              pages={pages}
              selectedIds={selectedRows}
              setSelectedRows={setSelectedRows}
            />
            {pages.map((p, i) => (
              <TableRow key={i}>
                <TableCell style={{ width: '2rem' }}>
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
                  className=""
                  id="pageGridRow"
                  row={p}
                  noOuter
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <PageName url={p.editUrl} name={p.name} />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <Status status={parseInt(p.status, 10)} />
                        )
                      },
                      sortOrder: 20
                    }
                  ]}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pages.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no page to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
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
