/* eslint-disable jsx-a11y/anchor-is-valid */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../lib/components/Area';
import Pagination from '../../../../../lib/components/grid/Pagination';
import { useAlertContext } from '../../../../../lib/components/modal/Alert';
import { Checkbox } from '../../../../../lib/components/form/fields/Checkbox';
import { Card } from '../../../../cms/components/admin/Card';
import AttributeNameRow from './rows/AttributeName';
import GroupRow from './rows/GroupRow';
import BasicRow from '../../../../../lib/components/grid/rows/BasicRow';
import YesNoRow from '../../../../../lib/components/grid/rows/YesNoRow';
import BasicColumnHeader from '../../../../../lib/components/grid/headers/Basic';
import GroupHeader from './headers/GroupHeader';
import DropdownColumnHeader from '../../../../../lib/components/grid/headers/Dropdown';

function Actions({ attributes = [], selectedIds = [] }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteAttributes = async () => {
    setIsLoading(true);
    const promises = attributes.filter((attribute) => selectedIds.includes(attribute.uuid)).map((attribute) => axios.delete(attribute.deleteApi));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
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
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default function AttributeGrid({ attributes: { items: attributes, total, currentFilters = [] } }) {
  const page = currentFilters.find((filter) => filter.key === 'page') ? currentFilters.find((filter) => filter.key === 'page').value : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit') ? currentFilters.find((filter) => filter.key === 'limit').value : 20;
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox onChange={(e) => {
                if (e.target.checked) setSelectedRows(attributes.map((a) => a.uuid));
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
                  component: { default: () => <BasicColumnHeader id="name" title="Attribute Name" currentFilters={currentFilters} /> },
                  sortOrder: 10
                },
                {
                  component: { default: () => <GroupHeader id="group" currentFilters={currentFilters} /> },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <DropdownColumnHeader
                        id="type"
                        title="Type"
                        currentFilters={currentFilters}
                        options={[{ value: 'text', text: 'Text' }, { value: 'select', text: 'Select' }, { value: 'multiselect', text: 'Multi Select' }, { value: 'textarea', text: 'Text Area' }]}
                      />
                    )
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <DropdownColumnHeader
                        id="isRequired"
                        title="Is Required?"
                        currentFilters={currentFilters}
                        options={[{ value: 1, text: 'Yes' }, { value: 0, text: 'No' }]}
                      />
                    )
                  },
                  sortOrder: 25
                },
                {
                  component: {
                    default: () => (
                      <DropdownColumnHeader
                        id="isFilterable"
                        title="Is Filterable?"
                        currentFilters={currentFilters}
                        options={[{ value: 1, text: 'Yes' }, { value: 0, text: 'No' }]}
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
                    component: { default: () => <AttributeNameRow id="name" name={a.attributeName} url={a.editUrl} /> },
                    sortOrder: 10
                  },
                  {
                    component: { default: () => <GroupRow groups={a.groups} /> },
                    sortOrder: 15
                  },
                  {
                    component: { default: ({ areaProps }) => <BasicRow id="type" areaProps={areaProps} /> },
                    sortOrder: 20
                  },
                  {
                    component: { default: ({ areaProps }) => <YesNoRow id="isRequired" areaProps={areaProps} /> },
                    sortOrder: 25
                  },
                  {
                    component: { default: ({ areaProps }) => <YesNoRow id="isFilterable" areaProps={areaProps} /> },
                    sortOrder: 30
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {attributes.length === 0
        && <div className="flex w-full justify-center">There is no attribute to display</div>}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    attributes (filters: getContextValue("filtersFromUrl")) {
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
          attributeGroupId
          groupName
          updateApi
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
