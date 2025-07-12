import PropTypes from 'prop-types';
import React from 'react';


export default function CreateAt({ time }) {
  return (
    <td>
      <div>
        <span>{time}</span>
      </div>
    </td>
  );
}

CreateAt.propTypes = {
  time: PropTypes.string.isRequired
};
