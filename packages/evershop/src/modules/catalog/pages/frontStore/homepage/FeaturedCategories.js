import React from 'react';
import CategoryList from '@components/frontStore/catalog/category/list/List';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import PropTypes from 'prop-types';



export default function FeaturedCategories({ featuredCategories }) {
  return (
    <div className="mt-15">
      <CategoryList categories={featuredCategories} countPerRow={3} />
    </div>
  );
}

FeaturedCategories.propTypes = {
  featuredCategories: PropTypes.arrayOf(

    PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      urlKey: PropTypes.string,
      categoryId: PropTypes.number,
      image: PropTypes.shape({
        alt: PropTypes.string,
        listing: PropTypes.string
      })
    })
  )
};

FeaturedCategories.defaultProps = {
  featuredCategories: []
};
export const query = `
        query query {
          featuredCategories(limit: 3) {
          name
          description
          urlKey
          image {
          url
        }
    }
   } `;
export const layout = {
  areaId: 'content',
  sortOrder: 10
};
