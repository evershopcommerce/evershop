import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '../../../context/app';
import { get } from '../../../util/get';
import { Input } from '../../form/fields/Input';

export default function FromToColumnHeader({ title, id }) {
  const filterFrom = React.useRef(null);
  const filterTo = React.useRef(null);
  const context = useAppState();

  const onKeyPress = (e) => {
    const url = new URL(document.location);
    if (e.key === 'Enter') {
      if (filterTo.current.value === '' && filterFrom.current.value === '') url.searchParams.delete(id);
      else url.searchParams.set(id, `${filterFrom.current.value}-${filterTo.current.value}`);
      window.location.href = url.href;
    }
  };

  React.useEffect(() => {
    filterFrom.current.value = get(context, `grid.currentFilter.${id}.from`, '');
    filterTo.current.value = get(context, `grid.currentFilter.${id}.to`, '');
  }, []);

  return (
    <th>
      <div className="table-header price-header">
        <div className="title" style={{ marginBottom: '1rem' }}><span>{title}</span></div>
        <div className="flex space-x-1">
          <div style={{ width: '6rem' }}>
            <Input
              type="text"
              ref={filterFrom}
              onKeyPress={(e) => onKeyPress(e)}
              placeholder="From"
              className="form-control"
            />
          </div>
          <div style={{ width: '6rem' }}>
            <Input
              type="text"
              ref={filterTo}
              onKeyPress={(e) => onKeyPress(e)}
              placeholder="To"
              className="form-control"
            />
          </div>
        </div>
      </div>
    </th>
  );
}

FromToColumnHeader.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired
};
