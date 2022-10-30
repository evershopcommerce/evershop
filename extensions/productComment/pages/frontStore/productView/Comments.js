import React from 'react';
import './Comments.scss';

export default function Comments({ comments = [] }) {
  return <div id="productComments">
    <h3>Comments</h3>
    <ul className="comment-list">
      {comments.map((comment) => (
        <li key={comment.commentId}>
          <div className='user-name'>{comment.userName}</div>
          <p className='comment'>{comment.comment}</p>
        </li>
      ))}
    </ul>
  </div>;
}

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 45
}

export const query = `
  query {
    comments(productId: getContextValue("productId")) {
      commentId
      userName
      comment
      createdAt
    }
  }
`;