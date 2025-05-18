import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewAttributeButton({ newAttributeUrl }) {
  return <Button url={newAttributeUrl} title="New Attribute" />;
}

NewAttributeButton.propTypes = {
  newAttributeUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newAttributeUrl: url(routeId: "attributeNew")
  }
`;
