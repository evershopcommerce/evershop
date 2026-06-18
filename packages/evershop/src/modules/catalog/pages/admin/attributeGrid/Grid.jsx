import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { DummyColumnHeader } from '@components/admin/grid/header/Dummy';
import { SortableHeader } from '@components/admin/grid/header/Sortable';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert';
import { Badge } from '@components/common/ui/Badge.js';
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
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { AttributeNameRow } from './rows/AttributeName.js';
import { GroupRow } from './rows/GroupRow.js';

function Actions({ attributes = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteAttributes = async () => {
    setIsLoading(true);
    try {
      const promises = attributes
        .filter((attribute) => selectedIds.includes(attribute.uuid))
        .map((attribute) =>
          axios.delete(attribute.deleteApi, {
            validateStatus: () => true
          })
        );
      const responses = await Promise.allSettled(promises);
      setIsLoading(false);
      responses.forEach((response) => {
        // Get the axios response status code
        const { status } = response.value;
        if (status !== 200) {
          throw new Error(response.value.data.error.message);
        }
      });
      // Refresh the page
      window.location.reload();
    } catch (e) {
      setIsLoading(false);
      toast.error(e.message);
    }
  };

  const actions = [
    {
      name: _('Delete'),
      onAction: () => {
        openAlert({
          heading: _('Delete ${count} attributes', {
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
              await deleteAttributes();
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
  attributes: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      deleteApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function AttributeGrid({
  attributes: { items: attributes, total, currentFilters = [] }
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
        <Form submitBtn={false} id="attributeGridFilter">
          <InputField
            name="name"
            placeholder={_('Search')}
            defaultValue={currentFilters.find((f) => f.key === 'name')?.value}
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
        </Form>
        <CardAction>
          <Button
            variant="link"
            onClick={() => {
              // Just get the url and remove all query params
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
                <div className="form-field mb-0">
                  <Checkbox
                    onCheckedChange={(checked) => {
                      if (checked)
                        setSelectedRows(attributes.map((a) => a.uuid));
                      else setSelectedRows([]);
                    }}
                  />
                </div>
              </TableHead>
              <Area
                className=""
                id="attributeGridHeader"
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          name="name"
                          title={_('Attribute Name')}
                          currentFilters={currentFilters}
                        />
                      )
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => <DummyColumnHeader title={_('Groups')} />
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: () => (
                        <SortableHeader
                          name="type"
                          title={_('Type')}
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
                          name="is_required"
                          title={_('Is Required?')}
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
                          name="is_filterable"
                          title={_('Is Filterable?')}
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
              attributes={attributes}
              selectedIds={selectedRows}
              setSelectedRows={setSelectedRows}
            />
            {attributes.map((a) => (
              <TableRow key={a.attributeId}>
                <TableCell>
                  <div className="form-field mb-0">
                    <Checkbox
                      checked={selectedRows.includes(a.uuid)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRows(selectedRows.concat([a.uuid]));
                        } else {
                          setSelectedRows(
                            selectedRows.filter((r) => r !== a.uuid)
                          );
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <Area
                  className=""
                  id="attributeGridRow"
                  row={a}
                  noOuter
                  coreComponents={[
                    {
                      component: {
                        default: () => (
                          <AttributeNameRow
                            id="name"
                            name={a.attributeName}
                            url={a.editUrl}
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: () => <GroupRow groups={a.groups?.items} />
                      },
                      sortOrder: 15
                    },
                    {
                      component: {
                        default: ({ areaProps }) => (
                          <TableCell>
                            <Badge variant="outline">
                              {areaProps.row.type}
                            </Badge>
                          </TableCell>
                        )
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>
                            {a.isRequired ? _('Yes') : _('No')}
                          </TableCell>
                        )
                      },
                      sortOrder: 25
                    },
                    {
                      component: {
                        default: () => (
                          <TableCell>
                            {a.isFilterable ? _('Yes') : _('No')}
                          </TableCell>
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
        {attributes.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no attribute to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

AttributeGrid.propTypes = {
  attributes: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        uuid: PropTypes.string.isRequired,
        attributeId: PropTypes.string.isRequired,
        attributeName: PropTypes.string.isRequired,
        attributeCode: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        isRequired: PropTypes.number.isRequired,
        isFilterable: PropTypes.number.isRequired,
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
    attributes (filters: $filters) {
      items {
        attributeId
        uuid
        attributeName
        attributeCode
        type
        isRequired
        isFilterable
        editUrl
        updateApi
        deleteApi
        groups {
          items {
            attributeGroupId
            groupName
            updateApi
          }
        }
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
