/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import Editor from '@components/common/Editor';

export default function Page({ page }) {
  return (
    <div className="page-width">
      <div className="prose prose-base max-w-none">
        <h1 className="text-center">{page.name}</h1>
        <Editor rows={page.content} />
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
