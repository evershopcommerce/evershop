import PropTypes from 'prop-types';
import React from 'react';
import { Input } from '@components/common/form/fields/Input';

export default function BasicColumnHeader({ title, id, currentFilters = [] }) {
  const filterInput = React.useRef(null);

  const onKeyPress = (e) => {
    const url = new URL(document.location);
    if (e.key === 'Enter') {
      if (e.target.value === '') url.searchParams.delete(id);
      else url.searchParams.set(id, e.target.value);
      window.location.href = url.href;
    }
  };

  React.useEffect(() => {
    const filter = currentFilters.find((fillter) => fillter.key === id) || {
      value: ''
    };
    filterInput.current.value = filter.value;
  }, []);

  return (
    <th className="column">
      <div className="table-header id-header">
        <div className="title" style={{ marginBottom: '1rem' }}>
          <span>{title}</span>
        </div>
        <div className="filter" style={{ width: '15rem' }}>
          <Input
            ref={filterInput}
            onKeyPress={(e) => onKeyPress(e)}
            placeholder={title}
          />
        </div>
      </div>
    </th>
  );
}

BasicColumnHeader.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  currentFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string
    })
  )
};

BasicColumnHeader.defaultProps = {
  currentFilters: []
};
