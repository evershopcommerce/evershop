import React from 'react';

function CommentRow({ comment }) {
  return (
    <td width={'45%'}>
      <div>{comment}</div>
    </td>
  );
}

export default CommentRow;
