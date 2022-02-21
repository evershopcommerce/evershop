import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '../../../context/app';
import { get } from '../../../util/get';
import { Select } from '../../form/fields/Select';

export default function DropdownColumnHeader({ title, id, options = [] }) {
  const [current, setCurrent] = React.useState('');
  const context = useAppState();

  const onChange = (e) => {
    const url = new URL(document.location);
    if (e.target.value === 'all') url.searchParams.delete(id);
    else url.searchParams.set(id, e.target.value);
    window.location.href = url.href;
  };

  React.useEffect(() => {
    setCurrent(get(context, `grid.currentFilter.${id}`, 'all'));
  }, []);

  return (
    <th className="column">
      <div className="table-header status-header">
        <div className="title" style={{ marginBottom: '1rem' }}><span>{title}</span></div>
        <div className="filter">
          <Select
            onChange={(e) => onChange(e)}
            className="form-control"
            value={current}
            options={[{ value: 'all', text: 'All' }].concat(options)}
          />
        </div>
      </div>
    </th>
  );
}

DropdownColumnHeader.propTypes = {
  id: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string || PropTypes.number,
    text: PropTypes.string
  })).isRequired,
  title: PropTypes.string.isRequired
};
