/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Select } from '../../../../../../lib/components/form/fields/Select';

export default function Sorting() {
  // TODO: make this list configurable
  const sortingOptions = get(useAppState(), 'sortingOptions', [{ code: 'price', name: 'Price' }, { code: 'name', name: 'Name' }]);
  const sortOrder = get(useAppState(), 'sortOrder', 'asc');
  const sortBy = get(useAppState(), 'sortBy', '');
  const currentUrl = get(useAppState(), 'currentUrl');

  const onChangeSort = (e) => {
    e.preventDefault();
    const url = new URL(currentUrl, window.location.origin);
    url.searchParams.set('sortBy', e.target.value);
    window.location.href = url;
  };

  const onChangeDirection = (e) => {
    e.preventDefault();
    const url = new URL(currentUrl, window.location.origin);
    if (sortOrder === 'asc') {
      url.searchParams.set('sortOrder', 'desc');
      window.location.href = url;
    } else {
      url.searchParams.set('sortOrder', 'asc');
      window.location.href = url;
    }
  };

  if (sortingOptions.length === 0) { return (null); }

  return (
    <div className="product-sorting">
      <div className="product-sorting-inner flex justify-end space-x-05">
        <Select
          className="form-control"
          onChange={(e) => onChangeSort(e)}
          value={sortBy}
          options={[{
            value: '',
            text: 'Please select'
          }]
            .concat(sortingOptions.map((o) => ({ value: o.code, text: o.name })))}
        />
        <div className="sort-direction self-center">
          <a onClick={(e) => onChangeDirection(e)} href="#">
            {sortOrder === 'desc' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-arrow-up"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-arrow-down"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            )}
          </a>
        </div>
      </div>
    </div>
  );
}
