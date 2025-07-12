import PageHeading from '@components/admin/cms/PageHeading';
import PropTypes from 'prop-types';
import React from 'react';

export default function PageEditPageHeading({ backUrl, page }) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={page ? `Editing ${page.name}` : 'Create a new page'}
    />
  );
}

PageEditPageHeading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  page: PropTypes.shape({
    name: PropTypes.string.isRequired
  })
};

PageEditPageHeading.defaultProps = {
  page: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("cmsPageId", null)) {
      name
    }
    backUrl: url(routeId: "cmsPageGrid")
  }
`;
