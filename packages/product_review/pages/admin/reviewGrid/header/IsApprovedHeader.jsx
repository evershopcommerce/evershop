import PropTypes from 'prop-types';
import React from 'react';
import { Select } from '@components/common/form/fields/Select';

export default function IsApprovedHeader({ title, id, currentFilter = {} }) {
  const [current, setCurrent] = React.useState('');

  const onChange = (e) => {
    const url = new URL(document.location);
    if (e.target.value === 'all') url.searchParams.delete(id);
    else url.searchParams.set(id, e.target.value);
    window.location.href = url.href;
  };

  React.useEffect(() => {
    setCurrent(currentFilter.value || 'all');
  }, []);

  return (
    <th className="column">
      <div className="table-header status-header">
        <div className="title" style={{ marginBottom: '1rem' }}>
          <span>{title}</span>
        </div>
        <div className="filter">
          <Select
            onChange={(e) => onChange(e)}
            className="form-control"
            value={current}
            options={[
              { value: 'all', text: 'All' },
              { value: 0, text: 'Pending' },
              { value: 1, text: 'Approved' }
            ]}
          />
        </div>
      </div>
    </th>
  );
}

IsApprovedHeader.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  currentFilter: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })
};

IsApprovedHeader.defaultProps = {
  currentFilter: {}
};
