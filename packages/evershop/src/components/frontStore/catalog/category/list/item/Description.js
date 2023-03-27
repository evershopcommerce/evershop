import PropTypes from 'prop-types';
import React from 'react';

function Description({ description }) {
  return (

    <div className="mb-1">
      <div dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}

Description.propTypes = {
  description: PropTypes.string
};

Description.defaultProps = {
  description: '<p>No description</p>'
};

export { Description };
