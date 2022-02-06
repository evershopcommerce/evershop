import React from 'react';
import { Select } from '../../../../../../lib/components/form/fields/Select';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';

export default function DropdownColumnHeader({ title, id }) {
  const [current, setCurrent] = React.useState('');
  const context = useAppState();
  const options = get(context, 'attributeGroups', []);

  const onChange = (e) => {
    const url = new URL(document.location);
    if (e.target.value === 'all') { url.searchParams.delete(id); } else { url.searchParams.set(id, e.target.value); }
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
            options={[{ value: 'all', text: 'All' }].concat(options.map((g) => ({ value: g.attribute_group_id, text: g.group_name })))}
          />
        </div>
      </div>
    </th>
  );
}
