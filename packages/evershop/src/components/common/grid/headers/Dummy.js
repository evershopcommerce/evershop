import PropTypes from 'prop-types';
import React from 'react';

export default function DummyColumnHeader({ title }) {
  return (
    <th className="column">
      <div className="table-header id-header">
        <div className="title">
          <span>{title}</span>
        </div>
      </div>
    </th>
  );
}

DummyColumnHeader.propTypes = {
  title: PropTypes.string.isRequired
};
