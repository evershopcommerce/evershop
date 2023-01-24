import PropTypes from 'prop-types';
import React from 'react';
import Meta from '../../../../../lib/components/Meta';
import Title from '../../../../../lib/components/Title';

export default function SeoMeta({ pageInfo: { title, description } }) {
  return (
    <>
      <Title title={title} />
      <Meta name="description" content={description} />
      <Meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </>
  );
}

SeoMeta.propTypes = {
  description: PropTypes.any,
  title: PropTypes.any
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
