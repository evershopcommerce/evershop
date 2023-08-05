import React from 'react';
import './Rating.scss';
import Rating from '../../../../components/Rating';

function RatingRow({ rating }) {
  return (
    <td>
      <Rating rating={rating} />
    </td>
  );
}

export default RatingRow;
