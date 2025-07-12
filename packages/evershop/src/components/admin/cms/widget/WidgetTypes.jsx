import PropTypes from 'prop-types';
import React from 'react';


export default function WidgetTypes({ types }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {types.map((type) => (
        <a
          key={type.code}
          href={type.createWidgetUrl}
          className="border border-gray-200 rounded p-4 text-center"
        >
          <div className="text-lg font-bold">{type.name}</div>
        </a>
      ))}
    </div>
  );
}

WidgetTypes.propTypes = {
  types: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      createWidgetUrl: PropTypes.string.isRequired
    })
  ).isRequired
};
