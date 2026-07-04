import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { DummyColumnHeader } from '@components/admin/grid/header/Dummy.js';
import { SortableHeader } from '@components/admin/grid/header/Sortable.js';
import { Status } from '@components/admin/Status.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import { Card } from '@components/common/ui/Card.js';
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
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React, { useState } from 'react';
import { LandingPageName } from './rows/LandingPageName.js';

interface LandingPageItem {
  landingPageId: number;
  uuid: string;
  name: string;
  urlKey: string;
  status: boolean;
  url: string;
  editUrl: string;
  updateApi: string;
  deleteApi: string;
  duplicateApi: string;
  pageBuilderUrl: string;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

function Actions({
  landingPages = [],
  selectedIds = []
}: {
  landingPages: LandingPageItem[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();
  const [, setIsLoading] = useState(false);

  const updateLandingPages = async (status: boolean) => {
    setIsLoading(true);
    const promises = landingPages
      .filter((landingPage) => selectedIds.includes(landingPage.uuid))
      .map((landingPage) => axios.patch(landingPage.updateApi, { status }));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const deleteLandingPages = async () => {
    setIsLoading(true);
    const promises = landingPages
      .filter((landingPage) => selectedIds.includes(landingPage.uuid))
      .map((landingPage) => axios.delete(landingPage.deleteApi));
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
          heading: _('Disable ${count} landing pages', {
            count: String(selectedIds.length)
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
              await updateLandingPages(false);
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
          heading: _('Enable ${count} landing pages', {
            count: String(selectedIds.length)
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
              await updateLandingPages(true);
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
          heading: _('Delete ${count} landing pages', {
            count: String(selectedIds.length)
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
              await deleteLandingPages();
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
        <TableCell colSpan={100}>
          <ButtonGroup>
            {actions.map((action, i) => (
              <Button
                key={i}
                variant="outline"
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

interface LandingPageGridProps {
  landingPages: {
    items: LandingPageItem[];
    total: number;
    currentFilters?: Filter[];
  };
}

export default function LandingPageGrid({
  landingPages: { items: landingPages, total, currentFilters = [] }
}: LandingPageGridProps) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'page')!.value,
        10
      )
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? parseInt(
        currentFilters.find((filter) => filter.key === 'limit')!.value,
        10
      )
    : 20;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <Form submitBtn={false} id="landingPageGridFilter">
          <Area
            id="landingPageGridFilter"
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
                          const url = new URL(document.location.href);
                          const name = (e.target as HTMLInputElement)?.value;
                          if (name) {
                            url.searchParams.set('name[operation]', 'like');
                            url.searchParams.set('name[value]', name);
                          } else {
                            url.searchParams.delete('name[operation]');
                            url.searchParams.delete('name[value]');
                          }
                          window.location.href = url.href;
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
            variant="link"
            onClick={() => {
              const url = new URL(document.location.href);
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
                      if (checked) {
                        setSelectedRows(landingPages.map((l) => l.uuid));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                  />
                </div>
              </TableHead>
              <Area
                id="landingPageGridHeader"
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
                          title={_('URL key')}
                          name="url_key"
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
                          title={_('Status')}
                          name="status"
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 30
                  },
                  {
                    component: {
                      default: () => <DummyColumnHeader title="" />
                    },
                    sortOrder: 40
                  }
                ]}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions landingPages={landingPages} selectedIds={selectedRows} />
            {landingPages.map((l) => (
              <TableRow key={l.landingPageId}>
                <TableHead>
                  <div className="form-field mb-0">
                    <Checkbox
                      checked={selectedRows.includes(l.uuid)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRows(selectedRows.concat([l.uuid]));
                        } else {
                          setSelectedRows(
                            selectedRows.filter((row) => row !== l.uuid)
                          );
                        }
                      }}
                    />
                  </div>
                </TableHead>
                <Area
                  id="landingPageGridRow"
                  row={l}
                  noOuter
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <LandingPageName url={l.editUrl} name={l.name} />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: () => <TableCell>{l.urlKey}</TableCell>
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: () => <Status status={l.status ? 1 : 0} />
                      },
                      sortOrder: 30
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <a
                                className="hover:underline text-interactive"
                                href={l.pageBuilderUrl}
                              >
                                {_('Build in page builder')}
                              </a>
                              <button
                                type="button"
                                className="hover:underline text-interactive"
                                onClick={async () => {
                                  await axios.post(l.duplicateApi);
                                  window.location.reload();
                                }}
                              >
                                {_('Duplicate')}
                              </button>
                            </div>
                          </TableCell>
                        )
                      },
                      sortOrder: 40
                    }
                  ]}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {landingPages.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no landing page to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    landingPages(filters: $filters) {
      items {
        landingPageId
        uuid
        name
        urlKey
        status
        url
        editUrl
        updateApi
        deleteApi
        duplicateApi
        pageBuilderUrl
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
