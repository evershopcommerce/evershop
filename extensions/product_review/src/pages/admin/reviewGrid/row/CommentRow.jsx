import PropTypes from 'prop-types';
import React from 'react';

function CommentRow({ comment }) {
  return (
    <td width="45%">
      <div>{comment}</div>
    </td>
  );
}

CommentRow.propTypes = {
  comment: PropTypes.string.isRequired
};

export default CommentRow;
