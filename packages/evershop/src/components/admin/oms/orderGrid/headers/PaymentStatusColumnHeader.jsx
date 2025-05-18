import { Select } from '@components/common/form/fields/Select';
import PropTypes from 'prop-types';
import React from 'react';

export default function PaymentStatusColumnHeader({
  title,
  id,
  paymentStatusList = [],
  currentFilters = []
}) {
  const [current, setCurrent] = React.useState('');

  const onChange = (e) => {
    const url = new URL(document.location);
    if (e.target.value === 'all') {
      url.searchParams.delete(id);
    } else {
      url.searchParams.set(id, e.target.value);
    }
    window.location.href = url.href;
  };

  React.useEffect(() => {
    const filter = currentFilters.find((fillter) => fillter.key === id) || {
      value: ''
    };
    setCurrent(filter.value);
  }, []);

  return (
    <th className="column">
      <div className="table-header payment-status-header">
        <div className="title" style={{ marginBottom: '1rem' }}>
          <span>{title}</span>
        </div>
        <div className="filter">
          <Select
            onChange={(e) => onChange(e)}
            value={current}
            options={[{ value: 'all', text: 'All' }].concat(paymentStatusList)}
          />
        </div>
      </div>
    </th>
  );
}

PaymentStatusColumnHeader.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  paymentStatusList: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired
    })
  ).isRequired,
  currentFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired
};
