import React from 'react';

export default function NameRow({ id, editUrl, areaProps }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={areaProps.row[editUrl]}>
          #
          {areaProps.row[id]}
        </a>
      </div>
    </td>
  );
}
