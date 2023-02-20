import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';

export default function NewPageButton({ newPageUrl }) {
  return <Button url={newPageUrl} title="New Page" />;
}

NewPageButton.propTypes = {
  newPageUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newPageUrl: url(routeId: "cmsPageNew")
  }
`;
