import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewCollectionButton({ newCollectionUrl }) {
  return <Button url={newCollectionUrl} title="New Collection" />;
}

NewCollectionButton.propTypes = {
  newCollectionUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCollectionUrl: url(routeId: "collectionNew")
  }
`;
