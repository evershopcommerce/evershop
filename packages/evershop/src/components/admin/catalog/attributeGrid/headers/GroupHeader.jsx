import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { Select } from '@components/common/form/fields/Select';

const GroupsQuery = `
  query {
    groups: attributeGroups {
      items {
        value: attributeGroupId
        text: groupName
      }
    }
  }
`;

export default function GroupHeader({ id, currentFilters = [] }) {
  const [current, setCurrent] = React.useState('');

  const [result] = useQuery({
    query: GroupsQuery
  });

  const { data, fetching, error } = result;

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
    const filter = currentFilters.find((f) => f.key === 'group') || {
      value: ''
    };
    setCurrent(filter.value);
  }, []);

  return (
    <th className="column">
      <div className="table-header status-header">
        <div className="title" style={{ marginBottom: '1rem' }}>
          <span>Attribute Group</span>
        </div>
        <div className="filter">
          {fetching && <div>Loading</div>}
          {error && <div>{error.message}</div>}
          {!fetching && !error && (
            <Select
              onChange={(e) => onChange(e)}
              className="form-control"
              value={current}
              options={[{ value: 'all', text: 'All' }].concat(
                data.groups.items
              )}
            />
          )}
        </div>
      </div>
    </th>
  );
}

GroupHeader.propTypes = {
  id: PropTypes.string.isRequired,
  currentFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  )
};

GroupHeader.defaultProps = {
  currentFilters: []
};
