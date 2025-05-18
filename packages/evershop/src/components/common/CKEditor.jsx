import PropTypes from 'prop-types';
import React from 'react';

import './CKEditor.scss';

export function CKEditor({ content }) {
  return (
    <div className="ck-content">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

CKEditor.propTypes = {
  content: PropTypes.string
};

CKEditor.defaultProps = {
  content: ''
};
