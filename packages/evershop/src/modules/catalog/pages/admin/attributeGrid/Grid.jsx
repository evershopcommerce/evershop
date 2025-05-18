import AttributeNameRow from '@components/admin/catalog/attributeGrid/rows/AttributeName';
import GroupRow from '@components/admin/catalog/attributeGrid/rows/GroupRow';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Form } from '@components/common/form/Form';
import DummyColumnHeader from '@components/common/grid/headers/Dummy';
import SortableHeader from '@components/common/grid/headers/Sortable';
import Pagination from '@components/common/grid/Pagination';
import BasicRow from '@components/common/grid/rows/BasicRow';
import YesNoRow from '@components/common/grid/rows/YesNoRow';
import { useAlertContext } from '@components/common/modal/Alert';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

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
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} attributes`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteAttributes();
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
      <Card.Session
        title={
          <Form submitBtn={false} id="attributeGridFilter">
            <Field
              type="text"
              id="name"
              name="name"
              placeholder="Search"
              value={currentFilters.find((f) => f.key === 'name')?.value}
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
                  if (e.target.checked)
                    setSelectedRows(attributes.map((a) => a.uuid));
                  else setSelectedRows([]);
                }}
              />
            </th>
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
                        title="Attribute Name"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => <DummyColumnHeader title="Groups" />
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <SortableHeader
                        name="type"
                        title="Type"
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
                        title="Is Required?"
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
                        title="Is Filterable?"
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
            attributes={attributes}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {attributes.map((a) => (
            <tr key={a.attributeId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(a.uuid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([a.uuid]));
                    } else {
                      setSelectedRows(selectedRows.filter((r) => r !== a.uuid));
                    }
                  }}
                />
              </td>
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
                        <BasicRow id="type" areaProps={areaProps} />
                      )
                    },
                    sortOrder: 20
                  },
                  {
                    component: {
                      default: () => <YesNoRow value={a.isRequired} />
                    },
                    sortOrder: 25
                  },
                  {
                    component: {
                      default: () => <YesNoRow value={a.isFilterable} />
                    },
                    sortOrder: 30
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {attributes.length === 0 && (
        <div className="flex w-full justify-center">
          There is no attribute to display
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
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
