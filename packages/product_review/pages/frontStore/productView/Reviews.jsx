import React from 'react';
import './Reviews.scss';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import Rating from '../../../../product_review/components/Rating';

export default function Reviews({ product: { reviews = [] } }) {
  return (
    <div id="product__reviews" className="mt-2">
      <h3>{_('Customer Reviews')}</h3>
      <ul className="review__list">
        {reviews.length === 0 && (
          <li className="flex flex-col gap-1">
            {_('Be the first to review this product')}
          </li>
        )}
        {reviews.map((review) => (
          <li key={review.uuid} className="flex flex-col gap-1">
            <div className="rating">
              <Rating rating={review.rating} />
            </div>
            <p className="comment">{review.comment}</p>
            <div>
              <span>
                {_('Review by ${customer_name}', {
                  customer_name: review.customerName
                })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 45
};

export const query = `
  query {
    product(id: getContextValue("productId")) {
      reviews {
        reviewId
        uuid
        rating
        customerName
        comment
        createdAt
      }
    }
  }
`;
