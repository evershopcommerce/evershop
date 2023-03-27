import React from 'react'
import PropTypes from 'prop-types';
import { Name } from '@components/frontStore/catalog/category/list/item/Name';
import { Thumbnail } from '@components/frontStore/catalog/category/list/item/Thumbnail';
import { Description } from '@components/frontStore/catalog/category/list/item/Description';
import Button from '@components/frontStore/cms/Button';
import Area from '@components/common/Area';
import { get } from '@evershop/evershop/src/lib/util/get';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function CategoryList({ categories = [], countPerRow = 3 }) {
  if (categories.length === 0) {
    return (
      <div className="product-list">
        <div className="text-center">{_('There is no categories to display')}</div>
      </div>
    );
  }

  let className;
  switch (countPerRow) {
    case 3:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-2';
      break;
    case 4:
      className = 'grid grid-cols-2 md:grid-cols-4 gap-2';
      break;
    case 5:
      className = 'grid grid-cols-2 md:grid-cols-5 gap-2';
      break;
    default:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-2';
  }

  return (
    <div className={className}>
      {categories.map((c) => (
        <Area
          id="categorytListingItem"
          className="listing-tem"
          category={c}
          key={c.categoryId}
          coreComponents={[
            {
              component: { default: Thumbnail },
              props: { url: c.url, imageUrl: get(c, 'image.url'), alt: c.name },
              sortOrder: 10,
              id: 'thumbnail'
            },
            {
              component: { default: Name },
              props: { name: c.name },
              sortOrder: 20,
              id: 'name'
            },
            {
              component: { default: Description },
              props: { description: c.description },
              sortOrder: 20,
              id: 'description'
            },
            {
              component: { default: Button },
              props: { url: c.urlKey, variant: 'primary', title: c.name },
              sortOrder: 30,
              id: 'price'
            }
          ]}
        />
      ))}
    </div>
  );
}

CategoryList.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      categoryId: PropTypes.number,
      image: PropTypes.shape({
        alt: PropTypes.string,
        listing: PropTypes.string
      })
    })
  ).isRequired,
  countPerRow: PropTypes.number.isRequired
};
