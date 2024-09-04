import PropTypes from 'prop-types';
import React from 'react';
import PageHeading from '@components/admin/cms/PageHeading';

export default function CategoryEditPageHeading({ backUrl, category }) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={category ? `Editing ${category.name}` : 'Create a new category'}
    />
  );
}

CategoryEditPageHeading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  category: PropTypes.shape({
    name: PropTypes.string
  })
};

CategoryEditPageHeading.defaultProps = {
  category: {}
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      name
    }
    backUrl: url(routeId: "categoryGrid")
  }
`;
