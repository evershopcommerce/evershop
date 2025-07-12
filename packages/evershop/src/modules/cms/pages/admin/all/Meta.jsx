import Meta from '@components/common/Meta';
import Title from '@components/common/Title';
import PropTypes from 'prop-types';
import React from 'react';

export default function SeoMeta({ pageInfo: { title, description } }) {
  return (
    <>
      <Title title={title} />
      <Meta name="description" content={description} />
    </>
  );
}

SeoMeta.propTypes = {
  pageInfo: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'head',
  sortOrder: 5
};

export const query = `
  query query {
    pageInfo {
      title
      description
    }
  }
`;
