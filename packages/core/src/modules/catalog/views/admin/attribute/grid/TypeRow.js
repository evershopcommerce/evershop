import React from 'react';

export default function TypeRow({ id, areaProps }) {
  return (
    <td>
      <div>
        <span style={{ textTransform: 'capitalize' }}>{areaProps.row[id]}</span>
      </div>
    </td>
  );
}
