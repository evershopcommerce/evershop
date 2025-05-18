/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import PropTypes from 'prop-types';
import React from 'react';
import { get } from '../../../../lib/util/get.js';

export default function ActionColumnRow({ areaProps: { row } }) {
  return (
    <td>
      <div>
        <a href={get(row, 'editUrl', '#')}>
          <i className="fas fa-edit" />
        </a>
      </div>
      <div>
        {get(row, 'deleteUrl') && (
          <span
            className="text-danger link"
            onClick={() => {
              if (window.confirm('Are you sure?'))
                window.location.href = get(row, 'deleteUrl');
            }}
          >
            <i className="fas fa-trash-alt" />
          </span>
        )}
      </div>
    </td>
  );
}

ActionColumnRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      editUrl: PropTypes.string,
      deleteUrl: PropTypes.string
    })
  }).isRequired
};
