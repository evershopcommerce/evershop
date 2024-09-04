import PropTypes from 'prop-types';
import React from 'react';
import PageHeading from '@components/admin/cms/PageHeading';

export default function CollectionEditPageHeading({ backUrl, collection }) {
  return (
    <div className='w-2/3' style={{margin: '0 auto'}}>
      <PageHeading
        backUrl={backUrl}
        heading={collection ? `Editing ${collection.name}` : 'Create a new collection'}
      />
    </div>
  );
}

CollectionEditPageHeading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  collection: PropTypes.shape({
    name: PropTypes.string
  })
};

CollectionEditPageHeading.defaultProps = {
  collection: {}
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      name
    }
    backUrl: url(routeId: "collectionGrid")
  }
`;
