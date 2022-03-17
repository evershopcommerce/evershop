import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import Pagination from '../../../../../../lib/components/grid/Pagination';
import { get } from '../../../../../../lib/util/get';
import { useAlertContext } from '../../../../../../lib/components/modal/Alert';
import formData from '../../../../../../lib/util/formData';
import { Checkbox } from '../../../../../../lib/components/form/fields/Checkbox';
import { Card } from '../../Card';
import { getComponents } from '../../../../../../lib/components/getComponents';

function Actions({ selectedIds = [] }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const context = useAppState();
  const actions = [
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
              setIsLoading(true);
              dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
              const deleteUrl = context.deleteCmsPagesUrl;
              const response = await axios.post(deleteUrl, formData().append('ids', selectedIds).build());
              // setIsLoading(false);
              if (response.data.success === true) {
                window.location.href = context.currentUrl;
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

export default function CMSPageGrid() {
  const pages = get(useAppState(), 'grid.pages', []);
  const total = get(useAppState(), 'grid.total', 0);
  const limit = get(useAppState(), 'grid.limit', 20);
  const page = get(useAppState(), 'grid.page', 1);
  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox onChange={(e) => {
                if (e.target.checked) setSelectedRows(pages.map((p) => p.cms_page_id));
                else setSelectedRows([]);
              }}
              />
            </th>
            <Area
              className=""
              id="pageGridHeader"
              noOuter
              components={getComponents()}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            ids={pages.map((p) => p.cms_page_id)}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {pages.map((p, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(p.cms_page_id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRows(selectedRows.concat([p.cms_page_id]));
                    else setSelectedRows(selectedRows.filter((row) => row !== p.cms_page_id));
                  }}
                />
              </td>
              <Area
                className=""
                id="pageGridRow"
                row={p}
                noOuter
                components={getComponents()}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length === 0
        && <div className="flex w-full justify-center">There is no page to display</div>}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}
