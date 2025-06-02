import { Input } from '@components/common/form/fields/Input';
import PropTypes from 'prop-types';
import React from 'react';

export default function FromToColumnHeader({ title, id, currentFilters = [] }) {
  const filterFrom = React.useRef(null);
  const filterTo = React.useRef(null);

  const onKeyPress = (e) => {
    const url = new URL(document.location);
    if (e.key === 'Enter') {
      if (filterTo.current.value === '' && filterFrom.current.value === '')
        url.searchParams.delete(id);
      else
        url.searchParams.set(
          id,
          `${filterFrom.current.value}-${filterTo.current.value}`
        );
      window.location.href = url.href;
    }
  };

  React.useEffect(() => {
    const filter = currentFilters.find((f) => f.key === id) || { value: '-' };
    filterFrom.current.value = filter.value.split('-')[0] || '';
    filterTo.current.value = filter.value.split('-')[1] || '';
  }, []);

  return (
    <th>
      <div className="table-header price-header">
        <div className="title" style={{ marginBottom: '1rem' }}>
          <span>{title}</span>
        </div>
        <div className="flex space-x-4">
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
  title: PropTypes.string.isRequired,
  currentFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string
    })
  )
};

FromToColumnHeader.defaultProps = {
  currentFilters: []
};
