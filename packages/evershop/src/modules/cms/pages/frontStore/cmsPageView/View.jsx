/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import { CKEditor } from '@components/common/CKEditor';

export default function Page({ page }) {
  return (
    <div className="page-width">
      <h1 className="text-center mb-12">{page.name}</h1>
      <CKEditor content={page.content} />
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
