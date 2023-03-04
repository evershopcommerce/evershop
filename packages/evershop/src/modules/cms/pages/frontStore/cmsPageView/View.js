/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import '@components/common/CKEditor.scss';

export default function Page({ page }) {
  return (
    <div className="page-width">
      <h1 className="text-center mb-3">{page.name}</h1>
      <div className="ck-content">
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
    </div>
  );
}

Page.propTypes = {
  page: PropTypes.shape({
    content: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("pageId")) {
      name
      content
    }
  }
`;
