import React from 'react';
import './Comments.scss';
export default function Comments({
  comments = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    id: "productComments"
  }, /*#__PURE__*/React.createElement("h3", null, "Comments"), /*#__PURE__*/React.createElement("ul", {
    className: "comment-list"
  }, comments.map(comment => /*#__PURE__*/React.createElement("li", {
    key: comment.commentId
  }, /*#__PURE__*/React.createElement("div", {
    className: "user-name"
  }, comment.userName), /*#__PURE__*/React.createElement("p", {
    className: "comment"
  }, comment.comment)))));
}
export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 45
};
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