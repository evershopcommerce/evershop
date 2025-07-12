import PropTypes from 'prop-types';
import React from 'react';


export default function ActionColumnHeader({ gridOriginalUrl = undefined }) {
  return (
    <th className="column action-column">
      <div className="table-header">
        <div className="title">
          <span />
        </div>
        {gridOriginalUrl && (
          <div className="filter">
            <a
              className="text-danger"
              title="Clear filter"
              href={gridOriginalUrl}
            >
              <i className="fa fa-filter" />
              <i className="fa fa-slash" style={{ marginLeft: '-13px' }} />
            </a>
          </div>
        )}
      </div>
    </th>
  );
}

ActionColumnHeader.propTypes = {
  gridOriginalUrl: PropTypes.string
};

ActionColumnHeader.defaultProps = {
  gridOriginalUrl: undefined
};
