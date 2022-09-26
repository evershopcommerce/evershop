/* eslint-disable jsx-a11y/anchor-is-valid */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../lib/components/Area';
import Pagination from '../../../../../lib/components/grid/Pagination';
import { useAlertContext } from '../../../../../lib/components/modal/Alert';
import { Checkbox } from '../../../../../lib/components/form/fields/Checkbox';
import formData from '../../../../../lib/util/formData';
import { Card } from '../../../../cms/components/admin/Card';
import AttributeNameRow from './rows/AttributeName';
import GroupRow from './rows/GroupRow';
import BasicRow from '../../../../../lib/components/grid/rows/BasicRow';
import YesNoRow from '../../../../../lib/components/grid/rows/YesNoRow';
import BasicColumnHeader from '../../../../../lib/components/grid/headers/Basic';
import GroupHeader from './headers/GroupHeader';
import DropdownColumnHeader from '../../../../../lib/components/grid/headers/Dropdown';

function Actions({ selectedIds = [], deleteAttributesUrl }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
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
              setIsLoading(true);
              dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
              const response = await axios.post(deleteAttributesUrl, formData().append('ids', selectedIds).build());
              // setIsLoading(false);
              if (response.data.success === true) {
                location.reload();
                // TODO: Should display a message and delay for 1 - 2 second
              }
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
  selectedIds: PropTypes.arrayOf(PropTypes.number).isRequired
};

export default function AttributeGrid({ attributes: { items: attributes, total, currentFilters = [] }, deleteAttributesUrl, saveAttributeGroupUrl }) {
  const page = currentFilters.find((filter) => filter.key === 'page') ? currentFilters.find((filter) => filter.key === 'page')['value'] : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit') ? currentFilters.find((filter) => filter.key === 'limit')['value'] : 20;
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox onChange={(e) => {
                if (e.target.checked) setSelectedRows(attributes.map((a) => a.attributeId));
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
                  component: { default: () => <BasicColumnHeader id='name' title='Attribute Name' currentFilters={currentFilters} /> },
                  sortOrder: 10
                },
                {
                  component: { default: () => <GroupHeader id='group' currentFilters={currentFilters} /> },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => <DropdownColumnHeader
                      id='type'
                      title='Type'
                      currentFilters={currentFilters}
                      options={[{ value: 'text', text: 'Text' }, { value: 'select', text: 'Select' }, { value: 'multiselect', text: 'Multi Select' }, { value: 'textarea', text: 'Text Area' }]}
                    />
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => <DropdownColumnHeader
                      id='isRequired'
                      title='Is Required?'
                      currentFilters={currentFilters}
                      options={[{ value: 1, text: 'Yes' }, { value: 0, text: 'No' }]}
                    />
                  },
                  sortOrder: 25
                },
                {
                  component: {
                    default: () => <DropdownColumnHeader
                      id='isFilterable'
                      title='Is Filterable?'
                      currentFilters={currentFilters}
                      options={[{ value: 1, text: 'Yes' }, { value: 0, text: 'No' }]}
                    />
                  },
                  sortOrder: 30
                }
              ]}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            ids={attributes.map((a) => a.attributeId)}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
            deleteAttributesUrl={deleteAttributesUrl}
          />
          {attributes.map((a) => (
            <tr key={a.attributeId}>
              <td>
                <Checkbox
                  isChecked={selectedRows.includes(a.attributeId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([a.attributeId]));
                    } else {
                      setSelectedRows(selectedRows.filter((r) => r !== a.attributeId));
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
                    component: { default: () => <AttributeNameRow id='name' name={a.attributeName} url={a.editUrl} /> },
                    sortOrder: 10
                  },
                  {
                    component: { default: () => <GroupRow saveAttributeGroupUrl={saveAttributeGroupUrl} groups={a.groups} /> },
                    sortOrder: 15
                  },
                  {
                    component: { default: ({ areaProps }) => <BasicRow id='type' areaProps={areaProps} /> },
                    sortOrder: 20
                  },
                  {
                    component: { default: ({ areaProps }) => <YesNoRow id='isRequired' areaProps={areaProps} /> },
                    sortOrder: 25
                  },
                  {
                    component: { default: ({ areaProps }) => <YesNoRow id='isFilterable' areaProps={areaProps} /> },
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
}

export const query = `
  query Query {
    attributes (filters: getContextValue("filtersFromUrl")) {
      items {
        attributeId
        attributeName
        attributeCode
        type
        isRequired
        isFilterable
        editUrl
        groups {
          attributeGroupId
          groupName
        }
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
    deleteAttributesUrl: url(routeId: "attributeBulkDelete")
    saveAttributeGroupUrl: url(routeId: "attributeGroupSavePost")
  }
`;